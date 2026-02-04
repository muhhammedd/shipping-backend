
import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../modules/core/prisma.service';
import type { ActiveUserData } from '../interfaces/active-user-data.interface';
import { startOfMonth, endOfMonth } from 'date-fns';

@Injectable()
export class UsageGuard implements CanActivate {
    constructor(private readonly prisma: PrismaService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user: ActiveUserData = request.user;

        if (!user || !user.tenantId) return true;

        // Only enforce for order creation
        if (request.method !== 'POST' && request.url.includes('/orders')) {
            return true;
        }

        const tenant = await this.prisma.tenant.findUnique({
            where: { id: user.tenantId },
            select: { maxOrders: true, plan: true },
        });

        if (!tenant) return false;

        // Count orders in current month
        const currentMonthStart = startOfMonth(new Date());
        const currentMonthEnd = endOfMonth(new Date());

        const orderCount = await this.prisma.order.count({
            where: {
                tenantId: user.tenantId,
                createdAt: {
                    gte: currentMonthStart,
                    lte: currentMonthEnd,
                },
            },
        });

        if (orderCount >= tenant.maxOrders) {
            throw new ForbiddenException(
                `You have reached your monthly order limit (${tenant.maxOrders}) for the ${tenant.plan} plan. Please upgrade to continue.`
            );
        }

        return true;
    }
}
