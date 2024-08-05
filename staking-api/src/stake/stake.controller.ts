import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { StakeService } from './stake.service';
import { CreateStakeDto } from './dto/create-stake.dto';
import { RemoveStakeDto } from './dto/remove-stake.dto';
import { ClaimStakeDto } from './dto/claim-stake.dto';

@Controller('stake')
export class StakeController {
  constructor(private readonly stakeService: StakeService) {}

  @Post()
  create(@Body() createCheckDto: CreateStakeDto) {
    return this.stakeService.create(createCheckDto);
  }

  @Get(':wallet')
  findAll(@Param('wallet') wallet: string) {
    return this.stakeService.findAll(wallet);
  }

  @Get('')
  findInfo() {
    return this.stakeService.findInfo();
  }

  @Post('unstake')
  remove(@Body() removeStakeDto: RemoveStakeDto) {
    return this.stakeService.remove(removeStakeDto);
  }

  @Post('claim')
  claim(@Body() claimStakeDto: ClaimStakeDto) {
    return this.stakeService.claim(claimStakeDto);
  }
}
