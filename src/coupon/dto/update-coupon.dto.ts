import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateCouponDto } from './create-coupon.dto';

export class UpdateCouponDto extends PartialType(CreateCouponDto) {
  @ApiPropertyOptional({
    description: 'Whether the coupon is active (can be redeemed)',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
