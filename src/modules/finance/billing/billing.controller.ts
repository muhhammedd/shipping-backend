
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { BillingService } from './billing.service';
import { ActiveUser } from '../../../common/decorators/active-user.decorator';
import type { ActiveUserData } from '../../../common/interfaces/active-user-data.interface';
import { Roles } from '../../../modules/iam/authorization/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

@Controller('billing')
export class BillingController {
    constructor(private readonly billingService: BillingService) { }

    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @Post('checkout')
    async createCheckoutSession(
        @Body() createCheckoutDto: CreateCheckoutDto,
        @ActiveUser() user: ActiveUserData,
    ) {
        return this.billingService.createCheckoutSession(user.tenantId, createCheckoutDto.plan);
    }
}
