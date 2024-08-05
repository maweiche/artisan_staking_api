import { BadRequestException, Injectable } from '@nestjs/common';
import { StakeRepository } from './stake.repository';
import { CreateStakeDto } from './dto/create-stake.dto';
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { Metaplex } from '@metaplex-foundation/js';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { fetchAllDigitalAssetByOwner } from '@metaplex-foundation/mpl-token-metadata'
import { RemoveStakeDto } from './dto/remove-stake.dto';
import { UserRepository } from 'src/user/user.repository';
import * as moment from 'moment';
import { ClaimStakeDto } from './dto/claim-stake.dto';
import * as bs58 from 'bs58';
import { confirmTransaction } from 'src/utils/confirmTransaction';
import mintList from '../mintList';

const payout = {
  BLACK: { free: 27, full: 41 },
  RAINBOW: { free: 24, full: 36 },
  GREEN: { free: 21, full: 31 },
  CAMOUFLAGE: { free: 17, full: 26 },
  WHITE: { free: 14, full: 21 },
  BLUE: { free: 10, full: 15 },
  ORANGE: { free: 7, full: 10 },
  ORIGINAL: { free: 3, full: 5 },
};
@Injectable()
export class StakeService {
  constructor(
    private readonly stakeRepository: StakeRepository,
    private readonly userRepository: UserRepository,
  ) {}

  private getDays(date: Date): number {
    return moment(moment()).diff(date, 'days');
  }

  private getPoints = (stake: any): { points: number; nftPayout: number } => {
    const days = this.getDays(stake.stakedAt);

    const payoutType = days >= 30 ? 'full' : 'free';

    const nftPayout = payout[stake.color][payoutType];

    const points = days * nftPayout;

    return { points, nftPayout };
  };

  private getColor = async (url: string) => {
    const req = await fetch(url);

    const json = await req.json();

    return json.attributes[0].value;
  };

  async create(createStakeDto: CreateStakeDto) {
    const { nfts, wallet } = createStakeDto;

    if (!nfts.length) {
      throw new BadRequestException();
    }

    const connection = new Connection(
      'https://fabled-magical-panorama.solana-mainnet.discover.quiknode.pro/2af224eaab7cf91c93d2aa1a62b0d8cea5b3d33e/',
    );

    const userExist = await this.userRepository.get({
      where: {
        wallet,
      },
    });

    if (!userExist) {
      await this.userRepository.create({
        data: {
          wallet,
          balance: 0,
        },
      });
    }

    const metaplex = new Metaplex(connection);
    const umi = createUmi('https://fabled-magical-panorama.solana-mainnet.discover.quiknode.pro/2af224eaab7cf91c93d2aa1a62b0d8cea5b3d33e/')
    ///@ts-ignore - This is a valid base58 encoded string
    const myNfts = await fetchAllDigitalAssetByOwner(umi, wallet);

    const filteredNfts = myNfts.filter((nft: any) => {
      return mintList.includes(nft.mintAddress.toString());
    });

    const promiseColors: Promise<any>[] = [];

    let nftsToStake = filteredNfts
      .filter((nft: any) => nfts.includes(nft.mintAddress.toString()))
      .map((nft: any) => {
        promiseColors.push(this.getColor(nft.uri));
        return nft.mintAddress.toString();
      });

    const colors = await Promise.all(promiseColors);

    const staked = (
      await this.stakeRepository.getAll({
        where: {
          nftAddress: {
            in: nftsToStake,
          },
          owner: wallet,
          isStaked: true,
        },
      })
    ).map((item) => item.nftAddress);

    // nao criar varias vezes o mesmo stake
    nftsToStake = nftsToStake.filter((nft) => {
      return !staked.includes(nft);
    });

    // Verificar se alguma nft ja foi stakada

    await this.stakeRepository.updateMany({
      data: { isStaked: false },
      where: {
        nftAddress: {
          in: nftsToStake,
        },
        owner: {
          ///@ts-ignore - This is a valid base58 encoded string
          notIn: wallet,
        },
        isStaked: true,
      },
    });

    if (nftsToStake.length) {
      await this.stakeRepository.createMany({
        data: nftsToStake.map((nft, index) => ({
          owner: wallet,
          color: colors[index].toUpperCase(),
          nftAddress: nft,
          isStaked: true,
        })),
      });
    }

    return filteredNfts;
  }

  async findAll(wallet: string) {
    // pegar nfts unstaked
    const connection = new Connection(
      'https://fabled-magical-panorama.solana-mainnet.discover.quiknode.pro/2af224eaab7cf91c93d2aa1a62b0d8cea5b3d33e/',
    );

    // pegar nfts da wallet
    const metaplex = new Metaplex(connection);
    const umi = createUmi('https://fabled-magical-panorama.solana-mainnet.discover.quiknode.pro/2af224eaab7cf91c93d2aa1a62b0d8cea5b3d33e/')
    ///@ts-ignore - This is a valid base58 encoded string
    const myNfts = await fetchAllDigitalAssetByOwner(umi, wallet);

    const filteredNfts = myNfts.filter((nft: any) =>
      mintList.includes(nft.mintAddress.toString()),
    );

    const user = await this.userRepository.get({
      where: {
        wallet,
      },
    });

    const stakedNfts = await this.stakeRepository.getAll({
      where: {
        owner: wallet,
        isStaked: true,
      },
    });

    const nftsList = stakedNfts.map((nft) => nft.nftAddress);
    const nftsToStake = filteredNfts.filter(
      (nft: any) => !nftsList.includes(nft.mintAddress.toString()),
    );

    const nftsToUnstake = filteredNfts.filter((nft: any) =>
      nftsList.includes(nft.mintAddress.toString()),
    );

    let balance = 0;
    let dailyReward = 0;

    stakedNfts.map((stake) => {
      const { points, nftPayout } = this.getPoints(stake);
      balance += points;
      dailyReward += nftPayout;
    });

    const totalBalance = balance + user?.balance || 0;

    const teste = nftsToUnstake.map((n: any) => {
      return {
        ...n,
        stakedAt: stakedNfts.find(
          (a) => a.nftAddress === n.mintAddress.toString(),
        ).stakedAt,
      };
    });

    return {
      unstaked: nftsToStake,
      staked: teste,
      points: totalBalance,
      dailyReward,
    };
  }

  async findInfo() {
    const stakedNfts = await this.stakeRepository.getAll({
      where: {
        isStaked: true,
      },
    });

    return {
      totalStaked: stakedNfts.length,
    };
  }

  async remove(removeStakeDto: RemoveStakeDto) {
    const { nfts, wallet } = removeStakeDto;
    const connection = new Connection(
      'https://fabled-magical-panorama.solana-mainnet.discover.quiknode.pro/2af224eaab7cf91c93d2aa1a62b0d8cea5b3d33e/',
    );

    const metaplex = new Metaplex(connection);
    const umi = createUmi('https://fabled-magical-panorama.solana-mainnet.discover.quiknode.pro/2af224eaab7cf91c93d2aa1a62b0d8cea5b3d33e/')
    ///@ts-ignore - This is a valid base58 encoded string
    const myNfts = await fetchAllDigitalAssetByOwner(umi, wallet);

    const filteredNfts = myNfts.filter((nft: any) =>
      mintList.includes(nft.mintAddress.toString()),
    );

    const nftsToUnstake = filteredNfts
      .filter((nft: any) => nfts.includes(nft.mintAddress.toString()))
      .map((nft: any) => nft.mintAddress.toString());

    const existStakedNfts = await this.stakeRepository.getAll({
      where: {
        nftAddress: {
          in: nftsToUnstake,
        },
        owner: wallet,
        isStaked: true,
      },
    });

    let balance = 0;

    existStakedNfts.map((stake) => {
      const { points } = this.getPoints(stake);
      balance += points;
    });

    await this.userRepository.update({
      where: { wallet },
      data: {
        balance: { increment: balance },
      },
    });

    await this.stakeRepository.updateMany({
      data: { isStaked: false },
      where: {
        nftAddress: {
          in: nftsToUnstake,
        },
        owner: wallet,
        isStaked: true,
      },
    });
    return existStakedNfts;
  }

  async claim(claimStakeDto: ClaimStakeDto) {
    const { wallet, signature } = claimStakeDto;

    try {
      const connection = new Connection(
        'https://fabled-magical-panorama.solana-mainnet.discover.quiknode.pro/2af224eaab7cf91c93d2aa1a62b0d8cea5b3d33e/',
        'confirmed',
      );

      const metaplex = new Metaplex(connection);
      const umi = createUmi('https://fabled-magical-panorama.solana-mainnet.discover.quiknode.pro/2af224eaab7cf91c93d2aa1a62b0d8cea5b3d33e/')
      ///@ts-ignore - This is a valid base58 encoded string
      const myNfts = await fetchAllDigitalAssetByOwner(umi, wallet);
      const filteredNfts = myNfts
        .map((nft: any) => nft.mintAddress.toString())
        .filter((address) => mintList.includes(address));

      const stakedNfts = await this.stakeRepository.getAll({
        where: {
          nftAddress: { in: filteredNfts },
          owner: wallet,
          isStaked: true,
        },
      });

      let balance = 0;

      stakedNfts.map((stake) => {
        const { points } = this.getPoints(stake);
        balance += points;
      });

      const user = await this.userRepository.get({
        where: {
          wallet,
        },
      });

      const totalBalance = balance + user?.balance || 0;

      const txbuffer = signature as unknown as Buffer;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      const transaction = Transaction.from(txbuffer.data);

      const keypair = Keypair.fromSecretKey(
        ///@ts-ignore - This is a valid base58 encoded string
        bs58.decode(process.env.PK as string),
      );
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      transaction.partialSign(keypair);

      const rawTransaction = transaction.serialize();

      const txSig = await connection.sendRawTransaction(rawTransaction);
      console.log(txSig);
      const confirmed = await confirmTransaction({
        tx: txSig,
        connection,
      });

      if (!confirmed) {
        throw new BadRequestException('Not validate');
      }

      await this.stakeRepository.updateMany({
        data: {
          stakedAt: new Date(),
        },
        where: {
          nftAddress: {
            in: stakedNfts.map((nft) => nft.nftAddress),
          },
        },
      });

      await this.userRepository.update({
        where: {
          wallet,
        },
        data: {
          balance: 0,
        },
      });

      return totalBalance;
    } catch (error) {
      console.log(error);
    }
  }
}
