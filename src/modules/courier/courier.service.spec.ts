import { Test, TestingModule } from '@nestjs/testing';
import { CourierService } from './services/courier.service';
import { PrismaService } from '../core/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { TestFactories } from '../../../test/factories';

describe('CourierService', () => {
    let service: CourierService;
    let prisma: PrismaService;

    const mockPrismaService = {
        courierProfile: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        order: {
            findMany: jest.fn(),
        },
        transaction: {
            findMany: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CourierService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<CourierService>(CourierService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getProfile', () => {
        it('should return courier profile if found', async () => {
            const mockCourier = TestFactories.createCourierProfile();
            (mockPrismaService.courierProfile.findUnique as jest.Mock).mockResolvedValue(mockCourier);

            const result = await service.getProfile('user-123');

            expect(result).toEqual(mockCourier);
            expect(mockPrismaService.courierProfile.findUnique).toHaveBeenCalledWith({
                where: { userId: 'user-123' },
                include: { user: { select: { firstName: true, lastName: true, email: true } } },
            });
        });

        it('should throw NotFoundException if courier profile not found', async () => {
            (mockPrismaService.courierProfile.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(service.getProfile('user-123')).rejects.toThrow(NotFoundException);
        });
    });

    describe('updateStatus', () => {
        it('should update courier status', async () => {
            const mockCourier = TestFactories.createCourierProfile({ id: 'courier-123' });
            jest.spyOn(service, 'getProfile').mockResolvedValue(mockCourier as any);
            (mockPrismaService.courierProfile.update as jest.Mock).mockResolvedValue({ ...mockCourier, status: 'BUSY' });

            const result = await service.updateStatus('user-123', 'BUSY' as any, true);

            expect((result as any).status).toBe('BUSY');
            expect(mockPrismaService.courierProfile.update).toHaveBeenCalled();
        });
    });

    describe('getAssignments', () => {
        it('should return assigned orders', async () => {
            const mockCourier = TestFactories.createCourierProfile({ id: 'courier-123' });
            const mockOrders = [TestFactories.createOrder(), TestFactories.createOrder()];
            jest.spyOn(service, 'getProfile').mockResolvedValue(mockCourier as any);
            (mockPrismaService.order.findMany as jest.Mock).mockResolvedValue(mockOrders);

            const result = await service.getAssignments('user-123');

            expect(result).toEqual(mockOrders);
            expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({ courierId: 'courier-123' }),
            }));
        });
    });
});
