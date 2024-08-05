import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class StakeRepository {
  constructor(private readonly prisma: PrismaService) {}

  create = this.prisma.stake.create;

  createMany = this.prisma.stake.createMany;

  getAll = this.prisma.stake.findMany;

  get = this.prisma.stake.findUnique;

  update = this.prisma.stake.update;

  updateMany = this.prisma.stake.updateMany;

  delete = this.prisma.stake.delete;

  upsert = this.prisma.stake.upsert;
}
