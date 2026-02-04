import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma.service';
import { CourierStatus } from '@prisma/client';
import type { ActiveUserData } from '../../../common/interfaces/active-user-data.interface';

@Injectable()
export class CourierService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get courier profile by user ID
     */
    async getProfile(userId: string) {
        const courier = await this.prisma.courierProfile.findUnique({
            where: { userId },
            include: { user: { select: { firstName: true, lastName: true, email: true } } },
        });

        if (!courier) {
            throw new NotFoundException('Courier profile not found');
        }

        return courier;
    }

    /**
     * Update courier availability and status
     */
    async updateStatus(userId: string, status: CourierStatus, isAvailable: boolean) {
        const courier = await this.getProfile(userId);

        return await this.prisma.courierProfile.update({
            where: { id: courier.id },
            data: { status, isAvailable },
        });
    }

    /**
     * Get courier assignments (orders requiring action)
     */
    async getAssignments(userId: string) {
        const courier = await this.getProfile(userId);

        return await this.prisma.order.findMany({
            where: {
                courierId: courier.id,
                status: { in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'] },
            },
            orderBy: { updatedAt: 'desc' },
        });
    }

    /**
     * Get courier performance statistics
     */
    async getPerformance(userId: string) {
        const courier = await this.getProfile(userId);

        return {
            rating: courier.rating,
            completedDeliveries: courier.completedDeliveries,
            failedDeliveries: courier.failedDeliveries,
        };
    }

    /**
     * Get courier earnings and transaction history
     */
    async getEarnings(userId: string) {
        const courier = await this.getProfile(userId);

        const transactions = await this.prisma.transaction.findMany({
            where: { courierId: courier.id },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });

        return {
            balance: courier.wallet,
            recentTransactions: transactions,
        };
    }
}
