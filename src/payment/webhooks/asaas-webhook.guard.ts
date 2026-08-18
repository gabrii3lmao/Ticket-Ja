import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class AsaasWebhookGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<Request>();

    const token = req.headers['access_token'];
    if (!token || token !== this.config.get('ASAAS_WEBHOOK_TOKEN')) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
