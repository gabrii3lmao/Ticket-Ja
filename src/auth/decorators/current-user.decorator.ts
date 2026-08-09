import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { Role } from 'generated/prisma/enums';

export interface UserPayload {
  id: string;
  role: Role;
}

export interface AuthRequest extends Request {
  user?: UserPayload;
}

export const CurrentUser = createParamDecorator(
  (
    data: keyof UserPayload | undefined,
    ctx: ExecutionContext,
  ): UserPayload | UserPayload[keyof UserPayload] | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthRequest>();
    const user = request.user;
    if (!user) {
      return undefined;
    }
    return data ? user[data] : user;
  },
);
