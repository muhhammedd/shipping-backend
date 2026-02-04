import { Test, TestingModule } from '@nestjs/testing';
import { FinanceService } from './finance.service';
import { PrismaService } from '../core/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { TransactionType, PayoutStatus, OrderStatus } from '@prisma/client';

describe('FinanceService', () => {
    let service: FinanceService;
    let prisma: PrismaService;

    const mockPrismaService = {
        $transaction: jest.fn((callback) => callback(mockPrismaService)),
        transaction: {
            create: jest.fn(),
            findMany: jest.fn(),
        },
        merchantProfile: {
            update: jest.fn(),
            findUnique: jest.fn(),
        },
        payout: {
            create: jest.fn(),
            update: jest.fn(),
            findUnique: jest.fn(),
        },
        order: {
            findUnique: jest.fn(),
        },
        reconciliation: {
            create: jest.fn(),
        }
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FinanceService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<FinanceService>(FinanceService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('deposit', () => {
        it('should create a credit transaction and increment balance', async () => {
            const amount = new Decimal(100);
            const tenantId = 'tenant-1';
            const merchantId = 'merchant-1';

            await service.deposit(tenantId, merchantId, amount, 'ORDER_REVENUE', 'order-1');

            expect(mockPrismaService.transaction.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    amount,
                    type: TransactionType.CREDIT,
                }),
            });
            expect(mockPrismaService.merchantProfile.update).toHaveBeenCalledWith({
                where: { id: merchantId },
                data: { balance: { increment: amount } },
            });
        });
    });

    describe('withdraw', () => {
        it('should throw BadRequestException if insufficient funds', async () => {
            const amount = new Decimal(100);
            (mockPrismaService.merchantProfile.findUnique as jest.Mock).mockResolvedValue({
                balance: new Decimal(50),
                creditLimit: new Decimal(10),
            });

            await expect(service.withdraw('tenant-1', 'merchant-1', amount, 'PAYOUT', '1')).rejects.toThrow(BadRequestException);
        });

        it('should decrement balance if funds sufficient', async () => {
            const amount = new Decimal(50);
            (mockPrismaService.merchantProfile.findUnique as jest.Mock).mockResolvedValue({
                balance: new Decimal(100),
                creditLimit: new Decimal(0),
            });

            await service.withdraw('tenant-1', 'merchant-1', amount, 'PAYOUT', '1');

            expect(mockPrismaService.merchantProfile.update).toHaveBeenCalledWith({
                where: { id: 'merchant-1' },
                data: { balance: { decrement: amount } },
            });
        });
    });

    describe('createPayoutRequest', () => {
        it('should withdraw funds and create a pending payout', async () => {
            jest.spyOn(service, 'withdraw').mockResolvedValue({} as any);
            (mockPrismaService.payout.create as jest.Mock).mockResolvedValue({ id: 'payout-1' });

            const result = await service.createPayoutRequest('tenant-1', 'merchant-1', 100, 'BANK_TRANSFER');

            expect(service.withdraw).toHaveBeenCalled();
            expect(mockPrismaService.payout.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    status: PayoutStatus.PENDING,
                    amount: new Decimal(100),
                })
            }));
        });
    });
});
