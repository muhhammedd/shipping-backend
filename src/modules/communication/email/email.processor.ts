import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { EmailJobData } from './email.service';
import { EmailTemplateService } from './email-template.service';

@Processor('email', { concurrency: parseInt(process.env.BULL_EMAIL_CONCURRENCY || '5') })
export class EmailProcessor extends WorkerHost {
    private readonly logger = new Logger(EmailProcessor.name);
    private transporter: nodemailer.Transporter;

    constructor(
        private readonly configService: ConfigService,
        private readonly emailTemplateService: EmailTemplateService,
    ) {
        super();
        this.createTransporter();
    }

    private createTransporter() {
        // For development, use Ethereal or a simple SMTP
        // In production, use SendGrid/SES configured via env vars
        const host = this.configService.get('SMTP_HOST') || 'smtp.ethereal.email';
        const port = parseInt(this.configService.get('SMTP_PORT') || '587');
        const user = this.configService.get('SMTP_USER') || 'ethereal_user';
        const pass = this.configService.get('SMTP_PASS') || 'ethereal_pass';

        this.transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: {
                user,
                pass,
            },
            tls: {
                rejectUnauthorized: false
            }
        });
    }

    async process(job: Job<EmailJobData>): Promise<any> {
        const { to, subject, template, context } = job.data;
        this.logger.debug(`Processing email job ${job.id} to ${to}`);

        try {
            const html = await this.emailTemplateService.render(template, context);

            const info = await this.transporter.sendMail({
                from: '"Shipex Platform" <no-reply@shipex.com>',
                to,
                subject,
                html,
            });

            this.logger.log(`Email sent: ${info.messageId}`);
            // If using Ethereal, log the preview URL
            if (info.messageId && this.configService.get('SMTP_HOST') === 'smtp.ethereal.email') {
                this.logger.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
            }

            return info;
        } catch (error) {
            this.logger.error(`Failed to send email to ${to}`, error);
            throw error;
        }
    }
}
