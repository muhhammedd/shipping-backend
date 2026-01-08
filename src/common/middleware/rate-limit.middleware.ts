import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private store = new Map<string, RateLimitInfo>();
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

    let record = this.store.get(key);

    // Initialize or reset the counter
    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + this.windowMs,
      };
      this.store.set(key, record);
    }

    // Increment the counter
    record.count++;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', this.maxRequests.toString());
    res.setHeader(
      'X-RateLimit-Remaining',
      Math.max(0, this.maxRequests - record.count).toString(),
    );
    res.setHeader(
      'X-RateLimit-Reset',
      new Date(record.resetTime).toISOString(),
    );

    // Check if limit exceeded
    if (record.count > this.maxRequests) {
      throw new HttpException(
        'Too many requests, please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    next();
  }
}
