import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { UserModule } from 'src/user/user.module';

@Module({
  controllers: [OrderController],
  providers: [OrderService],
  imports: [UserModule],
})
export class OrderModule {}
