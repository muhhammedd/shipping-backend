import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma.service';
import { OrderStatus } from '@prisma/client';
import { RecordFailedDeliveryDto } from '../dto/failed-delivery.dto';
import type { ActiveUserData } from '../../../common/interfaces/active-user-data.interface';

@Injectable()
export class FailedDeliveryService {
    private readonly MAX_DELIVERY_ATTEMPTS = 3;

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Record a failed delivery attempt
     */
    async recordFailure(dto: RecordFailedDeliveryDto, user: ActiveUserData) {
        // Verify order exists and courier has access
        const order = await this.prisma.order.findUnique({
            where: { id: dto.orderId },
            include: { courier: true },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        if (!order.courier || order.courier.userId !== user.sub) {
            throw new BadRequestException('You are not assigned to this order');
        }

        // Count previous attempts
        const previousAttempts = await this.prisma.failedDelivery.count({
            where: { orderId: dto.orderId },
        });

        const attemptNumber = previousAttempts + 1;

        // Create failed delivery record
        const failedDelivery = await this.prisma.failedDelivery.create({
            data: {
                orderId: dto.orderId,
                courierId: order.courierId!,
                attemptNumber,
                failureReason: dto.failureReason,
                notes: dto.notes,
                photoUrl: dto.photoUrl,
                latitude: dto.latitude,
                longitude: dto.longitude,
                nextAttemptDate: dto.nextAttemptDate ? new Date(dto.nextAttemptDate) : this.calculateNextAttempt(attemptNumber),
            },
        });

        // Update order status based on attempt number
        if (attemptNumber >= this.MAX_DELIVERY_ATTEMPTS) {
            // Max attempts reached - mark as returned
            await this.prisma.order.update({
                where: { id: dto.orderId },
                data: { status: OrderStatus.RETURNED },
            });

            // Create order history
            await this.prisma.orderHistory.create({
                data: {
                    orderId: dto.orderId,
                    statusFrom: order.status,
                    statusTo: OrderStatus.RETURNED,
                    changedById: user.sub,
                    tenantId: order.tenantId,
                    location: dto.latitude && dto.longitude
                        ? `${dto.latitude},${dto.longitude}`
                        : undefined,
                },
            });
        } else {
            // Update order status to indicate failed attempt
            await this.prisma.order.update({
                where: { id: dto.orderId },
                data: { status: OrderStatus.IN_TRANSIT }, // Keep in transit for retry
            });
        }

        return {
            ...failedDelivery,
            attemptsRemaining: this.MAX_DELIVERY_ATTEMPTS - attemptNumber,
            maxAttemptsReached: attemptNumber >= this.MAX_DELIVERY_ATTEMPTS,
        };
    }

    /**
     * Get failed deliveries for an order
     */
    async getOrderFailures(orderId: string, user: ActiveUserData) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });

        if (!order || order.tenantId !== user.tenantId) {
            throw new NotFoundException('Order not found');
        }

        return this.prisma.failedDelivery.findMany({
            where: { orderId },
            orderBy: { createdAt: 'desc' },
            include: {
                courier: {
                    select: {
                        id: true,
                        vehicleInfo: true,
                        user: {
                            select: {
                                email: true,
                            },
                        },
                    },
                },
            },
        });
    }

    /**
     * Get courier's failed deliveries
     */
    async getCourierFailures(user: ActiveUserData, limit = 50) {
        const courierProfile = await this.prisma.courierProfile.findUnique({
            where: { userId: user.sub },
        });

        if (!courierProfile) {
            throw new NotFoundException('Courier profile not found');
        }

        return this.prisma.failedDelivery.findMany({
            where: { courierId: courierProfile.id },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                order: {
                    select: {
                        trackingNumber: true,
                        recipientName: true,
                        city: true,
                        status: true,
                    },
                },
            },
        });
    }

    /**
     * Schedule retry for failed delivery
     */
    async scheduleRetry(failureId: string, nextAttemptDate: Date, user: ActiveUserData) {
        const failure = await this.prisma.failedDelivery.findUnique({
            where: { id: failureId },
            include: { order: true },
        });

        if (!failure || failure.order.tenantId !== user.tenantId) {
            throw new NotFoundException('Failed delivery record not found');
        }

        return this.prisma.failedDelivery.update({
            where: { id: failureId },
            data: { nextAttemptDate },
        });
    }

    /**
     * Calculate next attempt date based on attempt number
     */
    private calculateNextAttempt(attemptNumber: number): Date {
        const now = new Date();

        // First attempt: retry next day
        // Second attempt: retry in 2 days
        // Third attempt: retry in 3 days
        const daysToAdd = attemptNumber;

        now.setDate(now.getDate() + daysToAdd);
        now.setHours(10, 0, 0, 0); // Set to 10 AM

        return now;
    }

    /**
     * Get failed delivery statistics
     */
    async getFailureStats(user: ActiveUserData) {
        const failures = await this.prisma.failedDelivery.findMany({
            where: {
                order: {
                    tenantId: user.tenantId,
                },
            },
        });

        // Group by reason
        const reasonCounts: Record<string, number> = {};
        failures.forEach(f => {
            reasonCounts[f.failureReason] = (reasonCounts[f.failureReason] || 0) + 1;
        });

        const totalOrders = await this.prisma.order.count({
            where: { tenantId: user.tenantId },
        });

        return {
            totalFailures: failures.length,
            totalOrders,
            failureRate: totalOrders > 0 ? (failures.length / totalOrders) * 100 : 0,
            reasonBreakdown: Object.entries(reasonCounts).map(([reason, count]) => ({
                reason,
                count,
                percentage: (count / failures.length) * 100,
            })).sort((a, b) => b.count - a.count),
        };
    }
}
