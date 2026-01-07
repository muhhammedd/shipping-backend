import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../core/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ActiveUserData } from '../../common/interfaces/active-user-data.interface';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createOrderDto: CreateOrderDto, user: ActiveUserData) {
    // Generate a simple tracking number (in production, use a more robust generator)
    const trackingNumber = `SHP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Find the merchant profile for the user
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const merchant = await (this.prisma as any).merchantProfile.findUnique({
      where: { userId: user.sub },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant profile not found for this user');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return await (this.prisma as any).order.create({
      data: {
        ...createOrderDto,
        trackingNumber,
        status: OrderStatus.CREATED,
        tenantId: user.tenantId,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        merchantId: merchant.id,
      },
    });
  }

  async findAll(user: ActiveUserData) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return await (this.prisma as any).order.findMany({
      where: { tenantId: user.tenantId },
      include: {
        merchant: true,
        courier: true,
      },
    });
  }

  async findOne(id: string, user: ActiveUserData) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const order = await (this.prisma as any).order.findUnique({
      where: { id, tenantId: user.tenantId },
      include: {
        merchant: true,
        courier: true,
        history: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return order;
  }

  async updateStatus(
    id: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
    user: ActiveUserData,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const order = await (this.prisma as any).order.findUnique({
      where: { id, tenantId: user.tenantId },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return await (this.prisma as any).$transaction(async (tx: any) => {
      // 1. Update Order Status
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const updatedOrder = await tx.order.update({
        where: { id },
        data: { status: updateOrderStatusDto.status },
      });

      // 2. Record in History
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await tx.orderHistory.create({
        data: {
          orderId: id,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          statusFrom: order.status,
          statusTo: updateOrderStatusDto.status,
          changedById: user.sub,
          tenantId: user.tenantId,
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return updatedOrder;
    });
  }
}
