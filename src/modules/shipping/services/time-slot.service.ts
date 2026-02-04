import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma.service';
import { CreateTimeSlotDto, UpdateTimeSlotDto, GetAvailableSlotsDto } from '../dto/time-slot.dto';
import { TIME_SLOTS } from '../constants/shipping.constants';
import type { ActiveUserData } from '../../../common/interfaces/active-user-data.interface';

@Injectable()
export class TimeSlotService {
    private readonly MAX_ORDERS_PER_SLOT = 20; // Maximum orders per courier per slot

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Create delivery time slot for an order
     */
    async create(dto: CreateTimeSlotDto, user: ActiveUserData) {
        // Verify order exists and belongs to user's tenant
        const order = await this.prisma.order.findUnique({
            where: { id: dto.orderId },
        });

        if (!order || order.tenantId !== user.tenantId) {
            throw new NotFoundException('Order not found');
        }

        // Check if order already has a time slot
        const existing = await this.prisma.deliveryTimeSlot.findUnique({
            where: { orderId: dto.orderId },
        });

        if (existing) {
            throw new BadRequestException('Order already has a delivery time slot');
        }

        // Get slot details
        const slotDetails = TIME_SLOTS.find(s => s.id === dto.slot);
        if (!slotDetails) {
            throw new BadRequestException('Invalid time slot');
        }

        // Check slot availability
        const slotDate = new Date(dto.slotDate);
        const isAvailable = await this.checkSlotAvailability(slotDate, dto.slot, user.tenantId);

        if (!isAvailable) {
            throw new BadRequestException('Time slot is fully booked');
        }

        return this.prisma.deliveryTimeSlot.create({
            data: {
                orderId: dto.orderId,
                slotDate,
                slotStart: slotDetails.start,
                slotEnd: slotDetails.end,
            },
        });
    }

    /**
     * Get available time slots for a date
     */
    async getAvailableSlots(dto: GetAvailableSlotsDto, user: ActiveUserData) {
        const slotDate = new Date(dto.date);

        // Get all booked slots for this date
        const bookedSlots = await this.prisma.deliveryTimeSlot.findMany({
            where: {
                slotDate,
                order: {
                    tenantId: user.tenantId,
                    ...(dto.city && { city: dto.city }),
                },
            },
        });

        // Count bookings per slot
        const slotCounts: Record<string, number> = {};
        bookedSlots.forEach(slot => {
            const slotId = TIME_SLOTS.find(s => s.start === slot.slotStart)?.id;
            if (slotId) {
                slotCounts[slotId] = (slotCounts[slotId] || 0) + 1;
            }
        });

        // Return availability for each slot
        return TIME_SLOTS.map(slot => ({
            ...slot,
            booked: slotCounts[slot.id] || 0,
            available: this.MAX_ORDERS_PER_SLOT - (slotCounts[slot.id] || 0),
            isAvailable: (slotCounts[slot.id] || 0) < this.MAX_ORDERS_PER_SLOT,
        }));
    }

    /**
     * Update time slot
     */
    async update(orderId: string, dto: UpdateTimeSlotDto, user: ActiveUserData) {
        const timeSlot = await this.prisma.deliveryTimeSlot.findUnique({
            where: { orderId },
            include: { order: true },
        });

        if (!timeSlot || timeSlot.order.tenantId !== user.tenantId) {
            throw new NotFoundException('Time slot not found');
        }

        const updateData: any = {};

        if (dto.slotDate) {
            updateData.slotDate = new Date(dto.slotDate);
        }

        if (dto.slot) {
            const slotDetails = TIME_SLOTS.find(s => s.id === dto.slot);
            if (!slotDetails) {
                throw new BadRequestException('Invalid time slot');
            }
            updateData.slotStart = slotDetails.start;
            updateData.slotEnd = slotDetails.end;
        }

        return this.prisma.deliveryTimeSlot.update({
            where: { orderId },
            data: updateData,
        });
    }

    /**
     * Delete time slot
     */
    async remove(orderId: string, user: ActiveUserData) {
        const timeSlot = await this.prisma.deliveryTimeSlot.findUnique({
            where: { orderId },
            include: { order: true },
        });

        if (!timeSlot || timeSlot.order.tenantId !== user.tenantId) {
            throw new NotFoundException('Time slot not found');
        }

        return this.prisma.deliveryTimeSlot.delete({
            where: { orderId },
        });
    }

    /**
     * Get time slots for a list of orders
     */
    async getSlotsForOrders(orderIds: string[]) {
        return this.prisma.deliveryTimeSlot.findMany({
            where: {
                orderId: { in: orderIds },
            },
            orderBy: { slotDate: 'asc' },
        });
    }

    /**
     * Check if a slot is available
     */
    private async checkSlotAvailability(
        slotDate: Date,
        slotId: string,
        tenantId: string,
    ): Promise<boolean> {
        const slotDetails = TIME_SLOTS.find(s => s.id === slotId);
        if (!slotDetails) return false;

        const count = await this.prisma.deliveryTimeSlot.count({
            where: {
                slotDate,
                slotStart: slotDetails.start,
                order: {
                    tenantId,
                },
            },
        });

        return count < this.MAX_ORDERS_PER_SLOT;
    }
}
