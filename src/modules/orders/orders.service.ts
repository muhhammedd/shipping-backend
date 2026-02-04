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
import { BulkUpdateOrderStatusDto } from './dto/bulk-update-order-status.dto';
import { BulkAssignOrderDto } from './dto/bulk-assign-order.dto';
import { paginate, PaginationResult } from '../../common/utils/pagination.util';
import type { ActiveUserData } from '../../common/interfaces/active-user-data.interface';
import { OrderStatus, UserRole, Prisma } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createOrderDto: CreateOrderDto, user: ActiveUserData) {
    let merchantId: string;

    if (user.role === UserRole.MERCHANT) {
      const merchant = await this.prisma.merchantProfile.findUnique({
        where: { userId: user.sub },
      });
      if (!merchant) {
        throw new BadRequestException('Merchant profile not found');
      }
      merchantId = merchant.id;
    } else {
      // Admin must provide merchantId
      if (!createOrderDto.merchantId) {
        throw new BadRequestException('Merchant ID is required when creating order as Admin');
      }
      merchantId = createOrderDto.merchantId;
    }

    return await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          ...createOrderDto,
          tenantId: user.tenantId,
          merchantId,
          status: OrderStatus.CREATED,
          trackingNumber: this.generateTrackingNumber(),
          createdBy: user.sub,
        },
      });

      await tx.orderHistory.create({
        data: {
          orderId: order.id,
          statusFrom: OrderStatus.CREATED,
          statusTo: OrderStatus.CREATED,
          changedById: user.sub,
          tenantId: user.tenantId,
        },
      });

      return order;
    });
  }

  private generateTrackingNumber(): string {
    return `SPX-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
  }

  async findAll(user: ActiveUserData, filterDto: FilterOrderDto): Promise<PaginationResult<any>> {
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
      } else {
        // If merchant profile doesn't exist, they shouldn't see anything
        where.merchantId = 'none';
      }
    }

    // Couriers can only see their assigned orders
    if (user.role === UserRole.COURIER) {
      const courier = await this.prisma.courierProfile.findUnique({
        where: { userId: user.sub },
      });
      if (courier) {
        where.courierId = courier.id;
      } else {
        where.courierId = 'none';
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

    return paginate(
      this.prisma.order,
      {
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
        orderBy: { createdAt: 'desc' },
      },
      filterDto.page,
      filterDto.limit,
    );
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

    // Role-based Access Check
    if (user.role === UserRole.MERCHANT) {
      const merchant = await this.prisma.merchantProfile.findUnique({
        where: { userId: user.sub },
      });
      if (!merchant || order.merchantId !== merchant.id) {
        throw new ForbiddenException('You do not have access to this order');
      }
    }

    if (user.role === UserRole.COURIER) {
      const courier = await this.prisma.courierProfile.findUnique({
        where: { userId: user.sub },
      });
      if (!courier || order.courierId !== courier.id) {
        throw new ForbiddenException('You do not have access to this order');
      }
    }

    // Remove sensitive fields from result
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
      const merchantProfile = await this.prisma.merchantProfile.findUnique({ where: { userId: user.sub } });
      const courierProfile = await this.prisma.courierProfile.findUnique({ where: { userId: user.sub } });

      if (order.merchant && order.merchantId !== merchantProfile?.id) {
        (order.merchant as any).balance = undefined;
      }
      if (order.courier && order.courierId !== courierProfile?.id) {
        (order.courier as any).wallet = undefined;
      }
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

    // Role-based Access Check
    if (user.role === UserRole.COURIER) {
      const courier = await this.prisma.courierProfile.findUnique({
        where: { userId: user.sub },
      });
      if (!courier || order.courierId !== courier.id) {
        throw new ForbiddenException('You can only update status of your assigned orders');
      }

      // Basic state transition validation for Courier
      const allowedCourierStatuses: OrderStatus[] = [
        OrderStatus.PICKED_UP,
        OrderStatus.IN_TRANSIT,
        OrderStatus.DELIVERED,
      ];
      if (!allowedCourierStatuses.includes(updateOrderStatusDto.status)) {
        throw new ForbiddenException(
          `Couriers are not allowed to transition order to ${updateOrderStatusDto.status}`,
        );
      }
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
    // Only ADMIN and SUPER_ADMIN can assign orders
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
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

    if (courier.tenantId !== user.tenantId && user.role !== UserRole.SUPER_ADMIN) {
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

  async bulkUpdateStatus(
    bulkUpdateDto: BulkUpdateOrderStatusDto,
    user: ActiveUserData,
  ) {
    const { orderIds, status } = bulkUpdateDto;

    return await this.prisma.$transaction(async (tx) => {
      const updatedOrders: any[] = [];

      for (const id of orderIds) {
        const order = await tx.order.findUnique({
          where: { id, tenantId: user.tenantId },
        });

        if (!order || order.status === status) continue;

        const updated = await tx.order.update({
          where: { id },
          data: { status },
        });

        await tx.orderHistory.create({
          data: {
            orderId: id,
            statusFrom: order.status,
            statusTo: status,
            changedById: user.sub,
            tenantId: user.tenantId,
          },
        });

        if (status === OrderStatus.DELIVERED) {
          const balanceChange = order.codAmount.minus(order.price);
          await tx.merchantProfile.update({
            where: { id: order.merchantId },
            data: { balance: { increment: balanceChange } },
          });

          if (order.courierId) {
            await tx.courierProfile.update({
              where: { id: order.courierId },
              data: { wallet: { increment: order.codAmount } },
            });
          }
        }

        updatedOrders.push(updated);
      }

      return updatedOrders;
    });
  }

  async bulkAssign(bulkAssignDto: BulkAssignOrderDto, user: ActiveUserData) {
    const { orderIds, courierId } = bulkAssignDto;

    // Only ADMIN and SUPER_ADMIN can assign orders
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only admins can assign orders');
    }

    const courier = await this.prisma.courierProfile.findUnique({
      where: { id: courierId },
    });

    if (!courier) {
      throw new NotFoundException('Courier not found');
    }

    if (courier.tenantId !== user.tenantId && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Courier not in your tenant');
    }

    return await this.prisma.$transaction(async (tx) => {
      const results: any[] = [];

      for (const id of orderIds) {
        const order = await tx.order.findUnique({
          where: { id, tenantId: user.tenantId },
        });

        if (!order) continue;

        const updated = await tx.order.update({
          where: { id },
          data: {
            courierId,
            status: OrderStatus.ASSIGNED,
          },
        });

        await tx.orderHistory.create({
          data: {
            orderId: id,
            statusFrom: order.status,
            statusTo: OrderStatus.ASSIGNED,
            changedById: user.sub,
            tenantId: user.tenantId,
          },
        });

        results.push(updated);
      }
      return results;
    });
  }
}
