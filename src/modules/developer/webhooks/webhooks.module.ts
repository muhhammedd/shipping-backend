import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { WebhookProcessor } from './webhook.processor';
import { CoreModule } from '../../core/core.module';

@Module({
    imports: [
        CoreModule,
        BullModule.registerQueue({
            name: 'webhooks',
        }),
    ],
    providers: [WebhooksService, WebhookProcessor],
    controllers: [WebhooksController],
    exports: [WebhooksService],
})
export class WebhooksModule { }
