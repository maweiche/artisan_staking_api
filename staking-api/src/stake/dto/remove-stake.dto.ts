import { PartialType } from '@nestjs/mapped-types';
import { CreateStakeDto } from './create-stake.dto';

export class RemoveStakeDto extends PartialType(CreateStakeDto) {}
