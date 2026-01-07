import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const errorMessage =
      typeof message === 'string'
        ? message
        : // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          (message as any).message || 'Error';

    response.status(status).json({
      success: false,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      message: errorMessage,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
