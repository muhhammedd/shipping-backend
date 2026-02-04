import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EmailService } from './email/email.service';
import { EmailProcessor } from './email/email.processor';
import { SmsService } from './sms/sms.service';
import { PushService } from './push/push.service';
import { EmailTemplateService } from './email/email-template.service';
import { QueueModule } from '../queue/queue.module';

@Global()
@Module({
    imports: [
        QueueModule,
        BullModule.registerQueue(
            { name: 'email' },
            { name: 'sms' },
            { name: 'push' },
        ),
    ],
    providers: [EmailService, EmailProcessor, SmsService, PushService, EmailTemplateService],
    exports: [EmailService, SmsService, PushService],
})
export class CommunicationModule { }
