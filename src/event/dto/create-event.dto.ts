import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsDate,
  IsOptional,
  IsArray,
  ArrayNotEmpty,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEventDto {
  @ApiProperty({ description: 'Event name', example: 'Rock in Rio' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Event description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Artists or bands',
    example: ['Queen', 'Iron Maiden'],
  })
  @ArrayNotEmpty()
  @IsArray()
  @IsString({ each: true })
  artists: string[];

  @ApiProperty({
    description: 'Event start date',
    example: '2026-09-15T20:00:00.000Z',
  })
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  startDate: Date;

  @ApiProperty({
    description: 'Event end date',
    required: false,
    example: '2026-09-16T04:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiProperty({
    description: 'Event image URL',
    required: false,
    example: 'https://images.com/event.jpg',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({
    description: 'Minimum age required',
    required: false,
    example: 18,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minimumAge?: number;

  @ApiProperty({ description: 'Venue ID', example: 'uuid' })
  @IsNotEmpty()
  @IsString()
  venueId: string;
}
