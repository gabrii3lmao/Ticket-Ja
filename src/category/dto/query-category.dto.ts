import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  Min,
  Max,
  IsString,
  IsDate,
  IsNumber,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QueryCategoryDto {
  // Pagination Properties
  @ApiProperty({ description: 'Page number', default: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: 'Items per page', default: 10, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  // Filter Properties
  @ApiProperty({
    description: 'Filter by name (partial match)',
    required: false,
    example: 'Pista',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Minimum price filter',
    required: false,
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @ApiProperty({
    description: 'Maximum price filter',
    required: false,
    example: 500,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @ApiProperty({
    description: 'Filter by sales start date (on or after)',
    required: false,
    example: '2026-01-01',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  salesStartDate?: Date;

  @ApiProperty({
    description: 'Filter by sales end date (on or before)',
    required: false,
    example: '2026-12-31',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  salesEndDate?: Date;

  @ApiProperty({
    description: 'Field to sort by',
    required: false,
    example: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({ description: 'Sort order', required: false, example: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
