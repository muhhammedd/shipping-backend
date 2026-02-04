import { Controller, Get, Put, Body, Param, UseGuards, Query, ParseIntPipe } from '@nestjs/common';
import { PrismaService } from '../../core/prisma.service';
import { Roles } from '../../iam/authorization/decorators/roles.decorator';
import { UserRole, TenantStatus } from '@prisma/client';
import { AccessTokenGuard } from '../../iam/authentication/guards/access-token.guard';
import { RolesGuard } from '../../iam/authorization/guards/roles.guard';

@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller('admin/tenants')
export class TenantsAdminController {
    constructor(private readonly prisma: PrismaService) { }

    @Get()
    async listTenants(
        @Query('page', new ParseIntPipe({ optional: true })) page = 1,
        @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    ) {
        const skip = (page - 1) * limit;
        const [tenants, total] = await Promise.all([
            this.prisma.tenant.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: { orders: true, merchants: true, couriers: true }
                    }
                }
            }),
            this.prisma.tenant.count(),
        ]);

        return { tenants, total, page, limit };
    }

    @Put(':id/status')
    async updateStatus(
        @Param('id') id: string,
        @Body('status') status: TenantStatus,
    ) {
        return this.prisma.tenant.update({
            where: { id },
            data: { status },
        });
    }

    @Get(':id/usage')
    async getResourceUsage(@Param('id') id: string) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id },
            select: { maxOrders: true, _count: { select: { orders: true } } }
        });
        return {
            limit: tenant?.maxOrders || 0,
            current: tenant?._count.orders || 0,
            percentage: tenant?.maxOrders ? (tenant._count.orders / tenant.maxOrders) * 100 : 0
        };
    }
}
