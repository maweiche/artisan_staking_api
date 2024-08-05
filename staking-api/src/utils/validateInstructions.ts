import {
  PublicKey,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  SystemProgram,
} from '@solana/web3.js';
import { isEqual } from 'lodash';

export async function isInstructionsValid(
  instructions: TransactionInstruction[],
  userKey: any,
) {
  const fromPubkey = new PublicKey(userKey);

  const realInstructions = [];

  const toPubKey = new PublicKey(userKey);

  realInstructions.push(
    SystemProgram.transfer({
      fromPubkey: fromPubkey,
      toPubkey: toPubKey,
      lamports: 0.00001 * LAMPORTS_PER_SOL,
    }),
  );

  if (instructions.length != realInstructions.length) {
    console.log("size doesn't match");
    return false;
  }

  for (const idx in instructions) {
    if (!isEqual(instructions[idx].data, realInstructions[idx].data)) {
      console.log('isnt equal data', idx);
      return false;
    }
    if (
      !isEqual(
        instructions[idx].programId.toString(),
        realInstructions[idx].programId.toString(),
      )
    ) {
      console.log('isnt equal programId', idx);
      return false;
    }
    if (instructions[idx].keys.length != realInstructions[idx].keys.length) {
      console.log("keys size doesn't match", idx);
      return false;
    }
  }

  return true;
}
