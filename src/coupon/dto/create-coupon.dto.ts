import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinDate,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DiscountType } from 'generated/prisma/enums';

export class CreateCouponDto {
  @ApiProperty({
    description: 'Coupon code (case insensitive, stored uppercased)',
    example: 'VIP10',
    maxLength: 50,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({
    description: 'Coupon description',
    example: '10% off for VIP customers',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Discount type',
    enum: DiscountType,
    example: DiscountType.PERCENTAGE,
  })
  @IsEnum(DiscountType)
  @IsNotEmpty()
  discountType: DiscountType;

  @ApiProperty({
    description:
      'Discount value. Percentage (0 < value <= 100) for PERCENTAGE or fixed amount for FIXED',
    example: 10,
  })
  @IsNumber()
  @IsNotEmpty()
  value: number;

  @ApiProperty({
    description: 'Expiration date of the coupon',
    required: false,
    example: '2026-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @MinDate(new Date())
  expiresAt?: Date;

  @ApiProperty({
    description: 'Maximum number of uses',
    required: false,
    example: 100,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;
}
