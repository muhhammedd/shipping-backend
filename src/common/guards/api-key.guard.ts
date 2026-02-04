
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../modules/core/prisma.service';
import { Request } from 'express';
import * as crypto from 'crypto';
import { UserRole } from '@prisma/client';

@Injectable()
export class ApiKeyGuard implements CanActivate {
    constructor(
        private readonly prisma: PrismaService,
        private readonly reflector: Reflector,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const apiKey = request.headers['x-api-key'] as string;

        if (!apiKey) {
            return true; // Use other guards if no API Key provided
            // OR return false if this route MUST be protected by API Key. 
            // For now, consistent with Hybrid auth.
        }

        // Hash the key to compare with stored hash (if we stored hashes)
        // For MVP, we store plain or simple hash. Let's assume plain for now as per schema

        // Check key in DB
        const keyRecord = await this.prisma.apiKey.findUnique({
            where: { key: apiKey },
            include: { tenant: true },
        });

        if (!keyRecord || !keyRecord.isActive) {
            throw new UnauthorizedException('Invalid API Key');
        }

        // Check expiration
        if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
            throw new UnauthorizedException('API Key expired');
        }

        // Update last used (async, don't await to avoid latency)
        this.prisma.apiKey.update({
            where: { id: keyRecord.id },
            data: { lastUsedAt: new Date() },
        }).catch(console.error);

        // Attach minimal user/tenant context (API keys act as merchant-level access)
        request['user'] = {
            sub: 'api-key',
            email: `apikey@${keyRecord.tenant.slug}`,
            role: UserRole.MERCHANT,
            tenantId: keyRecord.tenantId
        };

        return true;
    }
}
