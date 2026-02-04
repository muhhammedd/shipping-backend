import { SetMetadata } from '@nestjs/common';

export interface RateLimitOptions {
    ttl?: number;
    limit?: number;
}

export const RATE_LIMIT_METADATA_KEY = 'rateLimitSettings';

export const RateLimit = (options: RateLimitOptions) =>
    SetMetadata(RATE_LIMIT_METADATA_KEY, options);
