import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../core/prisma.service';
import { SubscriptionPlan } from '@prisma/client';
import { RATE_LIMITS } from './rate-limit.config';

@Injectable()
export class RateLimitService {
    private readonly logger = new Logger(RateLimitService.name);

    constructor(
        private readonly prisma: PrismaService,
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    ) { }

    /**
     * Check if request is within rate limit
     */
    async checkRateLimit(
        tenantId: string,
        plan: SubscriptionPlan,
        customRequests?: number,
        customPeriod?: number,
    ): Promise<{
        allowed: boolean;
        limit: number;
        remaining: number;
        reset: number;
    }> {
        const config = RATE_LIMITS[plan];
        const requests = customRequests ?? config.requests;
        const period = customPeriod ?? config.period;

        // Unlimited for enterprise (if not overridden)
        if (requests === -1) {
            return {
                allowed: true,
                limit: -1,
                remaining: -1,
                reset: 0,
            };
        }

        const now = Date.now();
        const windowStart = Math.floor(now / (period * 1000)) * period;
        const windowEnd = windowStart + period;
        const key = `rate-limit:${tenantId}:${windowStart}:${period}`;

        try {
            // Increment counter in cache
            const current = await this.cacheManager.get<number>(key);
            const count = current ? current + 1 : 1;

            if (count > requests) {
                return {
                    allowed: false,
                    limit: requests,
                    remaining: 0,
                    reset: windowEnd,
                };
            }

            // Set/update counter with expiry (in milliseconds)
            await this.cacheManager.set(key, count, period * 1000);

            return {
                allowed: true,
                limit: requests,
                remaining: Math.max(0, requests - count),
                reset: windowEnd,
            };
        } catch (error) {
            this.logger.error(`Rate limit check failed: ${error.message}`);
            // Fail open - allow request if cache is down
            return {
                allowed: true,
                limit: requests,
                remaining: requests,
                reset: windowEnd,
            };
        }
    }

    /**
     * Get current quota usage for a tenant
     */
    async getQuotaUsage(tenantId: string): Promise<{
        plan: SubscriptionPlan;
        limit: number;
        used: number;
        remaining: number;
        resetAt: Date;
    }> {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { plan: true },
        });

        if (!tenant) {
            throw new Error('Tenant not found');
        }

        const config = RATE_LIMITS[tenant.plan];
        const now = Date.now();
        const windowStart = Math.floor(now / (config.period * 1000)) * config.period;
        const windowEnd = windowStart + config.period;
        const key = `rate-limit:${tenantId}:${windowStart}`;

        const current = await this.cacheManager.get<number>(key);
        const used = current || 0;

        return {
            plan: tenant.plan,
            limit: config.requests,
            used,
            remaining: config.requests === -1 ? -1 : Math.max(0, config.requests - used),
            resetAt: new Date(windowEnd * 1000),
        };
    }

    /**
     * Record quota usage in database for analytics
     */
    async recordQuotaUsage(tenantId: string, plan: SubscriptionPlan): Promise<void> {
        const now = new Date();
        const periodStart = new Date(Math.floor(now.getTime() / 3600000) * 3600000);
        const periodEnd = new Date(periodStart.getTime() + 3600000);

        try {
            await this.prisma.apiQuota.upsert({
                where: {
                    tenantId_periodStart: {
                        tenantId,
                        periodStart,
                    },
                },
                create: {
                    tenantId,
                    plan,
                    requestCount: 1,
                    periodStart,
                    periodEnd,
                },
                update: {
                    requestCount: {
                        increment: 1,
                    },
                },
            });
        } catch (error) {
            // Don't fail request if quota recording fails
            this.logger.error(`Failed to record quota: ${error.message}`);
        }
    }

    /**
     * Get quota statistics for admin dashboard
     */
    async getQuotaStats(tenantId: string, days: number = 7) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const quotas = await this.prisma.apiQuota.findMany({
            where: {
                tenantId,
                periodStart: {
                    gte: startDate,
                },
            },
            orderBy: {
                periodStart: 'asc',
            },
        });

        return quotas.map((q) => ({
            period: q.periodStart,
            requests: q.requestCount,
            plan: q.plan,
        }));
    }
}
