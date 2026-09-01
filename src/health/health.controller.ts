import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { Public } from 'src/auth/decorators/public.decorator';
import { PrismaService } from 'src/prisma.service';
import { ApiKeyGuard } from './guards/api-key.guard';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { RedisHealthIndicator } from './indicators/redis-health.indicator';
@ApiTags('health')
@Controller('health')
@UseGuards(ApiKeyGuard)
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaIndicator: PrismaHealthIndicator,
    private prisma: PrismaService,
    private redisIndicator: RedisHealthIndicator,
  ) {}

  @Get()
  @Public()
  @SkipThrottle()
  @HealthCheck()
  @ApiOperation({ summary: 'Check service health' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  check() {
    return this.health.check([
      () => this.prismaIndicator.pingCheck('database', this.prisma),
      () => this.redisIndicator.isHealthy(),
    ]);
  }
}
