
import { Module } from '@nestjs/common';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
    imports: [ApiKeysModule, WebhooksModule],
})
export class DeveloperModule { }
