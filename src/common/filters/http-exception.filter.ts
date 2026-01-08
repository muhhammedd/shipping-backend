import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
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
  details?: unknown;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as Record<
      string,
      unknown
    >;

    let message = exception.message;
    let error = 'Internal Server Error';
    let details: unknown = undefined;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      message = (exceptionResponse.message as string) || message;
      error = (exceptionResponse.error as string) || error;

      if (
        exceptionResponse.message &&
        Array.isArray(exceptionResponse.message)
      ) {
        details = exceptionResponse.message;
        message = (exceptionResponse.error as string) || 'Validation failed';
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
      this.logger.error(`[${request.method}] ${request.url}`, exception.stack);
    } else if (status >= 400) {
      this.logger.warn(
        `[${request.method}] ${request.url} - ${status} ${message}`,
      );
    }

    response.status(status).json(errorResponse);
  }
}
