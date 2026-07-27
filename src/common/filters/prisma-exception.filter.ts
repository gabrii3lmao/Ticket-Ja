import { ArgumentsHost, Catch, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { Request, Response } from 'express';

const errorMapping: Record<string, HttpStatus> = {
  P2000: HttpStatus.BAD_REQUEST,
  P2002: HttpStatus.CONFLICT,
  P2003: HttpStatus.UNPROCESSABLE_ENTITY,
  P2025: HttpStatus.NOT_FOUND,
};

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter {
  private readonly logger = new Logger(PrismaClientExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = errorMapping[exception.code];

    const message = exception.message.replace(/\n/g, '');

    if (status) {
      this.logger.warn(
        `[${request.method}] ${request.url} - Prisma Error ${exception.code}: ${message}`,
      );
    } else {
      this.logger.error(
        `[${request.method}] ${request.url} - Unhandled Prisma Error ${exception.code}: ${message}`,
      );
    }

    return response.status(status ?? HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: {
        code: exception.code,
        message: message,
        type: exception.name,
      },
    });
  }
}
