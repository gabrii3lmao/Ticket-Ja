import { Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicatorService } from '@nestjs/terminus';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly redis: Redis,
  ) {}

  async isHealthy() {
    const indicator = this.healthIndicatorService.check('redis');

    try {
      await this.redis.ping();

      return indicator.up();
    } catch {
      throw new HealthCheckError('Redis health check failed', indicator.down());
    }
  }
}
