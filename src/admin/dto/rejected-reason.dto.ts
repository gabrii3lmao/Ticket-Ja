import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectReasonDto {
  @ApiProperty({
    description: 'Reason for rejecting the application',
    required: false,
    example: 'Invalid legal document',
  })
  @IsOptional()
  @MaxLength(500)
  @IsString()
  rejectReason?: string;
}
