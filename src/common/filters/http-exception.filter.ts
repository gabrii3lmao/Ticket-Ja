import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus();

    const exceptionResponse = exception.getResponse();

    /**
    Log based on error severity (5xx = Error, 4xx = Warning)
     **/
    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} - Status: ${status} - Error: ${exception.message}`,
        exception.stack, // Log Stack Trace
      );
    } else {
      this.logger.warn(
        `[${request.method}] ${request.url} - Status: ${status} - Details: ${JSON.stringify(exceptionResponse)}`,
      );
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error:
        typeof exceptionResponse === 'string'
          ? { message: exceptionResponse }
          : exceptionResponse, // Send the message to frontend
    });
  }
}
