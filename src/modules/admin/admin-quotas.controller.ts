import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../core/prisma.service';
import { AccessTokenGuard } from '../iam/authentication/guards/access-token.guard';
import { Roles } from '../iam/authorization/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/quotas')
export class AdminQuotasController {
    constructor(private readonly prisma: PrismaService) { }

    @Get('overview')
    @ApiOperation({ summary: 'Get quota overview for all tenants', description: 'Admin-only endpoint to view API quota usage across all tenants' })
    @ApiResponse({ status: 200, description: 'Quota overview returned' })
    async getOverview() {
        const tenants = await this.prisma.tenant.findMany({
            select: {
                id: true,
                name: true,
                plan: true,
            },
        });

        const now = new Date();
        const hourStart = new Date(Math.floor(now.getTime() / 3600000) * 3600000);

        const quotas = await this.prisma.apiQuota.findMany({
            where: {
                periodStart: hourStart,
            },
        });

        const tenantUsage = tenants.map((tenant) => {
            const quota = quotas.find((q) => q.tenantId === tenant.id);
            const limits = {
                FREE: 100,
                BASIC: 1000,
                PREMIUM: 10000,
                ENTERPRISE: -1,
            };

            return {
                id: tenant.id,
                name: tenant.name,
                plan: tenant.plan,
                used: quota?.requestCount || 0,
                limit: limits[tenant.plan],
            };
        });

        return {
            totalRequests: quotas.reduce((sum, q) => sum + q.requestCount, 0),
            activeTenants: tenants.length,
            avgRequests: Math.round(quotas.reduce((sum, q) => sum + q.requestCount, 0) / tenants.length),
            nearLimit: tenantUsage.filter((t) => t.limit !== -1 && (t.used / t.limit) > 0.8).length,
            tenants: tenantUsage,
        };
    }

    @Get('tenant/:id')
    @ApiOperation({ summary: 'Get quota details for specific tenant' })
    @ApiResponse({ status: 200, description: 'Tenant quota details returned' })
    async getTenantQuota(@Param('id') tenantId: string) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                id: true,
                name: true,
                plan: true,
            },
        });

        if (!tenant) {
            throw new Error('Tenant not found');
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);

        const quotas = await this.prisma.apiQuota.findMany({
            where: {
                tenantId,
                periodStart: {
                    gte: startDate,
                },
            },
            orderBy: {
                periodStart: 'asc',
            },
        });

        return {
            tenant,
            history: quotas.map((q) => ({
                date: q.periodStart,
                requests: q.requestCount,
            })),
        };
    }

    @Get('alerts')
    @ApiOperation({ summary: 'Get tenants near quota limit' })
    @ApiResponse({ status: 200, description: 'Alerts returned' })
    async getAlerts() {
        const tenants = await this.prisma.tenant.findMany({
            select: {
                id: true,
                name: true,
                plan: true,
            },
        });

        const now = new Date();
        const hourStart = new Date(Math.floor(now.getTime() / 3600000) * 3600000);

        const quotas = await this.prisma.apiQuota.findMany({
            where: {
                periodStart: hourStart,
            },
        });

        const limits = {
            FREE: 100,
            BASIC: 1000,
            PREMIUM: 10000,
            ENTERPRISE: -1,
        };

        const alerts = tenants
            .map((tenant) => {
                const quota = quotas.find((q) => q.tenantId === tenant.id);
                const limit = limits[tenant.plan];
                const used = quota?.requestCount || 0;
                const percentage = limit === -1 ? 0 : (used / limit) * 100;

                return {
                    tenant,
                    used,
                    limit,
                    percentage,
                };
            })
            .filter((alert) => alert.limit !== -1 && alert.percentage > 80)
            .sort((a, b) => b.percentage - a.percentage);

        return alerts;
    }
}
