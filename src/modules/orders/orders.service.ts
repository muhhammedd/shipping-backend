import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../core/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { FilterOrderDto } from './dto/filter-order.dto';
import { AssignOrderDto } from './dto/assign-order.dto';
import type { ActiveUserData } from '../../common/interfaces/active-user-data.interface';
import { OrderStatus, UserRole, Prisma } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createOrderDto: CreateOrderDto, user: ActiveUserData) {
    // Generate a simple tracking number (in production, use a more robust generator)
    const trackingNumber = `SHP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Find the merchant profile for the user
    const merchant = await this.prisma.merchantProfile.findUnique({
      where: { userId: user.sub },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant profile not found for this user');
    }

    // Validate that COD amount is not negative
    if (createOrderDto.codAmount < 0 || createOrderDto.price < 0) {
      throw new BadRequestException(
        'COD amount and price must be positive numbers',
      );
    }

    return await this.prisma.order.create({
      data: {
        ...createOrderDto,
        trackingNumber,
        status: OrderStatus.CREATED,
        tenantId: user.tenantId,
        merchantId: merchant.id,
      },
    });
  }

  async findAll(user: ActiveUserData, filterDto: FilterOrderDto) {
    const where: Prisma.OrderWhereInput = {};

    // Apply tenant isolation unless user is SUPER_ADMIN
    if (user.role !== UserRole.SUPER_ADMIN) {
      where.tenantId = user.tenantId;
    }

    // Merchants can only see their own orders
    if (user.role === UserRole.MERCHANT) {
      const merchant = await this.prisma.merchantProfile.findUnique({
        where: { userId: user.sub },
      });
      if (merchant) {
        where.merchantId = merchant.id;
      }
    }

    // Filter by status if provided
    if (filterDto.status) {
      where.status = filterDto.status;
    }

    // Filter by date range if provided
    if (filterDto.startDate || filterDto.endDate) {
      where.createdAt = {};
      if (filterDto.startDate) {
        where.createdAt.gte = new Date(filterDto.startDate);
      }
      if (filterDto.endDate) {
        where.createdAt.lte = new Date(filterDto.endDate);
      }
    }

    // Get total count for pagination metadata
    const total = await this.prisma.order.count({ where });

    const limit = filterDto.limit || 10;

    // Fetch paginated results
    const data = await this.prisma.order.findMany({
      where,
      include: {
        merchant: {
          select: {
            id: true,
            companyName: true,
          },
        },
        courier: {
          select: {
            id: true,
            vehicleInfo: true,
          },
        },
      },
      skip: filterDto.skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return {
      data,
      meta: {
        page: filterDto.page,
        limit: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, user: ActiveUserData) {
    const where: Prisma.OrderWhereInput = { id };

    // Apply tenant isolation unless user is SUPER_ADMIN
    if (user.role !== UserRole.SUPER_ADMIN) {
      where.tenantId = user.tenantId;
    }

    const order = await this.prisma.order.findFirst({
      where,
      include: {
        merchant: {
          select: {
            id: true,
            companyName: true,
            balance: true,
          },
        },
        courier: {
          select: {
            id: true,
            vehicleInfo: true,
            wallet: true,
          },
        },
        history: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async updateStatus(
    id: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
    user: ActiveUserData,
  ) {
    const where: Prisma.OrderWhereInput = { id };
    if (user.role !== UserRole.SUPER_ADMIN) {
      where.tenantId = user.tenantId;
    }

    const order = await this.prisma.order.findFirst({
      where,
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. Update Order Status
      const updatedOrder = await tx.order.update({
        where: { id },
        data: { status: updateOrderStatusDto.status },
      });

      // 2. Record in History
      await tx.orderHistory.create({
        data: {
          orderId: id,
          statusFrom: order.status,
          statusTo: updateOrderStatusDto.status,
          changedById: user.sub,
          tenantId: user.tenantId,
        },
      });

      // 3. Handle financial updates when order is delivered
      if (updateOrderStatusDto.status === OrderStatus.DELIVERED) {
        // Update merchant balance
        const balanceChange = order.codAmount.minus(order.price);
        await tx.merchantProfile.update({
          where: { id: order.merchantId },
          data: {
            balance: {
              increment: balanceChange,
            },
          },
        });

        // Update courier wallet if assigned
        if (order.courierId) {
          await tx.courierProfile.update({
            where: { id: order.courierId },
            data: {
              wallet: {
                increment: order.codAmount,
              },
            },
          });
        }
      }

      return updatedOrder;
    });
  }

  async assignOrder(
    id: string,
    assignOrderDto: AssignOrderDto,
    user: ActiveUserData,
  ) {
    // Only ADMIN can assign orders
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can assign orders');
    }

    const order = await this.prisma.order.findUnique({
      where: { id, tenantId: user.tenantId },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // Check if courier belongs to the same tenant
    const courier = await this.prisma.courierProfile.findUnique({
      where: { id: assignOrderDto.courierId },
    });

    if (!courier) {
      throw new NotFoundException('Courier not found');
    }

    if (courier.tenantId !== user.tenantId) {
      throw new ForbiddenException('Courier does not belong to your tenant');
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. Update order with courier assignment
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          courierId: assignOrderDto.courierId,
          status: OrderStatus.ASSIGNED,
        },
      });

      // 2. Record in history
      await tx.orderHistory.create({
        data: {
          orderId: id,
          statusFrom: order.status,
          statusTo: OrderStatus.ASSIGNED,
          changedById: user.sub,
          tenantId: user.tenantId,
        },
      });

      return updatedOrder;
    });
  }
}
