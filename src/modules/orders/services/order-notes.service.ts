import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma.service';
import { CreateOrderNoteDto, UpdateOrderNoteDto } from '../dto/order-note.dto';
import type { ActiveUserData } from '../../../common/interfaces/active-user-data.interface';

@Injectable()
export class OrderNotesService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Create a note for an order
     */
    async create(dto: CreateOrderNoteDto, user: ActiveUserData) {
        // Verify order exists and user has access
        const order = await this.prisma.order.findUnique({
            where: { id: dto.orderId },
            include: { merchant: true },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        // Check if user has access to this order
        if (order.merchant.userId !== user.sub && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
            throw new ForbiddenException('You do not have access to this order');
        }

        return this.prisma.orderNote.create({
            data: {
                orderId: dto.orderId,
                userId: user.sub,
                note: dto.note,
                isInternal: dto.isInternal ?? true,
            },
        });
    }

    /**
     * Get all notes for an order
     */
    async findByOrder(orderId: string, user: ActiveUserData) {
        // Verify order exists and user has access
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { merchant: true },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        // Check if user has access
        if (order.merchant.userId !== user.sub && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
            throw new ForbiddenException('You do not have access to this order');
        }

        // Filter notes based on user role
        const where: any = { orderId };

        // Non-admin users can only see their own internal notes or all non-internal notes
        if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
            where.OR = [
                { isInternal: false },
                { userId: user.sub, isInternal: true },
            ];
        }

        return this.prisma.orderNote.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                order: {
                    select: {
                        trackingNumber: true,
                        recipientName: true,
                    },
                },
            },
        });
    }

    /**
     * Update a note
     */
    async update(id: string, dto: UpdateOrderNoteDto, user: ActiveUserData) {
        const note = await this.prisma.orderNote.findUnique({
            where: { id },
        });

        if (!note) {
            throw new NotFoundException('Note not found');
        }

        // Only the creator or admin can update
        if (note.userId !== user.sub && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
            throw new ForbiddenException('You can only update your own notes');
        }

        return this.prisma.orderNote.update({
            where: { id },
            data: dto,
        });
    }

    /**
     * Delete a note
     */
    async remove(id: string, user: ActiveUserData) {
        const note = await this.prisma.orderNote.findUnique({
            where: { id },
        });

        if (!note) {
            throw new NotFoundException('Note not found');
        }

        // Only the creator or admin can delete
        if (note.userId !== user.sub && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
            throw new ForbiddenException('You can only delete your own notes');
        }

        return this.prisma.orderNote.delete({
            where: { id },
        });
    }
}
