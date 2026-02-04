
import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../modules/core/prisma.service';
import type { ActiveUserData } from '../interfaces/active-user-data.interface';
import { SubscriptionPlan } from '@prisma/client';

@Injectable()
export class SubscriptionGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly prisma: PrismaService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user: ActiveUserData = request.user;

        if (!user || !user.tenantId) {
            return true; // Let other guards handle auth
        }

        // specific plans required?
        const requiredPlans = this.reflector.get<SubscriptionPlan[]>('plans', context.getHandler());

        const tenant = await this.prisma.tenant.findUnique({
            where: { id: user.tenantId },
            select: { plan: true, status: true },
        });

        if (!tenant) return false;

        if (tenant.status === 'SUSPENDED') {
            throw new ForbiddenException('Tenant is suspended. Please contact support.');
        }

        if (requiredPlans && !requiredPlans.includes(tenant.plan)) {
            throw new ForbiddenException(`This feature requires one of the following plans: ${requiredPlans.join(', ')}`);
        }

        return true;
    }
}
