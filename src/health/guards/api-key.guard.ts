import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const apiKey = request.headers['x-api-key'];
    const adminKey = this.configService.get<string>('HEALTH_CHECK_SECRET');
    const env = this.configService.get<string>('NODE_ENV');

    if ((!apiKey || apiKey !== adminKey) && env === 'production') {
      throw new NotFoundException();
    }

    return true;
  }
}
