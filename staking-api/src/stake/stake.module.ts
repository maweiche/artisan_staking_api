import { Module } from '@nestjs/common';
import { StakeService } from './stake.service';
import { StakeController } from './stake.controller';
import { StakeRepository } from './stake.repository';
import { PrismaService } from 'src/common/prisma.service';
import { UserRepository } from 'src/user/user.repository';

@Module({
  controllers: [StakeController],
  providers: [StakeService, StakeRepository, PrismaService, UserRepository],
  exports: [StakeRepository],
})
export class StakeModule {}
