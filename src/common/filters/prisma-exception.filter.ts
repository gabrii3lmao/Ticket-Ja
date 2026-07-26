// src/prisma-client-exception/prisma-client-exception.filter.ts

import { ArgumentsHost, Catch, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from 'generated/prisma/client';
import { Response } from 'express';

// 1. Mapeie apenas os erros que devem retornar algo diferente de 500
const errorMapping: Record<string, HttpStatus> = {
  P2000: HttpStatus.BAD_REQUEST,
  P2002: HttpStatus.CONFLICT,
  P2003: HttpStatus.BAD_REQUEST,
  P2025: HttpStatus.NOT_FOUND,
};

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    
    const status = errorMapping[exception.code];

    if (status) {
      const message = exception.message.replace(/\n/g, '');

      return response.status(status).json({
        statusCode: status,
        message: message,
        error: exception.name,
      });
    }

    // Se o erro não estiver no mapeamento, o NestJS trata como 500 por padrão
    super.catch(exception, host);
  }
}
