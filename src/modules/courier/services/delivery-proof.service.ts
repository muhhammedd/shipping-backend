import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma.service';
import { CreateDeliveryProofDto } from '../dto/delivery-proof.dto';
import { OrderStatus } from '@prisma/client';
import type { ActiveUserData } from '../../../common/interfaces/active-user-data.interface';

@Injectable()
export class DeliveryProofService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Create delivery proof for an order
     */
    async create(dto: CreateDeliveryProofDto, user: ActiveUserData) {
        // Get courier profile
        const courierProfile = await this.prisma.courierProfile.findUnique({
            where: { userId: user.sub },
        });

        if (!courierProfile) {
            throw new NotFoundException('Courier profile not found');
        }

        // Verify order exists and is assigned to this courier
        const order = await this.prisma.order.findUnique({
            where: { id: dto.orderId },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        if (order.courierId !== courierProfile.id) {
            throw new ForbiddenException('This order is not assigned to you');
        }

        if (order.status !== OrderStatus.IN_TRANSIT) {
            throw new ForbiddenException('Order must be in transit to submit delivery proof');
        }

        // Create delivery proof
        const deliveryProof = await this.prisma.deliveryProof.create({
            data: {
                orderId: dto.orderId,
                signatureUrl: dto.signatureUrl,
                photoUrl: dto.photoUrl,
                recipientName: dto.recipientName,
                notes: dto.notes,
                latitude: dto.latitude,
                longitude: dto.longitude,
            },
        });

        // Update order status to DELIVERED
        await this.prisma.order.update({
            where: { id: dto.orderId },
            data: {
                status: OrderStatus.DELIVERED,
            },
        });

        // Create order history entry
        await this.prisma.orderHistory.create({
            data: {
                orderId: dto.orderId,
                statusFrom: order.status,
                statusTo: OrderStatus.DELIVERED,
                changedById: user.sub,
                tenantId: user.tenantId,
            },
        });

        return deliveryProof;
    }

    /**
     * Get delivery proof for an order
     */
    async findByOrder(orderId: string, user: ActiveUserData) {
        const deliveryProof = await this.prisma.deliveryProof.findUnique({
            where: { orderId },
            include: {
                order: {
                    select: {
                        trackingNumber: true,
                        recipientName: true,
                        address: true,
                        city: true,
                    },
                },
            },
        });

        if (!deliveryProof) {
            throw new NotFoundException('Delivery proof not found');
        }

        return deliveryProof;
    }

    /**
     * Get all delivery proofs for a courier
     */
    async findByCourier(user: ActiveUserData, limit = 50) {
        const courierProfile = await this.prisma.courierProfile.findUnique({
            where: { userId: user.sub },
        });

        if (!courierProfile) {
            throw new NotFoundException('Courier profile not found');
        }

        return this.prisma.deliveryProof.findMany({
            where: {
                order: {
                    courierId: courierProfile.id,
                },
            },
            include: {
                order: {
                    select: {
                        trackingNumber: true,
                        recipientName: true,
                        address: true,
                        city: true,
                    },
                },
            },
            orderBy: {
                deliveredAt: 'desc',
            },
            take: limit,
        });
    }
}
