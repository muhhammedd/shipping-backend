import { Controller, Get, Param, UseGuards, NotFoundException, ForbiddenException, UseInterceptors } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import type { ActiveUserData } from '../../common/interfaces/active-user-data.interface';
import { Roles } from '../iam/authorization/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AccessTokenGuard } from '../iam/authentication/guards/access-token.guard';
import { RolesGuard } from '../iam/authorization/guards/roles.guard';
import { PrismaService } from '../core/prisma.service';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';

@UseGuards(AccessTokenGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
    constructor(
        private readonly analyticsService: AnalyticsService,
        private readonly prisma: PrismaService,
    ) { }

    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @UseInterceptors(CacheInterceptor)
    @CacheTTL(300000) // 5 minutes (in ms for newer NestJS versions/adapters, but checked config it accepts ms)
    @Get('admin/summary')
    async getAdminSummary(@ActiveUser() user: ActiveUserData) {
        return this.analyticsService.getAdminSummary(user.tenantId);
    }

    @Roles(UserRole.ADMIN, UserRole.MERCHANT, UserRole.SUPER_ADMIN)
    @UseInterceptors(CacheInterceptor)
    @CacheTTL(300000) // 5 minutes
    @Get('merchant/:id')
    async getMerchantSummary(
        @Param('id') merchantId: string,
        @ActiveUser() user: ActiveUserData,
    ) {
        let targetMerchantId = merchantId;

        if (user.role === UserRole.MERCHANT) {
            const merchant = await this.prisma.merchantProfile.findUnique({
                where: { userId: user.sub },
            });
            if (!merchant) {
                throw new NotFoundException('Merchant profile not found');
            }
            targetMerchantId = merchant.id;
        } else if (merchantId === 'me' && user.role === UserRole.ADMIN) {
            throw new ForbiddenException('Admin must specify a merchant ID');
        }

        return this.analyticsService.getMerchantSummary(targetMerchantId, user.tenantId);
    }
}
