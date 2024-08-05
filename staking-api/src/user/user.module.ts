import { Module } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { PrismaService } from 'src/common/prisma.service';

@Module({
  controllers: [],
  providers: [UserRepository, PrismaService],
  exports: [UserRepository],
})
export class UserModule {}
