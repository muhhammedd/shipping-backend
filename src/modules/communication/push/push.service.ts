import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class PushService {
    private readonly logger = new Logger(PushService.name);

    constructor(@InjectQueue('push') private readonly pushQueue: Queue) { }

    async sendPush(token: string, title: string, body: string, data?: any) {
        try {
            await this.pushQueue.add('send-push', {
                token,
                title,
                body,
                data,
            }, {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
                removeOnComplete: true,
            });
            this.logger.debug(`Queued Push Notification to ${token}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to queue Push to ${token}: ${error.message}`);
            return false;
        }
    }

    async sendMulticast(tokens: string[], title: string, body: string, data?: any) {
        // Simple iteration for now, optimized batching can be done in processor
        for (const token of tokens) {
            await this.sendPush(token, title, body, data);
        }
    }
}
