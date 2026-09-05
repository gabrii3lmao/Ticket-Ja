import { Module } from '@nestjs/common';
import { CouponService } from './coupon.service';
import { CouponController } from './coupon.controller';
import { UserModule } from 'src/user/user.module';

@Module({
  controllers: [CouponController],
  providers: [CouponService],
  imports: [UserModule],
})
export class CouponModule {}
