import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma.service';
import { REQUEST_USER_KEY } from '../../iam.constants';
import { Reflector } from '@nestjs/core';

@Injectable()
export class ApiKeyGuard implements CanActivate {
    constructor(
        private readonly prisma: PrismaService,
        private readonly reflector: Reflector,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const apiKey = request.headers['x-api-key'];

        if (!apiKey) {
            return true; // Pass to next guard (e.g., Bearer auth), or fail if this is the only one?
            // Usually API Key is an alternative.
            // If this guard is globally applied or used with UseGuards, we need to decide strategy.
            // If used explicitly, we expect it.
        }

        const keyRecord = await this.prisma.apiKey.findUnique({
            where: { key: apiKey as string },
            include: { tenant: true },
        });

        if (!keyRecord || !keyRecord.isActive) {
            throw new UnauthorizedException('Invalid or inactive API Key');
        }

        if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
            throw new UnauthorizedException('API Key expired');
        }

        // Update last used
        await this.prisma.apiKey.update({
            where: { id: keyRecord.id },
            data: { lastUsedAt: new Date() },
        });

        // Attach user-like object to request for compatibility
        request[REQUEST_USER_KEY] = {
            sub: 'api-key',
            email: 'api-integration',
            role: 'MERCHANT', // Default role for API keys? Or usually MERCHANT.
            tenantId: keyRecord.tenantId,
            permissions: keyRecord.permissions,
            // Assuming we might attach the plan here if we fetch it from tenant?
            plan: keyRecord.tenant.plan,
        };

        return true;
    }
}
