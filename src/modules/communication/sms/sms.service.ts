import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class SmsService {
    private readonly logger = new Logger(SmsService.name);

    constructor(@InjectQueue('sms') private readonly smsQueue: Queue) { }

    async sendSms(to: string, message: string) {
        try {
            await this.smsQueue.add('send-sms', {
                to,
                message,
            }, {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
                removeOnComplete: true,
            });
            this.logger.debug(`Queued SMS to ${to}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to queue SMS to ${to}: ${error.message}`);
            return false;
        }
    }
}
