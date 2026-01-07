import { Injectable, NestMiddleware, TooManyRequestsException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private store: RateLimitStore = {};
  private readonly windowMs = 15 * 60 * 1000; // 15 minutes
  private readonly maxRequests = 100; // 100 requests per window

  use(req: Request, res: Response, next: NextFunction) {
    // Skip rate limiting for health checks
    if (req.path === '/health' || req.path === '/api/docs') {
      return next();
    }

    // Use IP address as the key
    const key = req.ip || 'unknown';
    const now = Date.now();

    // Initialize or reset the counter
    if (!this.store[key] || now > this.store[key].resetTime) {
      this.store[key] = {
        count: 0,
        resetTime: now + this.windowMs,
      };
    }

    // Increment the counter
    this.store[key].count++;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', this.maxRequests);
    res.setHeader(
      'X-RateLimit-Remaining',
      Math.max(0, this.maxRequests - this.store[key].count),
    );
    res.setHeader(
      'X-RateLimit-Reset',
      new Date(this.store[key].resetTime).toISOString(),
    );

    // Check if limit exceeded
    if (this.store[key].count > this.maxRequests) {
      throw new TooManyRequestsException(
        'Too many requests, please try again later.',
      );
    }

    next();
  }
}
