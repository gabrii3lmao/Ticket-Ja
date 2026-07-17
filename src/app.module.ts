import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { EventModule } from './event/event.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    UserModule,
    EventModule,
    HealthModule,
    AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
