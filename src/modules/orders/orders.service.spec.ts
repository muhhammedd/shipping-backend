import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../core/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AssignOrderDto } from './dto/assign-order.dto';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrderStatus, UserRole } from '@prisma/client';

describe('OrdersService', () => {
  let service: OrdersService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    order: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    merchantProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    courierProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    orderHistory: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an order successfully', async () => {
      const createOrderDto: CreateOrderDto = {
        recipientName: 'John Doe',
        recipientPhone: '+1234567890',
        address: '123 Main St',
        city: 'New York',
        price: 10,
        codAmount: 100,
      };

      const mockMerchant = { id: 'merchant-123' };
      const mockOrder = {
        id: 'order-123',
        trackingNumber: 'SHP-123456-789',
        status: OrderStatus.CREATED,
        ...createOrderDto,
      };

      mockPrismaService.merchantProfile.findUnique.mockResolvedValue(mockMerchant);
      mockPrismaService.order.create.mockResolvedValue(mockOrder);

      const result = await service.create(createOrderDto, {
        sub: 'user-123',
        email: 'test@example.com',
        role: UserRole.MERCHANT,
        tenantId: 'tenant-123',
      });

      expect(result).toEqual(mockOrder);
      expect(mockPrismaService.merchantProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });

    it('should throw NotFoundException if merchant profile not found', async () => {
      const createOrderDto: CreateOrderDto = {
        recipientName: 'John Doe',
        recipientPhone: '+1234567890',
        address: '123 Main St',
        city: 'New York',
        price: 10,
        codAmount: 100,
      };

      mockPrismaService.merchantProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.create(createOrderDto, {
          sub: 'user-123',
          email: 'test@example.com',
          role: UserRole.MERCHANT,
          tenantId: 'tenant-123',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for negative amounts', async () => {
      const createOrderDto: CreateOrderDto = {
        recipientName: 'John Doe',
        recipientPhone: '+1234567890',
        address: '123 Main St',
        city: 'New York',
        price: -10,
        codAmount: 100,
      };

      const mockMerchant = { id: 'merchant-123' };
      mockPrismaService.merchantProfile.findUnique.mockResolvedValue(mockMerchant);

      await expect(
        service.create(createOrderDto, {
          sub: 'user-123',
          email: 'test@example.com',
          role: UserRole.MERCHANT,
          tenantId: 'tenant-123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated orders for admin', async () => {
      const mockOrders = [
        { id: 'order-1', status: OrderStatus.CREATED },
        { id: 'order-2', status: OrderStatus.DELIVERED },
      ];

      mockPrismaService.order.count.mockResolvedValue(2);
      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

      const result = await service.findAll(
        {
          sub: 'user-123',
          email: 'admin@example.com',
          role: UserRole.ADMIN,
          tenantId: 'tenant-123',
        },
        { page: 1, limit: 10 },
      );

      expect(result.data).toEqual(mockOrders);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
    });

    it('should filter orders by status', async () => {
      const mockOrders = [{ id: 'order-1', status: OrderStatus.DELIVERED }];

      mockPrismaService.order.count.mockResolvedValue(1);
      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

      const result = await service.findAll(
        {
          sub: 'user-123',
          email: 'admin@example.com',
          role: UserRole.ADMIN,
          tenantId: 'tenant-123',
        },
        { page: 1, limit: 10, status: OrderStatus.DELIVERED },
      );

      expect(result.data).toEqual(mockOrders);
      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: OrderStatus.DELIVERED,
          }),
        }),
      );
    });
  });

  describe('assignOrder', () => {
    it('should assign order to courier successfully', async () => {
      const assignOrderDto: AssignOrderDto = {
        courierId: 'courier-123',
      };

      const mockOrder = { id: 'order-123', status: OrderStatus.CREATED };
      const mockCourier = { id: 'courier-123', tenantId: 'tenant-123' };
      const mockUpdatedOrder = { ...mockOrder, status: OrderStatus.ASSIGNED };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.courierProfile.findUnique.mockResolvedValue(mockCourier);
      mockPrismaService.order.update.mockResolvedValue(mockUpdatedOrder);

      const result = await service.assignOrder('order-123', assignOrderDto, {
        sub: 'admin-user',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
        tenantId: 'tenant-123',
      });

      expect(result.status).toBe(OrderStatus.ASSIGNED);
    });

    it('should throw ForbiddenException if user is not admin', async () => {
      const assignOrderDto: AssignOrderDto = {
        courierId: 'courier-123',
      };

      await expect(
        service.assignOrder('order-123', assignOrderDto, {
          sub: 'merchant-user',
          email: 'merchant@example.com',
          role: UserRole.MERCHANT,
          tenantId: 'tenant-123',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if courier not found', async () => {
      const assignOrderDto: AssignOrderDto = {
        courierId: 'courier-123',
      };

      const mockOrder = { id: 'order-123', status: OrderStatus.CREATED };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.courierProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.assignOrder('order-123', assignOrderDto, {
          sub: 'admin-user',
          email: 'admin@example.com',
          role: UserRole.ADMIN,
          tenantId: 'tenant-123',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if courier belongs to different tenant', async () => {
      const assignOrderDto: AssignOrderDto = {
        courierId: 'courier-123',
      };

      const mockOrder = { id: 'order-123', status: OrderStatus.CREATED };
      const mockCourier = { id: 'courier-123', tenantId: 'different-tenant' };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.courierProfile.findUnique.mockResolvedValue(mockCourier);

      await expect(
        service.assignOrder('order-123', assignOrderDto, {
          sub: 'admin-user',
          email: 'admin@example.com',
          role: UserRole.ADMIN,
          tenantId: 'tenant-123',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateStatus', () => {
    it('should update order status successfully', async () => {
      const updateOrderStatusDto: UpdateOrderStatusDto = {
        status: OrderStatus.PICKED_UP,
      };

      const mockOrder = { id: 'order-123', status: OrderStatus.ASSIGNED };
      const mockUpdatedOrder = { ...mockOrder, status: OrderStatus.PICKED_UP };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.order.update.mockResolvedValue(mockUpdatedOrder);

      const result = await service.updateStatus('order-123', updateOrderStatusDto, {
        sub: 'user-123',
        email: 'user@example.com',
        role: UserRole.COURIER,
        tenantId: 'tenant-123',
      });

      expect(result.status).toBe(OrderStatus.PICKED_UP);
    });

    it('should update merchant balance when order is delivered', async () => {
      const updateOrderStatusDto: UpdateOrderStatusDto = {
        status: OrderStatus.DELIVERED,
      };

      const mockOrder = {
        id: 'order-123',
        status: OrderStatus.IN_TRANSIT,
        merchantId: 'merchant-123',
        courierId: 'courier-123',
        codAmount: 100,
        price: 10,
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.DELIVERED,
      });

      await service.updateStatus('order-123', updateOrderStatusDto, {
        sub: 'user-123',
        email: 'user@example.com',
        role: UserRole.COURIER,
        tenantId: 'tenant-123',
      });

      expect(mockPrismaService.merchantProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'merchant-123' },
          data: expect.objectContaining({
            balance: expect.objectContaining({
              increment: 90,
            }),
          }),
        }),
      );
    });
  });
});
