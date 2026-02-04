import {
    Injectable,
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitService } from './rate-limit.service';

import { RATE_LIMIT_METADATA_KEY, RateLimitOptions } from '../../common/decorators/rate-limit.decorator';

export const SKIP_RATE_LIMIT_KEY = 'skipRateLimit';

@Injectable()
export class RateLimitGuard implements CanActivate {
    private readonly logger = new Logger(RateLimitGuard.name);

    constructor(
        private readonly rateLimitService: RateLimitService,
        private readonly reflector: Reflector,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Check if route should skip rate limiting
        const skipRateLimit = this.reflector.getAllAndOverride<boolean>(
            SKIP_RATE_LIMIT_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (skipRateLimit) {
            return true;
        }

        const customOptions = this.reflector.getAllAndOverride<RateLimitOptions>(
            RATE_LIMIT_METADATA_KEY,
            [context.getHandler(), context.getClass()],
        );

        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();

        // Get tenant from request
        const tenant = request.tenant;
        const ip = request.ip || request.connection.remoteAddress;

        const limitId = tenant ? tenant.id : `ip:${ip}`;
        const plan = tenant ? tenant.plan : 'FREE'; // Default to FREE plan limits for IPs

        // Check rate limit
        const result = await this.rateLimitService.checkRateLimit(
            limitId,
            plan as any,
            customOptions?.limit,
            customOptions?.ttl,
        );

        // Set rate limit headers
        response.setHeader('X-RateLimit-Limit', result.limit.toString());
        response.setHeader('X-RateLimit-Remaining', result.remaining.toString());
        response.setHeader('X-RateLimit-Reset', result.reset.toString());

        if (!result.allowed) {
            this.logger.warn(
                `Rate limit exceeded for tenant ${tenant.id} (${tenant.plan})`,
            );

            throw new HttpException(
                {
                    statusCode: HttpStatus.TOO_MANY_REQUESTS,
                    message: 'Rate limit exceeded',
                    error: 'Too Many Requests',
                    retryAfter: result.reset,
                },
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        // Record usage asynchronously (don't wait)
        this.rateLimitService
            .recordQuotaUsage(tenant.id, tenant.plan)
            .catch((err) => {
                this.logger.error(`Failed to record quota usage: ${err.message}`);
            });

        return true;
    }
}
