import { Controller, Post, Body, Param, UseGuards, Put } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import type { ActiveUserData } from '../../common/interfaces/active-user-data.interface';
import { Roles } from '../iam/authorization/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AccessTokenGuard } from '../iam/authentication/guards/access-token.guard';
import { RolesGuard } from '../iam/authorization/guards/roles.guard';

@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/finance')
export class FinanceAdminController {
    constructor(private readonly financeService: FinanceService) { }

    @Put('payouts/:id/approve')
    async approvePayout(
        @Param('id') id: string,
        @ActiveUser() user: ActiveUserData,
    ) {
        return this.financeService.approvePayout(id, user.sub);
    }

    @Put('payouts/:id/reject')
    async rejectPayout(
        @Param('id') id: string,
        @Body('reason') reason: string,
        @ActiveUser() user: ActiveUserData,
    ) {
        return this.financeService.rejectPayout(id, user.sub, reason);
    }

    @Put('payouts/:id/mark-paid')
    async markAsPaid(
        @Param('id') id: string,
        @ActiveUser() user: ActiveUserData,
    ) {
        return this.financeService.markPayoutAsPaid(id, user.sub);
    }

    @Post('cod-collection')
    async trackCodCollection(
        @Body('courierId') courierId: string,
        @Body('amount') amount: number,
        @ActiveUser() user: ActiveUserData,
    ) {
        return this.financeService.trackCodCollection(user.tenantId, courierId, amount);
    }

    @Post('reconcile')
    async reconcile(
        @Body('startDate') startDate: string,
        @Body('endDate') endDate: string,
        @ActiveUser() user: ActiveUserData,
    ) {
        return this.financeService.performReconciliation(
            user.tenantId,
            new Date(startDate),
            new Date(endDate),
        );
    }
}
