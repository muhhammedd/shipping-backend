import { Injectable, LoggerService as NestLoggerService, Scope, Optional, Inject } from '@nestjs/common';
import * as winston from 'winston';
import { ClsService } from 'nestjs-cls';
const DailyRotateFile = require('winston-daily-rotate-file');

/**
 * Custom Logger Service using Winston
 * Provides structured logging with multiple transports and log rotation
 */
@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService implements NestLoggerService {
    private logger: winston.Logger;
    private context?: string;

    constructor(
        @Optional() context?: string,
        // @Inject(ClsService) private readonly cls?: ClsService, // Optional injection to avoid circular deps if any
    ) {
        this.context = context;
        this.logger = this.createLogger();
    }

    /**
     * Set context for logger instance
     */
    setContext(context: string) {
        this.context = context;
    }

    /**
     * Create Winston logger with multiple transports
     */
    private createLogger(): winston.Logger {
        const logFormat = winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            winston.format.splat(),
            winston.format.json(),
        );

        const consoleFormat = winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
                const ctx = context || this.context || 'Application';
                // Attempt to get traceId from CLS manually or via winston-cls-format if integrated
                // For now, we'll rely on it being passed in meta or managed by middleware

                const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
                return `${timestamp} [${ctx}] ${level}: ${message} ${metaStr}`;
            }),
        );

        // Daily rotate file transport for all logs
        const allLogsTransport = new DailyRotateFile({
            filename: 'logs/application-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            format: logFormat,
        });

        // Daily rotate file transport for error logs
        const errorLogsTransport = new DailyRotateFile({
            filename: 'logs/error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '30d',
            level: 'error',
            format: logFormat,
        });

        // Console transport
        const consoleTransport = new winston.transports.Console({
            format: consoleFormat,
        });

        return winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: logFormat,
            transports: [allLogsTransport, errorLogsTransport, consoleTransport],
            exceptionHandlers: [
                new DailyRotateFile({
                    filename: 'logs/exceptions-%DATE%.log',
                    datePattern: 'YYYY-MM-DD',
                    zippedArchive: true,
                    maxSize: '20m',
                    maxFiles: '30d',
                }),
            ],
            rejectionHandlers: [
                new DailyRotateFile({
                    filename: 'logs/rejections-%DATE%.log',
                    datePattern: 'YYYY-MM-DD',
                    zippedArchive: true,
                    maxSize: '20m',
                    maxFiles: '30d',
                }),
            ],
        });
    }

    /**
     * Log a message at the 'log' level
     */
    log(message: string, context?: string) {
        this.logger.info(message, { context: context || this.context });
    }

    /**
     * Log a message at the 'error' level
     */
    error(message: string, trace?: string, context?: string) {
        this.logger.error(message, {
            context: context || this.context,
            trace,
        });
    }

    /**
     * Log a message at the 'warn' level
     */
    warn(message: string, context?: string) {
        this.logger.warn(message, { context: context || this.context });
    }

    /**
     * Log a message at the 'debug' level
     */
    debug(message: string, context?: string) {
        this.logger.debug(message, { context: context || this.context });
    }

    /**
     * Log a message at the 'verbose' level
     */
    verbose(message: string, context?: string) {
        this.logger.verbose(message, { context: context || this.context });
    }

    /**
     * Log HTTP request
     */
    logRequest(method: string, url: string, statusCode: number, responseTime: number, userId?: string) {
        this.logger.info('HTTP Request', {
            context: 'HTTP',
            method,
            url,
            statusCode,
            responseTime: `${responseTime}ms`,
            userId,
        });
    }

    /**
     * Log database query
     */
    logQuery(query: string, duration: number, params?: any) {
        this.logger.debug('Database Query', {
            context: 'Database',
            query,
            duration: `${duration}ms`,
            params,
        });
    }

    /**
     * Log business event
     */
    logEvent(event: string, data: any) {
        this.logger.info('Business Event', {
            context: 'Event',
            event,
            data,
        });
    }

    /**
     * Log security event
     */
    logSecurity(event: string, severity: 'low' | 'medium' | 'high' | 'critical', data: any) {
        this.logger.warn('Security Event', {
            context: 'Security',
            event,
            severity,
            data,
        });
    }

    /**
     * Log performance metric
     */
    logPerformance(operation: string, duration: number, metadata?: any) {
        this.logger.info('Performance Metric', {
            context: 'Performance',
            operation,
            duration: `${duration}ms`,
            ...metadata,
        });
    }
}
