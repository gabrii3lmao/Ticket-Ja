import { HealthCheckError, HealthIndicatorService } from '@nestjs/terminus';
import Redis from 'ioredis';
import { RedisHealthIndicator } from './redis-health.indicator';

function createIndicator(ping: jest.Mock) {
  const healthIndicatorService = {
    check: jest.fn().mockReturnValue({
      up: jest.fn().mockReturnValue({ redis: { status: 'up' } }),
      down: jest.fn().mockReturnValue({ redis: { status: 'down' } }),
    }),
  } as unknown as HealthIndicatorService;

  return new RedisHealthIndicator(healthIndicatorService, {
    ping,
  } as unknown as Redis);
}

describe('RedisHealthIndicator', () => {
  it('reports up when Redis responds', async () => {
    const ping = jest.fn().mockResolvedValue('PONG');
    const indicator = createIndicator(ping);

    await expect(indicator.isHealthy()).resolves.toEqual({
      redis: { status: 'up' },
    });
    expect(ping).toHaveBeenCalledTimes(1);
  });

  it('reports down when Redis fails', async () => {
    const ping = jest.fn().mockRejectedValue(new Error('connection refused'));
    const indicator = createIndicator(ping);

    await expect(indicator.isHealthy()).rejects.toBeInstanceOf(
      HealthCheckError,
    );
  });
});
