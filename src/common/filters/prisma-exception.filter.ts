import { ArgumentsHost, Catch, HttpStatus, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from 'generated/prisma/client';
import { Request, Response } from 'express';

const errorMapping: Record<string, HttpStatus> = {
  P2000: HttpStatus.BAD_REQUEST,
  P2002: HttpStatus.CONFLICT,
  P2003: HttpStatus.BAD_REQUEST,
  P2025: HttpStatus.NOT_FOUND,
};

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(PrismaClientExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = errorMapping[exception.code];

    if (status) {
      const message = exception.message.replace(/\n/g, '');

      this.logger.warn(
        `[${request.method}] ${request.url} - Prisma Error ${exception.code}: ${message}`,
      );

      return response.status(status).json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        error: {
          code: exception.code,
          message: message,
          type: exception.name,
        },
      });
    }

    super.catch(exception, host);
  }
}
