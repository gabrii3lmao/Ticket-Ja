import { ArgumentsHost, Catch } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { ExceptionFilter } from '@nestjs/common';
import { Response } from 'express';

@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  catch(exception: ThrottlerException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    response.status(429).json({
      statusCode: 429,
      message: 'Too many requests. Try again in a few seconds.',
    });
  }
}
