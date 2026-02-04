import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface EmailJobData {
    to: string;
    subject: string;
    template: string; // process as 'welcome', 'reset-password', etc.
    context: any;
}

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);

    constructor(@InjectQueue('email') private readonly emailQueue: Queue) { }

    async sendEmail(to: string, subject: string, template: string, context: any) {
        try {
            await this.emailQueue.add('send-email', {
                to,
                subject,
                template,
                context,
            }, {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
            });
            this.logger.log(`Queued email to ${to} [${template}]`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to queue email to ${to}`, error);
            return false;
        }
    }

    async sendWelcomeEmail(to: string, name: string) {
        return this.sendEmail(to, 'Welcome to Shipex!', 'welcome', { name });
    }

    async sendPasswordResetEmail(to: string, token: string) {
        return this.sendEmail(to, 'Reset your password', 'reset-password', { token });
    }
}
