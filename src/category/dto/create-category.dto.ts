import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Category name', example: 'Pista Premium' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Category description', required: false, example: 'Setor VIP com acesso a camarote' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Ticket price', example: 250.00 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Available quantity', example: 1000 })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  quantity: number;

  @ApiProperty({ description: 'Sales start date', required: false, example: '2026-08-01T00:00:00Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  salesStart?: Date;

  @ApiProperty({ description: 'Sales end date', required: false, example: '2026-08-30T23:59:59Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  salesEnd?: Date;
}
