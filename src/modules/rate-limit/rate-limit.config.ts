export const RATE_LIMITS = {
    FREE: {
        requests: 100,
        period: 3600, // 1 hour in seconds
        burst: 10,
    },
    BASIC: {
        requests: 1000,
        period: 3600,
        burst: 50,
    },
    PREMIUM: {
        requests: 10000,
        period: 3600,
        burst: 200,
    },
    ENTERPRISE: {
        requests: -1, // Unlimited
        period: 3600,
        burst: 500,
    },
} as const;

export type RateLimitConfig = {
    requests: number;
    period: number;
    burst: number;
};
