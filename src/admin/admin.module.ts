import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PaymentModule } from 'src/payment/payment.module';

@Module({
  controllers: [AdminController],
  providers: [AdminService],
  imports: [PaymentModule],
})
export class AdminModule {}
