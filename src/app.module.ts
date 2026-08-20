import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { EventModule } from './event/event.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { VenueModule } from './venue/venue.module';
import { PrismaModule } from './prisma.module';
import { CategoryModule } from './category/category.module';
import { OrderModule } from './order/order.module';
import { TicketModule } from './ticket/ticket.module';
import { RolesGuard } from './auth/guards/roles.guard';
import { PaymentModule } from './payment/payment.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    UserModule,
    EventModule,
    HealthModule,
    AuthModule,
    VenueModule,
    CategoryModule,
    OrderModule,
    TicketModule,
    PaymentModule,
    AdminModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
