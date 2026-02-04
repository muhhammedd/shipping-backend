import { Test, TestingModule } from '@nestjs/testing';
import { PricingService } from './pricing.service';
import { PrismaService } from '../core/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

describe('PricingService', () => {
    let service: PricingService;
    let prisma: PrismaService;

    const mockPrismaService = {
        pricingRule: {
            findMany: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        shippingZone: {
            findFirst: jest.fn(),
            findMany: jest.fn(),
        },
        serviceType: {
            findFirst: jest.fn(),
            findMany: jest.fn(),
        }
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PricingService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<PricingService>(PricingService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('calculateRate', () => {
        it('should calculate standard rate correctly', async () => {
            const tenantId = 'tenant-1';
            const dto = {
                origin: { city: 'Cairo' },
                destination: { city: 'Alexandria' },
                weight: 2,
                serviceType: 'STANDARD'
            };

            const mockZone = {
                name: 'Delta',
                pricingRules: [{
                    basePrice: new Decimal(50),
                    additionalKgPrice: new Decimal(10),
                    codFee: new Decimal(5),
                }]
            };

            const mockServiceType = {
                code: 'STANDARD',
                priceMultiplier: new Decimal(1.0),
                deliveryDays: 2
            };

            // Setup mocks
            jest.spyOn(service, 'resolveZoneForCity').mockResolvedValue('Delta');
            (mockPrismaService.shippingZone.findFirst as jest.Mock).mockResolvedValue(mockZone);
            (mockPrismaService.serviceType.findFirst as jest.Mock).mockResolvedValue(mockServiceType);

            const result = await service.calculateRate(tenantId, dto as any);

            // Calculation:
            // baseRate = 50 + (2-1)*10 = 60
            // serviceCharge = 60 * 1.0 - 60 = 0
            // codFee = 0 (since codAmount not provided)
            // total = 60
            expect(result.totalCost).toBe(60);
            expect(result.baseRate).toBe(60);
        });

        it('should apply service multiplier and COD fee', async () => {
            const tenantId = 'tenant-1';
            const dto = {
                origin: { city: 'Cairo' },
                destination: { city: 'Alexandria' },
                weight: 1,
                serviceType: 'EXPRESS',
                codAmount: 100
            };

            const mockZone = {
                pricingRules: [{
                    basePrice: new Decimal(50),
                    additionalKgPrice: new Decimal(10),
                    codFee: new Decimal(5),
                }]
            };

            const mockServiceType = {
                code: 'EXPRESS',
                priceMultiplier: new Decimal(1.5),
                deliveryDays: 1
            };

            jest.spyOn(service, 'resolveZoneForCity').mockResolvedValue('Delta');
            (mockPrismaService.shippingZone.findFirst as jest.Mock).mockResolvedValue(mockZone);
            (mockPrismaService.serviceType.findFirst as jest.Mock).mockResolvedValue(mockServiceType);

            const result = await service.calculateRate(tenantId, dto as any);

            // Calculation:
            // baseRate = 50 (weight=1)
            // serviceCharge = 50 * 1.5 - 50 = 25
            // codFee = 5
            // total = 50 + 25 + 5 = 80
            expect(result.totalCost).toBe(80);
            expect(result.serviceCharge).toBe(25);
            expect(result.codFee).toBe(5);
        });

        it('should throw NotFoundException if zone not resolved', async () => {
            jest.spyOn(service, 'resolveZoneForCity').mockResolvedValue(null);

            await expect(service.calculateRate('tenant-1', {
                origin: { city: 'Unknown' },
                destination: { city: 'Cairo' }
            } as any)).rejects.toThrow(NotFoundException);
        });
    });

    describe('resolveZoneForCity', () => {
        it('should return zone name if city matches', async () => {
            (mockPrismaService.shippingZone.findFirst as jest.Mock).mockResolvedValue({ name: 'Cairo-Zone' });

            const result = await service.resolveZoneForCity('tenant-1', 'Cairo');

            expect(result).toBe('Cairo-Zone');
            expect(mockPrismaService.shippingZone.findFirst).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({ cities: { has: 'Cairo' } })
            }));
        });
    });

});
