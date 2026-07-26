import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsDate, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEventDto {
  @ApiProperty({ description: 'Event name', example: 'Rock in Rio' })
  @IsNotEmpty()
  @IsString()
  @Length(3, 256)
  name: string;

  @ApiProperty({ description: 'Artist or band name', example: 'Queen' })
  @IsNotEmpty()
  @IsString()
  @Length(2, 256)
  artist: string;

  @ApiProperty({
    description: 'Event date',
    example: '2026-09-15T00:00:00.000Z',
  })
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  date: Date;

  @ApiProperty({ description: 'Event organizer', example: 'Rock World' })
  @IsNotEmpty()
  @IsString()
  @Length(2, 256)
  organizer: string;
}
