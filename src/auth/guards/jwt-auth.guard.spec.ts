import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

function createContext() {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;
}

function createReflector(isPublic: boolean) {
  return {
    getAllAndOverride: jest.fn().mockReturnValue(isPublic),
  } as unknown as Reflector;
}

describe('JwtAuthGuard', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows public routes without delegating to Passport', () => {
    const parent = Object.getPrototypeOf(JwtAuthGuard.prototype) as {
      canActivate: (context: ExecutionContext) => unknown;
    };
    const parentSpy = jest.spyOn(parent, 'canActivate').mockReturnValue(true);
    const guard = new JwtAuthGuard(createReflector(true));

    expect(guard.canActivate(createContext())).toBe(true);
    expect(parentSpy).not.toHaveBeenCalled();
  });

  it('delegates protected routes to Passport', async () => {
    const parent = Object.getPrototypeOf(JwtAuthGuard.prototype) as {
      canActivate: (context: ExecutionContext) => unknown;
    };
    const parentSpy = jest.spyOn(parent, 'canActivate').mockResolvedValue(true);
    const guard = new JwtAuthGuard(createReflector(false));

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
    expect(parentSpy).toHaveBeenCalledTimes(1);
  });

  it('propagates Passport authentication errors', async () => {
    const parent = Object.getPrototypeOf(JwtAuthGuard.prototype) as {
      canActivate: (context: ExecutionContext) => unknown;
    };
    jest
      .spyOn(parent, 'canActivate')
      .mockRejectedValue(new UnauthorizedException());
    const guard = new JwtAuthGuard(createReflector(false));

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
