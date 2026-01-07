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
import { ActiveUserData } from '../../common/interfaces/active-user-data.interface';
import { OrderStatus, UserRole } from '@prisma/client';

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

    // Validate that COD amount is not negative
    if (createOrderDto.codAmount < 0 || createOrderDto.price < 0) {
      throw new BadRequestException(
        'COD amount and price must be positive numbers',
      );
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

  async findAll(user: ActiveUserData, filterDto: FilterOrderDto) {
    const where: any = { tenantId: user.tenantId };

    // Merchants can only see their own orders
    if (user.role === UserRole.MERCHANT) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const merchant = await (this.prisma as any).merchantProfile.findUnique({
        where: { userId: user.sub },
      });
      if (merchant) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const total = await (this.prisma as any).order.count({ where });

    // Fetch paginated results
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const data = await (this.prisma as any).order.findMany({
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
      take: filterDto.limit,
      orderBy: { createdAt: 'desc' },
    });

    return {
      data,
      meta: {
        page: filterDto.page,
        limit: filterDto.limit,
        total,
        totalPages: Math.ceil(total / filterDto.limit),
      },
    };
  }

  async findOne(id: string, user: ActiveUserData) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const order = await (this.prisma as any).order.findFirst({
      where: { id, tenantId: user.tenantId },
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

      // 3. Handle financial updates when order is delivered
      if (updateOrderStatusDto.status === OrderStatus.DELIVERED) {
        // Update merchant balance
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const balanceChange = order.codAmount - order.price;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await tx.merchantProfile.update({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          where: { id: order.merchantId },
          data: {
            balance: {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              increment: balanceChange,
            },
          },
        });

        // Update courier wallet if assigned
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        if (order.courierId) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          await tx.courierProfile.update({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            where: { id: order.courierId },
            data: {
              wallet: {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                increment: order.codAmount,
              },
            },
          });
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const order = await (this.prisma as any).order.findUnique({
      where: { id, tenantId: user.tenantId },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // Check if courier belongs to the same tenant
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const courier = await (this.prisma as any).courierProfile.findUnique({
      where: { id: assignOrderDto.courierId },
    });

    if (!courier) {
      throw new NotFoundException('Courier not found');
    }

    if (courier.tenantId !== user.tenantId) {
      throw new ForbiddenException(
        'Courier does not belong to your tenant',
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return await (this.prisma as any).$transaction(async (tx: any) => {
      // 1. Update order with courier assignment
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          courierId: assignOrderDto.courierId,
          status: OrderStatus.ASSIGNED,
        },
      });

      // 2. Record in history
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await tx.orderHistory.create({
        data: {
          orderId: id,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          statusFrom: order.status,
          statusTo: OrderStatus.ASSIGNED,
          changedById: user.sub,
          tenantId: user.tenantId,
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return updatedOrder;
    });
  }
}
