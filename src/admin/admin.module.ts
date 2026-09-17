import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PaymentModule } from 'src/payment/payment.module';
import { EventModule } from 'src/event/event.module';
import { VenueModule } from 'src/venue/venue.module';
import { UserModule } from 'src/user/user.module';

@Module({
  controllers: [AdminController],
  providers: [AdminService],
  imports: [PaymentModule, EventModule, VenueModule, UserModule],
})
export class AdminModule {}
