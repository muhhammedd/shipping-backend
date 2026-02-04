import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { PrismaService } from '../../core/prisma.service';
import { Order, Prisma, OrderStatus } from '@prisma/client';

/**
 * Order Repository
 * Handles all database operations for orders
 */
@Injectable()
export class OrderRepository extends BaseRepository<
    Order,
    Prisma.OrderCreateInput,
    Prisma.OrderUpdateInput,
    Prisma.OrderWhereInput,
    Prisma.OrderWhereUniqueInput
> {
    constructor(prisma: PrismaService) {
        super(prisma, 'Order');
    }

    /**
     * Apply tenant filter for multi-tenancy
     */
    protected applyTenantFilter(where?: Prisma.OrderWhereInput): Prisma.OrderWhereInput {
        return where || {};
    }

    /**
     * Find orders with full details (merchant, courier, history)
     */
    async findWithDetails(params: {
        where?: Prisma.OrderWhereInput;
        skip?: number;
        take?: number;
        orderBy?: Prisma.OrderOrderByWithRelationInput;
    }) {
        const { where, skip, take, orderBy } = params;

        return this.prisma.order.findMany({
            where,
            skip,
            take,
            orderBy,
            include: {
                merchant: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                role: true,
                            },
                        },
                    },
                },
                courier: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                role: true,
                            },
                        },
                    },
                },
                history: {
                    orderBy: {
                        timestamp: 'desc',
                    },
                    take: 10,
                },
                uploadedFiles: true,
            },
        });
    }

    /**
     * Find order by tracking number
     */
    async findByTrackingNumber(trackingNumber: string) {
        return this.prisma.order.findUnique({
            where: { trackingNumber },
            include: {
                merchant: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                            },
                        },
                    },
                },
                courier: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                            },
                        },
                    },
                },
                history: {
                    orderBy: {
                        timestamp: 'asc',
                    },
                },
            },
        });
    }

    /**
     * Find orders by merchant
     */
    async findByMerchant(params: {
        merchantId: string;
        tenantId: string;
        status?: OrderStatus;
        skip?: number;
        take?: number;
    }) {
        const { merchantId, tenantId, status, skip, take } = params;

        const where: Prisma.OrderWhereInput = {
            merchantId,
            tenantId,
            ...(status && { status }),
        };

        return this.findWithDetails({
            where,
            skip,
            take,
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Find orders by courier
     */
    async findByCourier(params: {
        courierId: string;
        tenantId: string;
        status?: OrderStatus;
        skip?: number;
        take?: number;
    }) {
        const { courierId, tenantId, status, skip, take } = params;

        const where: Prisma.OrderWhereInput = {
            courierId,
            tenantId,
            ...(status && { status }),
        };

        return this.findWithDetails({
            where,
            skip,
            take,
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Find unassigned orders for a tenant
     */
    async findUnassigned(tenantId: string, limit = 50) {
        return this.findWithDetails({
            where: {
                tenantId,
                status: OrderStatus.CREATED,
                courierId: null,
            },
            take: limit,
            orderBy: { createdAt: 'asc' },
        });
    }

    /**
     * Count orders by status for a tenant
     */
    async countByStatus(tenantId: string) {
        const statuses = Object.values(OrderStatus);
        const counts = await Promise.all(
            statuses.map(async (status) => ({
                status,
                count: await this.count({ tenantId, status }),
            })),
        );

        return counts.reduce(
            (acc, { status, count }) => {
                acc[status] = count;
                return acc;
            },
            {} as Record<OrderStatus, number>,
        );
    }

    /**
     * Get order statistics for a merchant
     */
    async getMerchantStats(merchantId: string, tenantId: string) {
        const [total, delivered, inTransit, cancelled] = await Promise.all([
            this.count({ merchantId, tenantId }),
            this.count({ merchantId, tenantId, status: OrderStatus.DELIVERED }),
            this.count({ merchantId, tenantId, status: OrderStatus.IN_TRANSIT }),
            this.count({ merchantId, tenantId, status: OrderStatus.CANCELLED }),
        ]);

        return {
            total,
            delivered,
            inTransit,
            cancelled,
            deliveryRate: total > 0 ? (delivered / total) * 100 : 0,
        };
    }

    /**
     * Get order statistics for a courier
     */
    async getCourierStats(courierId: string, tenantId: string) {
        const [total, delivered, inTransit] = await Promise.all([
            this.count({ courierId, tenantId }),
            this.count({ courierId, tenantId, status: OrderStatus.DELIVERED }),
            this.count({ courierId, tenantId, status: OrderStatus.IN_TRANSIT }),
        ]);

        return {
            total,
            delivered,
            inTransit,
            deliveryRate: total > 0 ? (delivered / total) * 100 : 0,
        };
    }

    /**
     * Bulk update order status
     */
    async bulkUpdateStatus(orderIds: string[], status: OrderStatus, tenantId: string) {
        return this.updateMany({
            where: {
                id: { in: orderIds },
                tenantId,
            },
            data: { status },
        });
    }

    /**
     * Bulk assign orders to courier
     */
    async bulkAssign(orderIds: string[], courierId: string, tenantId: string) {
        return this.prisma.order.updateMany({
            where: {
                id: { in: orderIds },
                tenantId,
                status: OrderStatus.CREATED,
            },
            data: {
                courierId,
                status: OrderStatus.ASSIGNED,
            },
        });
    }

    /**
     * Get orders by city for zone analytics
     */
    async getOrdersByCity(tenantId: string, startDate?: Date, endDate?: Date) {
        const where: Prisma.OrderWhereInput = {
            tenantId,
            ...(startDate && endDate && {
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            }),
        };

        const orders = await this.prisma.order.groupBy({
            by: ['city'],
            where,
            _count: {
                id: true,
            },
            orderBy: {
                _count: {
                    id: 'desc',
                },
            },
            take: 10,
        });

        return orders.map((order) => ({
            city: order.city,
            count: order._count.id,
        }));
    }

    /**
     * Get revenue trends
     */
    async getRevenueTrends(tenantId: string, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const orders = await this.prisma.order.findMany({
            where: {
                tenantId,
                status: OrderStatus.DELIVERED,
                createdAt: {
                    gte: startDate,
                },
            },
            select: {
                createdAt: true,
                codAmount: true,
                price: true,
            },
        });

        // Group by date
        const trends = orders.reduce(
            (acc, order) => {
                const date = order.createdAt.toISOString().split('T')[0];
                if (!acc[date]) {
                    acc[date] = { revenue: 0, orders: 0 };
                }
                acc[date].revenue += Number(order.codAmount) - Number(order.price);
                acc[date].orders += 1;
                return acc;
            },
            {} as Record<string, { revenue: number; orders: number }>,
        );

        return Object.entries(trends).map(([date, data]) => ({
            date,
            revenue: data.revenue,
            orders: data.orders,
        }));
    }
}
