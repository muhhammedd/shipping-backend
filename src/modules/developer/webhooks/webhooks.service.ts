import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../core/prisma.service';
import { EncryptionService } from '../../../common/services/encryption.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WebhooksService {
    private readonly logger = new Logger(WebhooksService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly encryptionService: EncryptionService,
        @InjectQueue('webhooks') private readonly webhookQueue: Queue,
    ) { }

    async createSubscription(tenantId: string, url: string, events: string[]) {
        const secret = uuidv4();
        const encryptedSecret = this.encryptionService.encrypt(secret);

        return await this.prisma.webhookSubscription.create({
            data: {
                tenantId,
                url,
                events,
                secret: encryptedSecret,
            },
        });
    }

    async listSubscriptions(tenantId: string) {
        const subs = await this.prisma.webhookSubscription.findMany({
            where: { tenantId },
        });

        // Optionally mask or decrypt for display? Usually secrets are only shown once.
        return subs;
    }

    async triggerWebhook(tenantId: string, event: string, payload: any) {
        const subscriptions = await this.prisma.webhookSubscription.findMany({
            where: {
                tenantId,
                isActive: true,
                events: { has: event },
            },
        });

        for (const sub of subscriptions) {
            let decryptedSecret = sub.secret;
            try {
                // Attempt decryption
                decryptedSecret = this.encryptionService.decrypt(sub.secret);
            } catch (e) {
                this.logger.warn(`Failed to decrypt secret for webhook ${sub.id}. Using as-is.`);
            }

            await this.webhookQueue.add(
                'send-webhook',
                {
                    url: sub.url,
                    event,
                    payload,
                    secret: decryptedSecret,
                },
                {
                    attempts: 5,
                    backoff: {
                        type: 'exponential',
                        delay: 1000,
                    },
                    removeOnComplete: true,
                },
            );
        }
    }
}
