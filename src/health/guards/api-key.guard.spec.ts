import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';

function createContext(headers: Record<string, string | undefined>) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as unknown as ExecutionContext;
}

function createConfig(values: Record<string, string | undefined>) {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

describe('ApiKeyGuard', () => {
  it('rejects a missing key in production', () => {
    const guard = new ApiKeyGuard(
      createConfig({ NODE_ENV: 'production', HEALTH_CHECK_SECRET: 'secret' }),
    );

    expect(() => guard.canActivate(createContext({}))).toThrow(
      NotFoundException,
    );
  });

  it('rejects a wrong key in production', () => {
    const guard = new ApiKeyGuard(
      createConfig({ NODE_ENV: 'production', HEALTH_CHECK_SECRET: 'secret' }),
    );

    expect(() =>
      guard.canActivate(createContext({ 'x-api-key': 'wrong' })),
    ).toThrow(NotFoundException);
  });

  it('accepts the configured key in production', () => {
    const guard = new ApiKeyGuard(
      createConfig({ NODE_ENV: 'production', HEALTH_CHECK_SECRET: 'secret' }),
    );

    expect(guard.canActivate(createContext({ 'x-api-key': 'secret' }))).toBe(
      true,
    );
  });

  it('does not require a key outside production', () => {
    const guard = new ApiKeyGuard(createConfig({ NODE_ENV: 'development' }));

    expect(guard.canActivate(createContext({}))).toBe(true);
  });
});
