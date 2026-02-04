import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma.service';
import { OrderStatus } from '@prisma/client';
import { CancelOrderDto, ReturnOrderDto, AssignOrderDto, BulkAssignOrdersDto } from '../dto/order-operations.dto';
import { OrderStateMachine } from '../state-machine/order-state-machine';
import type { ActiveUserData } from '../../../common/interfaces/active-user-data.interface';

@Injectable()
export class OrderOperationsService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Cancel an order
     */
    async cancelOrder(orderId: string, dto: CancelOrderDto, user: ActiveUserData) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        // Validate state transition
        OrderStateMachine.ensureValidTransition(order.status, OrderStatus.CANCELLED);

        // Update order status
        const updatedOrder = await this.prisma.order.update({
            where: { id: orderId },
            data: {
                status: OrderStatus.CANCELLED,
                updatedBy: user.sub,
            },
        });

        // Create history entry
        await this.prisma.orderHistory.create({
            data: {
                orderId,
                statusFrom: order.status,
                statusTo: OrderStatus.CANCELLED,
                changedById: user.sub,
                tenantId: order.tenantId,
            },
        });

        // Create note with cancellation reason
        await this.prisma.orderNote.create({
            data: {
                orderId,
                userId: user.sub,
                note: `Order cancelled: ${dto.reason}${dto.notes ? ` - ${dto.notes}` : ''}`,
                isInternal: true,
            },
        });

        return updatedOrder;
    }

    /**
     * Return an order
     */
    async returnOrder(orderId: string, dto: ReturnOrderDto, user: ActiveUserData) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        // Can only return delivered orders
        if (order.status !== OrderStatus.DELIVERED) {
            throw new BadRequestException('Only delivered orders can be returned');
        }

        // Update order status
        const updatedOrder = await this.prisma.order.update({
            where: { id: orderId },
            data: {
                status: OrderStatus.RETURNED,
                updatedBy: user.sub,
            },
        });

        // Create history entry
        await this.prisma.orderHistory.create({
            data: {
                orderId,
                statusFrom: order.status,
                statusTo: OrderStatus.RETURNED,
                changedById: user.sub,
                tenantId: order.tenantId,
            },
        });

        // Create note with return reason
        await this.prisma.orderNote.create({
            data: {
                orderId,
                userId: user.sub,
                note: `Order returned: ${dto.reason}${dto.notes ? ` - ${dto.notes}` : ''}`,
                isInternal: true,
            },
        });

        return updatedOrder;
    }

    /**
     * Assign order to courier
     */
    async assignOrder(orderId: string, dto: AssignOrderDto, user: ActiveUserData) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        // Verify courier exists
        const courier = await this.prisma.courierProfile.findUnique({
            where: { id: dto.courierId },
        });

        if (!courier) {
            throw new NotFoundException('Courier not found');
        }

        // Validate state transition
        OrderStateMachine.ensureValidTransition(order.status, OrderStatus.ASSIGNED);

        // Update order
        const updatedOrder = await this.prisma.order.update({
            where: { id: orderId },
            data: {
                courierId: dto.courierId,
                status: OrderStatus.ASSIGNED,
                updatedBy: user.sub,
            },
        });

        // Create history entry
        await this.prisma.orderHistory.create({
            data: {
                orderId,
                statusFrom: order.status,
                statusTo: OrderStatus.ASSIGNED,
                changedById: user.sub,
                tenantId: order.tenantId,
            },
        });

        return updatedOrder;
    }

    /**
     * Bulk assign orders to courier
     */
    async bulkAssignOrders(dto: BulkAssignOrdersDto, user: ActiveUserData) {
        // Verify courier exists
        const courier = await this.prisma.courierProfile.findUnique({
            where: { id: dto.courierId },
        });

        if (!courier) {
            throw new NotFoundException('Courier not found');
        }

        // Get all orders
        const orders = await this.prisma.order.findMany({
            where: {
                id: { in: dto.orderIds },
                status: OrderStatus.CREATED, // Only assign created orders
            },
        });

        if (orders.length === 0) {
            throw new BadRequestException('No valid orders found for assignment');
        }

        // Update orders
        await this.prisma.order.updateMany({
            where: {
                id: { in: orders.map(o => o.id) },
            },
            data: {
                courierId: dto.courierId,
                status: OrderStatus.ASSIGNED,
            },
        });

        // Create history entries for each order
        await Promise.all(
            orders.map(order =>
                this.prisma.orderHistory.create({
                    data: {
                        orderId: order.id,
                        statusFrom: order.status,
                        statusTo: OrderStatus.ASSIGNED,
                        changedById: user.sub,
                        tenantId: order.tenantId,
                    },
                }),
            ),
        );

        return {
            assignedCount: orders.length,
            orderIds: orders.map(o => o.id),
        };
    }

    /**
     * Get order timeline (activity history)
     */
    async getOrderTimeline(orderId: string, user: ActiveUserData) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        // Get history and notes
        const [history, notes] = await Promise.all([
            this.prisma.orderHistory.findMany({
                where: { orderId },
                orderBy: { timestamp: 'asc' },
            }),
            this.prisma.orderNote.findMany({
                where: { orderId },
                orderBy: { createdAt: 'asc' },
            }),
        ]);

        // Combine and sort by timestamp
        const timeline = [
            ...history.map(h => ({
                type: 'status_change',
                timestamp: h.timestamp,
                data: h,
            })),
            ...notes.map(n => ({
                type: 'note',
                timestamp: n.createdAt,
                data: n,
            })),
        ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        return {
            orderId,
            trackingNumber: order.trackingNumber,
            timeline,
        };
    }

    /**
     * Optimize courier assignment based on location and workload
     */
    async optimizeAssignment(orderIds: string[], tenantId: string) {
        // Get orders with city information
        const orders = await this.prisma.order.findMany({
            where: {
                id: { in: orderIds },
                tenantId,
                status: OrderStatus.CREATED,
            },
            select: {
                id: true,
                city: true,
            },
        });

        if (orders.length === 0) {
            throw new BadRequestException('No valid orders found');
        }

        // Get available couriers with their current workload
        const couriers = await this.prisma.courierProfile.findMany({
            where: { tenantId },
            include: {
                assignments: {
                    where: {
                        status: {
                            in: [OrderStatus.ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT],
                        },
                    },
                },
            },
        });

        if (couriers.length === 0) {
            throw new BadRequestException('No couriers available');
        }

        // Simple optimization: assign to courier with least workload in same city
        const assignments: { orderId: string; courierId: string }[] = [];

        for (const order of orders) {
            // Find couriers with orders in the same city
            const cityBasedCouriers = couriers.filter(c =>
                c.assignments.some(a => a.city === order.city),
            );

            // If no courier has orders in this city, use all couriers
            const availableCouriers = cityBasedCouriers.length > 0 ? cityBasedCouriers : couriers;

            // Sort by workload (ascending)
            const sortedCouriers = availableCouriers.sort(
                (a, b) => a.assignments.length - b.assignments.length,
            );

            // Assign to courier with least workload
            if (sortedCouriers.length > 0) {
                assignments.push({
                    orderId: order.id,
                    courierId: sortedCouriers[0].id,
                });

                // Update local workload count for next iteration
                sortedCouriers[0].assignments.push({ city: order.city } as any);
            }
        }

        return {
            totalOrders: orders.length,
            assignments,
            optimizationStrategy: 'workload_and_location',
        };
    }
}
