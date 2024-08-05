import { IsNotEmpty, IsString, IsArray } from 'class-validator';

export class CreateStakeDto {
  @IsArray()
  @IsNotEmpty()
  nfts: string[];

  @IsString()
  @IsNotEmpty()
  wallet: string;

  @IsNotEmpty()
  signature: any;

  isLedger: boolean;
}
