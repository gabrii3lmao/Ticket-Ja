import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EventStatus } from 'generated/prisma/client';

export class UpdateEventStatusDto {
  @ApiProperty({ enum: EventStatus, example: 'PUBLISHED' })
  @IsEnum(EventStatus)
  @IsNotEmpty()
  status: EventStatus;
}
