import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { UserModule } from 'src/user/user.module';
import { PaymentModule } from 'src/payment/payment.module';
import { OrderExpirationService } from './order-expiration/order-expiration.service';

@Module({
  controllers: [OrderController],
  providers: [OrderService, OrderExpirationService],
  imports: [UserModule, PaymentModule],
})
export class OrderModule {}
