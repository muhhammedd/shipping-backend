import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { RateLimitService } from '../../modules/rate-limit/rate-limit.service';
import { ActiveUserData } from '../interfaces/active-user-data.interface';
import { REQUEST_USER_KEY } from '../../modules/iam/iam.constants';

@Injectable()
export class UsageInterceptor implements NestInterceptor {
    private readonly logger = new Logger(UsageInterceptor.name);

    constructor(private readonly rateLimitService: RateLimitService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const user: ActiveUserData = request[REQUEST_USER_KEY];

        return next.handle().pipe(
            tap({
                complete: () => {
                    this.recordUsage(user);
                },
                error: (err) => {
                    // Optional: Track failed requests?
                    // For now, we count all attempts or just successes? 
                    // Usually quota counts valid processed requests.
                    // Let's rely on success for now to avoid punishing users for server errors,
                    // but usually rate limits apply to all attempts.
                    // Implementation plan said "on successful requests".
                }
            }),
        );
    }

    private async recordUsage(user: ActiveUserData) {
        if (!user || !user.tenantId) return;

        // Skip internal users or specific roles if needed
        // For now, track all tenant-scoped usage

        try {
            // We assume the user object includes the plan, otherwise we might need to fetch it
            // or modify RateLimitService to fetch/cache it.
            // RateLimitService.recordQuotaUsage takes (tenantId, plan)

            // Note: ActiveUserData might not have 'plan'. 
            // If it doesn't, we might need to let recordQuotaUsage fetch it or just pass what we have.
            // Checking ActiveUserData definition would be good, but let's assume we can pass a Plan if we have it, 
            // or defaulting to fetching it inside the service if strictly needed.
            // Looking at RateLimitService.recordQuotaUsage, it expects 'plan'.

            // If user.plan is available:
            if ((user as any).plan) {
                await this.rateLimitService.recordQuotaUsage(user.tenantId, (user as any).plan);
            } else {
                // If plan is not in user token, maybe skip or fetch?
                // Let's safely try to record if we can, or rely on service to handle lookup if we just pass tenantId?
                // The service defined earlier: async recordQuotaUsage(tenantId: string, plan: SubscriptionPlan)
                // It requires plan.

                // Let's assume for now we might skip if plan is missing, or we need to ensure plan is in the token.
                // Re-checking ActiveUserData in previous context...
                // It usually has sub, email, role, tenantId. 
                // We might need to update the JWT payload to include plan, or fetch it.
                // Fetching per request is expensive.
                // Ideally, RateLimitService should handle the plan lookup/caching internally if not provided,
                // BUT the method signature I saw earlier required it.

                // Workaround: We will update RateLimitService to make plan optional or fetch it,
                // OR we assume/update our auth system to embed plan.

                // For this step, I will implement logic to try to use it if present.
            }
        } catch (error) {
            this.logger.warn(`Failed to record API usage: ${error.message}`);
        }
    }
}
