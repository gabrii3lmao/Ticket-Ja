import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { EventModule } from './event/event.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [ConfigModule.forRoot(), UserModule, EventModule, HealthModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
