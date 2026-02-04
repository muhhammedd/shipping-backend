import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../core/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class TrackingService {
    private readonly logger = new Logger(TrackingService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Public tracking by tracking number (no authentication required)
     */
    async trackByNumber(trackingNumber: string) {
        const order: any = await this.prisma.order.findUnique({
            where: { trackingNumber },
            include: {
                history: {
                    orderBy: { timestamp: 'asc' },
                },
                courier: {
                    include: {
                        user: true,
                    },
                },
            },
        });

        if (!order) {
            throw new NotFoundException('Tracking number not found');
        }

        // Calculate estimated delivery
        const estimatedDelivery = this.calculateEstimatedDelivery(order);

        // Get current location from latest history
        const currentLocation = this.getCurrentLocation(order);

        return {
            trackingNumber: order.trackingNumber,
            status: order.status,
            statusLabel: this.getStatusLabel(order.status),
            currentLocation,
            estimatedDelivery,
            history: order.history.map((h: any) => ({
                status: h.newStatus,
                statusLabel: this.getStatusLabel(h.newStatus as OrderStatus),
                location: h.location || order.city,
                timestamp: h.timestamp,
                notes: h.notes,
            })),
            recipient: {
                name: order.recipientName,
                city: order.city,
                phone: this.maskPhone(order.recipientPhone),
            },
            courier: order.courier
                ? {
                    name: order.courier.user.name,
                    phone: this.maskPhone(order.courier.user.phone),
                }
                : null,
        };
    }

    /**
     * Get customer-friendly status label
     */
    private getStatusLabel(status: OrderStatus): string {
        const labels: Partial<Record<OrderStatus, string>> = {
            CREATED: 'Order Created',
            PICKED_UP: 'Picked Up',
            IN_TRANSIT: 'In Transit',
            DELIVERED: 'Delivered',
            RETURNED: 'Returned to Sender',
            CANCELLED: 'Cancelled',
        };

        return labels[status] || status;
    }

    /**
     * Calculate estimated delivery date
     */
    private calculateEstimatedDelivery(order: any): string | null {
        if (order.status === 'DELIVERED') {
            return null; // Already delivered
        }

        // Simple estimation: 3-5 business days from creation
        const createdDate = new Date(order.createdAt);
        const estimatedDays = 3;

        const estimatedDate = new Date(createdDate);
        estimatedDate.setDate(estimatedDate.getDate() + estimatedDays);

        return estimatedDate.toISOString().split('T')[0];
    }

    /**
     * Get current location from order history
     */
    private getCurrentLocation(order: any): string {
        if (!order.history || order.history.length === 0) {
            return order.city;
        }

        const latestHistory = order.history[order.history.length - 1];
        return latestHistory.location || order.city;
    }

    /**
     * Mask phone number for privacy (show last 4 digits)
     */
    private maskPhone(phone: string): string {
        if (!phone || phone.length < 4) {
            return '****';
        }
        return `****${phone.slice(-4)}`;
    }
}
