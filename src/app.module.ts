import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import { AdminModule } from './admin/admin.module';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.registerAsync({
      inject: [ConfigService],
      isGlobal: true,
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');

        return {
          stores: [createKeyv(redisUrl)],
          ttl: 60000,
        };
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          { name: 'short', ttl: 1000, limit: 3 },
          { name: 'medium', ttl: 10000, limit: 20 },
          { name: 'long', ttl: 60000, limit: 100 },
        ],
        storage: new ThrottlerStorageRedisService(
          config.get<string>('REDIS_URL'),
        ),
      }),
    }),
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
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
