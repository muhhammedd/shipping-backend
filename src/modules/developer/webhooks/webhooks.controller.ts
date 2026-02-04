
import { Controller, Post, Get, Body, Param, Delete } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { ActiveUser } from '../../../common/decorators/active-user.decorator';
import type { ActiveUserData } from '../../../common/interfaces/active-user-data.interface';
import { Roles } from '../../../modules/iam/authorization/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreateWebhookDto } from './dto/create-webhook.dto';

@Controller('developer/webhooks')
export class WebhooksController {
    constructor(private readonly webhooksService: WebhooksService) { }

    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @Post()
    async create(
        @Body() createWebhookDto: CreateWebhookDto,
        @ActiveUser() user: ActiveUserData,
    ) {
        return this.webhooksService.createSubscription(user.tenantId, createWebhookDto.url, createWebhookDto.events);
    }

    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @Get()
    async findAll(@ActiveUser() user: ActiveUserData) {
        return this.webhooksService.listSubscriptions(user.tenantId);
    }
}
