import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '../logger/logger.service';

/**
 * Logging Interceptor
 * Logs all HTTP requests and responses with timing
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    constructor(private readonly logger: LoggerService) {
        this.logger.setContext('HTTP');
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const { method, url, body, query, params, ip, headers } = request;
        const userAgent = headers['user-agent'] || '';
        const userId = request.user?.sub || 'anonymous';
        const tenantId = request.user?.tenantId || 'none';

        const startTime = Date.now();

        // Log incoming request
        this.logger.log(
            `Incoming Request: ${method} ${url}`,
            'HTTP',
        );

        // Log request details at debug level
        this.logger.debug('Request Details', 'HTTP');
        this.logger.debug(JSON.stringify({
            method,
            url,
            query,
            params,
            body: this.sanitizeBody(body),
            userId,
            tenantId,
            ip,
            userAgent,
        }), 'HTTP');

        return next.handle().pipe(
            tap({
                next: (data) => {
                    const responseTime = Date.now() - startTime;
                    const statusCode = response.statusCode;

                    // Log successful response
                    this.logger.logRequest(method, url, statusCode, responseTime, userId);

                    // Log response data at debug level
                    if (process.env.LOG_RESPONSE_DATA === 'true') {
                        this.logger.debug('Response Data', 'HTTP');
                        this.logger.debug(JSON.stringify(this.sanitizeResponse(data)), 'HTTP');
                    }
                },
                error: (error) => {
                    const responseTime = Date.now() - startTime;
                    const statusCode = error.status || 500;

                    // Log error response
                    this.logger.error(
                        `Request Failed: ${method} ${url} - ${statusCode} - ${responseTime}ms`,
                        error.stack,
                        'HTTP',
                    );

                    // Log error details
                    this.logger.error(JSON.stringify({
                        method,
                        url,
                        statusCode,
                        responseTime: `${responseTime}ms`,
                        userId,
                        tenantId,
                        error: error.message,
                        stack: error.stack,
                    }), undefined, 'HTTP');
                },
            }),
        );
    }

    /**
     * Sanitize request body to remove sensitive data
     */
    private sanitizeBody(body: any): any {
        if (!body) return body;

        const sanitized = { ...body };
        const sensitiveFields = ['password', 'passwordHash', 'token', 'apiKey', 'secret'];

        sensitiveFields.forEach((field) => {
            if (sanitized[field]) {
                sanitized[field] = '***REDACTED***';
            }
        });

        return sanitized;
    }

    /**
     * Sanitize response to remove sensitive data
     */
    private sanitizeResponse(data: any): any {
        if (!data) return data;

        const sanitized = { ...data };
        const sensitiveFields = ['passwordHash', 'token', 'apiKey', 'secret'];

        sensitiveFields.forEach((field) => {
            if (sanitized[field]) {
                sanitized[field] = '***REDACTED***';
            }
        });

        return sanitized;
    }
}
