jest.mock('generated/prisma/enums', () => ({
  Role: {
    BUYER: 'BUYER',
    ORGANIZER: 'ORGANIZER',
    ADMIN: 'ADMIN',
  },
}));

import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEYS } from '../decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const buildContext = (user?: unknown): ExecutionContext =>
    ({
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should allow access when no roles are required', () => {
    const context = buildContext({ id: '1', role: 'BUYER' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when the user has a required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    const context = buildContext({ id: '1', role: 'ADMIN' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access for any of the required roles', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['ORGANIZER', 'ADMIN']);
    const context = buildContext({ id: '1', role: 'ORGANIZER' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException when the user role is not required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    const context = buildContext({ id: '1', role: 'BUYER' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when there is no user', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    const context = buildContext();

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should read the required roles from the route metadata', () => {
    const getAllAndOverride = jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['ADMIN']);
    const context = buildContext({ id: '1', role: 'ADMIN' });

    guard.canActivate(context);

    expect(getAllAndOverride).toHaveBeenCalledWith(ROLES_KEYS, [
      expect.any(Function),
      expect.any(Function),
    ]);
  });
});
