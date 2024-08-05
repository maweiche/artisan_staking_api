import {
  BadRequestException,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as bs58 from 'bs58';
import { sign } from 'tweetnacl';
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';

@Injectable()
export class StakeMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const { signature, wallet, isLedger } = req.body;

    const publicKey = new PublicKey(wallet);

    if (!isLedger) {
      ///@ts-ignore - This is a valid base58 encoded string
      const signMessageArray = new Uint8Array(bs58.decode(signature));
      if (
        !sign.detached.verify(
          new TextEncoder().encode('THEARTISANSTAKING'),
          signMessageArray,
          publicKey.toBytes(),
        )
      ) {
        throw new BadRequestException('Invalid Signature');
      }
    } else {
      const transaction = Transaction.from(signature.data);
      const validTransaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey,
          lamports: 0.00001 * LAMPORTS_PER_SOL,
        }),
      );

      if (transaction.feePayer.toBase58() !== wallet) {
        throw new BadRequestException('Invalid Signature');
      }

      if (
        transaction.instructions[0].keys.length !==
        validTransaction.instructions[0].keys.length
      ) {
        throw new BadRequestException('Invalid Signature');
      }

      if (!transaction.verifySignatures(true)) {
        throw new BadRequestException('Invalid Signature');
      }
    }

    next();
  }
}
