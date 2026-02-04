import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { PrismaService } from '../../../modules/core/prisma.service';

@Injectable()
export class KeyRotationService {
    constructor(
        private readonly apiKeysService: ApiKeysService,
        private readonly prisma: PrismaService,
    ) { }

    /**
     * Rotate an API key: Create a new one and mark the old one for expiration
     * @param id The current API key ID
     * @param tenantId The tenant ID
     * @param gracePeriodMinutes Minutes before the old key actually becomes inactive
     */
    async rotateKey(id: string, tenantId: string, gracePeriodMinutes: number = 60) {
        // 1. Find the old key
        const oldKey = await this.prisma.apiKey.findUnique({
            where: { id, tenantId },
        });

        if (!oldKey) {
            throw new NotFoundException('API Key not found');
        }

        if (!oldKey.isActive) {
            throw new ForbiddenException('Cannot rotate an inactive key');
        }

        // 2. Create the new key with same permissions and a matching name
        const newKey = await this.apiKeysService.createKey(
            tenantId,
            `${oldKey.name} (Rotated)`,
            oldKey.permissions as string[],
        );

        // 3. Set expiration for the old key
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + gracePeriodMinutes);

        await this.prisma.apiKey.update({
            where: { id },
            data: {
                expiresAt,
                // We keep it active for the grace period, but the guard will check expiresAt
            },
        });

        return {
            newKey,
            oldKeyExpiresAt: expiresAt,
        };
    }
}
