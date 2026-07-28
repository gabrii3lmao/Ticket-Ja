import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, Max, IsString, IsDate } from 'class-validator';
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

}
