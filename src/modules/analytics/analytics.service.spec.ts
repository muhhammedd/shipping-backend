import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../core/prisma.service';
import { OrderStatus } from '@prisma/client';

describe('AnalyticsService', () => {
    let service: AnalyticsService;
    let prisma: PrismaService;

    const mockPrisma = {
        order: {
            count: jest.fn(),
            aggregate: jest.fn(),
            groupBy: jest.fn(),
        },
        merchantProfile: {
            findMany: jest.fn(),
        },
        user: {
            count: jest.fn(),
        },
        $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticsService,
                { provide: PrismaService, useValue: mockPrisma },
            ],
        }).compile();

        service = module.get<AnalyticsService>(AnalyticsService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    describe('getMerchantSummary', () => {
        it('should return rich merchant summary data', async () => {
            mockPrisma.order.count.mockResolvedValue(10);
            mockPrisma.order.aggregate.mockResolvedValue({ _sum: { price: new Decimal(5000) } });
            mockPrisma.order.groupBy.mockResolvedValue([
                { status: OrderStatus.DELIVERED, _count: { id: 8 } },
                { status: OrderStatus.CANCELLED, _count: { id: 2 } },
            ]);

            // Mock for monthly stats and top zones
            mockPrisma.order.count.mockResolvedValue(10);
            mockPrisma.order.aggregate.mockResolvedValue({ _sum: { price: new Decimal(5000) } });

            const result = await service.getMerchantSummary('merchant-1', 'tenant-1');

            expect(result.summary.totalOrders).toBeDefined();
            expect(result.summary.totalRevenue).toBe(5000);
            expect(result.statusBreakdown).toBeDefined();
        });
    });
});
