import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthController } from './health.controller';
import { TerminusModule } from '@nestjs/terminus';
import { RedisHealthIndicator } from './indicators/redis-health.indicator';
import Redis from 'ioredis';

@Module({
  controllers: [HealthController],
  imports: [TerminusModule],
  providers: [
    {
      provide: Redis,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (!redisUrl) {
          throw new Error('REDIS_URL is not defined');
        }
        return new Redis(redisUrl);
      },
    },
    RedisHealthIndicator,
  ],
})
export class HealthModule {}
