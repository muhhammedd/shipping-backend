import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';

@Processor('webhooks', { concurrency: parseInt(process.env.BULL_WEBHOOK_CONCURRENCY || '10') })
export class WebhookProcessor extends WorkerHost {
    private readonly logger = new Logger(WebhookProcessor.name);

    async process(job: Job<any, any, string>): Promise<any> {
        const { url, event, payload, secret } = job.data;
        this.logger.debug(`Processing webhook ${job.id} for event ${event} to ${url}`);

        const signature = crypto
            .createHmac('sha256', secret)
            .update(JSON.stringify(payload))
            .digest('hex');

        try {
            const response = await axios.post(
                url,
                { event, payload },
                {
                    headers: {
                        'X-Shipex-Signature': signature,
                        'X-Shipex-Event': event,
                        'Content-Type': 'application/json',
                    },
                    timeout: 5000,
                },
            );
            this.logger.debug(`Webhook sent successfully to ${url}, status: ${response.status}`);
            return { status: response.status, data: response.data };
        } catch (error) {
            this.logger.error(`Failed to send webhook to ${url}: ${error.message}`);
            throw error; // Let BullMQ handle retry
        }
    }
}
