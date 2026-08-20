import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsEnum, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { OrganizerApplicationStatus } from 'generated/prisma/enums';
import { IsCPFOrCNPJ } from 'src/common/validators/document.validator';

export class QueryOrganizerApplication {
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
    description: 'Filter by application status',
    enum: OrganizerApplicationStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(OrganizerApplicationStatus)
  status?: OrganizerApplicationStatus;

  @ApiProperty({ description: 'Filter by legal name', required: false })
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiProperty({ description: 'Filter by trade name', required: false })
  @IsOptional()
  @IsString()
  tradeName?: string;

  @ApiProperty({
    description: 'Filter by CPF or CNPJ',
    required: false,
    example: '12345678000190',
  })
  @IsOptional()
  @IsCPFOrCNPJ()
  document?: string;

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
