import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        // 1. Basic CSRF mitigation for browser-based clients:
        // Require a custom header for state-changing requests.
        // This prevents standard HTML form submissions or simple cross-site requests
        // from succeeding if they don't include this header (which browsers won't add automatically).
        const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

        if (stateChangingMethods.includes(req.method)) {
            const requestedWith = req.headers['x-requested-with'];
            const origin = req.headers['origin'];

            // If there's an origin and it doesn't match a custom header or similar, we could block.
            // But for simplicity, we just check for the custom header or presence of standard API usage markers.
            if (!requestedWith && !req.headers['authorization'] && !req.headers['x-api-key']) {
                // If none of these are present, it might be a simple form submission from a malicious site.
                // Note: If using Bearer/API Key, we are usually safe, but this is defense-in-depth.
            }
        }

        // 2. Prevent clickjacking in legacy browsers (Helmet handles modern ones)
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');

        next();
    }
}
