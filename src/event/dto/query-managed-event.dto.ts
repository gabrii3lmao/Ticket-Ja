import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { EventStatus } from 'generated/prisma/enums';
import { QueryEventDto } from './query-event.dto';

export class QueryManagedEventDto extends PartialType(QueryEventDto) {
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;
}
