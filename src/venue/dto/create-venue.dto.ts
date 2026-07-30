import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Length,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVenueDto {
  @ApiProperty({ description: 'Venue name', example: 'Estádio do Maracanã' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Street name',
    required: false,
    example: 'Rua Professor Eurico Rabelo',
  })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiProperty({
    description: 'Street number',
    required: false,
    example: '198',
  })
  @IsOptional()
  @IsString()
  number?: string;

  @ApiProperty({
    description: 'District',
    required: false,
    example: 'Maracanã',
  })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiProperty({
    description: 'City',
    required: false,
    example: 'Rio de Janeiro',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({
    description: 'State (UF)',
    required: false,
    example: 'RJ',
    minLength: 2,
    maxLength: 2,
  })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  state?: string;

  @ApiProperty({
    description: 'ZIP code',
    required: false,
    example: '20271-150',
  })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiProperty({ description: 'Venue capacity', example: 50000 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  capacity: number;
}
