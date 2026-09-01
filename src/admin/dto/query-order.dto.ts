import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsEnum, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from 'generated/prisma/enums';

export class QueryOrderDto {
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
    description: 'Filter by order status',
    enum: OrderStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus = 'PENDING';

  @ApiProperty({
    description: 'Field to sort by',
    required: false,
    example: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({
    description: 'Sort order',
    required: false,
    example: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
