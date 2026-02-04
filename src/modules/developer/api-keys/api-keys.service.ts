
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeysService {
    constructor(private readonly prisma: PrismaService) { }

    async createKey(tenantId: string, name: string, permissions: string[] = []) {
        // Generate a secure random key
        const prefix = 'shipex_live_';
        const randomBytes = crypto.randomBytes(24).toString('hex');
        const key = `${prefix}${randomBytes}`;

        return await this.prisma.apiKey.create({
            data: {
                tenantId,
                key,
                name,
                permissions,
            },
        });
    }

    async listKeys(tenantId: string) {
        return await this.prisma.apiKey.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async revokeKey(id: string, tenantId: string) {
        // Ensure ownership
        return await this.prisma.apiKey.updateMany({
            where: { id, tenantId },
            data: { isActive: false },
        });
    }
}
