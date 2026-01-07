import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  success: boolean;
  message: string;
  error: string;
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  details?: any;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message = exception.message;
    let error = 'Internal Server Error';
    let details: any = undefined;

    if (typeof exceptionResponse === 'object') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      message = exceptionResponse.message || message;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      error = exceptionResponse.error || error;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (exceptionResponse.message && Array.isArray(exceptionResponse.message)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        details = exceptionResponse.message;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        message = exceptionResponse.error || 'Validation failed';
      }
    }

    const errorResponse: ErrorResponse = {
      success: false,
      message,
      error,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ...(details && { details }),
    };

    // Log errors
    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url}`,
        exception.stack,
      );
    } else if (status >= 400) {
      this.logger.warn(
        `[${request.method}] ${request.url} - ${status} ${message}`,
      );
    }

    response.status(status).json(errorResponse);
  }
}
