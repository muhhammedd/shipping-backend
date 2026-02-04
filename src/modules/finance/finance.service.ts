import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../core/prisma.service';
import { OrderStatus, TransactionType, PayoutStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { paginate, PaginationResult } from '../../common/utils/pagination.util';

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Deposit funds into a merchant's wallet (Atomic Transaction)
   */
  async deposit(
    tenantId: string,
    merchantId: string,
    amount: number | Decimal,
    referenceType: string,
    referenceId: string,
    description?: string,
  ) {
    const depositAmount = new Decimal(amount);

    return await this.prisma.$transaction(async (tx) => {
      // 1. Create Transaction Record
      const transaction = await tx.transaction.create({
        data: {
          tenantId,
          merchantId,
          amount: depositAmount,
          type: TransactionType.CREDIT,
          referenceType,
          referenceId,
          description,
        },
      });

      // 2. Update Merchant Balance
      await tx.merchantProfile.update({
        where: { id: merchantId },
        data: {
          balance: { increment: depositAmount },
        },
      });

      return transaction;
    });
  }

  /**
   * Withdraw funds from a merchant's wallet (Atomic Transaction)
   */
  async withdraw(
    tenantId: string,
    merchantId: string,
    amount: number | Decimal,
    referenceType: string,
    referenceId: string,
    description?: string,
  ) {
    const withdrawAmount = new Decimal(amount);

    return await this.prisma.$transaction(async (tx) => {
      // 1. Check Balance
      const merchant = await tx.merchantProfile.findUnique({
        where: { id: merchantId },
      });

      if (!merchant) throw new NotFoundException('Merchant not found');

      const balance = new Decimal(merchant.balance.toString());
      const creditLimit = new Decimal(merchant.creditLimit?.toString() || '0');
      const totalAvailable = balance.plus(creditLimit);

      if (totalAvailable.lessThan(withdrawAmount)) {
        throw new BadRequestException(`Insufficient funds. Available: ${totalAvailable}, Requested: ${withdrawAmount}`);
      }

      // 2. Create Transaction Record
      const transaction = await tx.transaction.create({
        data: {
          tenantId,
          merchantId,
          amount: withdrawAmount,
          type: TransactionType.DEBIT,
          referenceType,
          referenceId,
          description,
        },
      });

      // 3. Update Merchant Balance
      await tx.merchantProfile.update({
        where: { id: merchantId },
        data: {
          balance: { decrement: withdrawAmount },
        },
      });

      return transaction;
    });
  }

  /**
   * Create a Payout Request
   */
  async createPayoutRequest(
    tenantId: string,
    merchantId: string,
    amount: number,
    method: string,
    details?: any,
  ) {
    const payoutAmount = new Decimal(amount);

    // 1. Ensure sufficient funds by "holding" them (Withdraw immediately)
    // In some systems, you hold. Here we deduct immediately for simplicity.
    await this.withdraw(
      tenantId,
      merchantId,
      payoutAmount,
      'PAYOUT_REQUEST',
      'PENDING',
      `Payout request via ${method}`,
    );

    // 2. Create Payout Record
    return await this.prisma.payout.create({
      data: {
        tenantId,
        merchantId,
        amount: payoutAmount,
        status: PayoutStatus.PENDING,
        method,
        details,
      },
    });
  }

  /**
   * Approve a Payout Request
   */
  async approvePayout(payoutId: string, adminUserId: string) {
    return await this.prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: PayoutStatus.APPROVED,
        processedAt: new Date(),
        processedById: adminUserId,
      },
    });
  }

  /**
   * Reject a Payout Request and refund the merchant
   */
  async rejectPayout(payoutId: string, adminUserId: string, reason?: string) {
    return await this.prisma.$transaction(async (tx) => {
      const payout = await tx.payout.findUnique({
        where: { id: payoutId },
      });

      if (!payout) throw new NotFoundException('Payout not found');
      if (payout.status !== PayoutStatus.PENDING) {
        throw new BadRequestException(`Cannot reject payout with status ${payout.status}`);
      }

      // 1. Update Payout Status
      const updatedPayout = await tx.payout.update({
        where: { id: payoutId },
        data: {
          status: PayoutStatus.REJECTED,
          processedAt: new Date(),
          processedById: adminUserId,
          details: reason ? { ...(payout.details as any), rejectionReason: reason } : payout.details as any,
        },
      });

      // 2. Refund to Merchant Wallet
      if (payout.merchantId) {
        await this.deposit(
          payout.tenantId,
          payout.merchantId,
          payout.amount,
          'PAYOUT_REFUND',
          payout.id,
          `Refund for rejected payout: ${reason || 'No reason provided'}`,
        );
      } else if (payout.courierId) {
        // Handle courier refund
        await tx.courierProfile.update({
          where: { id: payout.courierId },
          data: { wallet: { increment: payout.amount } },
        });
      }

      return updatedPayout;
    });
  }

  /**
   * Mark Payout as PAID (Final status)
   */
  async markPayoutAsPaid(payoutId: string, adminUserId: string) {
    return await this.prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: PayoutStatus.PAID,
        processedAt: new Date(),
        processedById: adminUserId,
      },
    });
  }

  /**
   * Update merchant balance after order delivery (Integrated with Transactions)
   */
  async updateMerchantBalanceOnDelivery(orderId: string, tenantId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { merchant: true },
    });

    if (!order) throw new NotFoundException('Order not found');

    // Net Profit = COD - Shipping Cost
    const netProfit = new Decimal(order.codAmount.toString()).minus(new Decimal(order.price.toString()));

    if (netProfit.greaterThan(0)) {
      return await this.deposit(
        tenantId,
        order.merchantId,
        netProfit,
        'ORDER_REVENUE',
        order.id,
        `Revenue from Order ${order.trackingNumber}`,
      );
    } else {
      // If negative (shipping cost > COD), we debit the merchant?
      // Or usually merchant pays shipping upfront?
      // For simplified model, let's assume we deduct the loss.
      return await this.withdraw(
        tenantId,
        order.merchantId,
        netProfit.abs(),
        'ORDER_LOSS',
        order.id,
        `Loss from Order ${order.trackingNumber}`,
      );
    }
  }

  /**
   * Get Transaction History
   */
  async getTransactionHistory(merchantId: string, page = 1, limit = 20): Promise<PaginationResult<any>> {
    return paginate(
      this.prisma.transaction,
      {
        where: { merchantId },
        orderBy: { createdAt: 'desc' },
      },
      page,
      limit,
    );
  }

  /**
   * Get Merchant Balance by User ID
   */
  async getMerchantBalanceByUserId(userId: string) {
    const merchant = await this.prisma.merchantProfile.findUnique({
      where: { userId },
      select: { id: true, balance: true },
    });

    if (!merchant) throw new NotFoundException('Merchant profile not found');
    return { balance: merchant.balance, merchantId: merchant.id };
  }

  /**
   * Get Transactions by User ID
   */
  async getTransactionsByUserId(userId: string, page = 1, limit = 20): Promise<PaginationResult<any>> {
    const merchant = await this.prisma.merchantProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!merchant) throw new NotFoundException('Merchant profile not found');

    return this.getTransactionHistory(merchant.id, page, limit);
  }

  /**
   * Generate Financial Report for a Merchant
   */
  async generateFinancialReport(merchantId: string, startDate?: Date, endDate?: Date) {
    const where: any = { merchantId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const transactions = await this.prisma.transaction.findMany({ where });

    const totalCredit = transactions
      .filter((t: any) => t.type === TransactionType.CREDIT)
      .reduce((sum, t: any) => sum.plus(new Decimal(t.amount.toString())), new Decimal(0));

    const totalDebit = transactions
      .filter((t: any) => t.type === TransactionType.DEBIT)
      .reduce((sum, t: any) => sum.plus(new Decimal(t.amount.toString())), new Decimal(0));

    const revenue = transactions
      .filter((t: any) => t.referenceType === 'ORDER_REVENUE')
      .reduce((sum, t: any) => sum.plus(new Decimal(t.amount.toString())), new Decimal(0));

    const payouts = transactions
      .filter((t: any) => t.referenceType === 'PAYOUT_REQUEST')
      .reduce((sum, t: any) => sum.plus(new Decimal(t.amount.toString())), new Decimal(0));

    return {
      totalCredit,
      totalDebit,
      netBalance: totalCredit.minus(totalDebit),
      revenue,
      payouts,
      transactionCount: transactions.length,
    };
  }

  /**
   * Track COD Collection (Implementation of COD reconciliation)
   */
  async trackCodCollection(tenantId: string, courierId: string, amount: number) {
    return await this.prisma.transaction.create({
      data: {
        tenantId,
        amount: new Decimal(amount),
        type: TransactionType.CREDIT,
        referenceType: 'COD_COLLECTION',
        referenceId: courierId,
        description: `COD collection from courier ${courierId}`,
      },
    });
  }

  /**
   * Perform Reconciliation for a tenant for a specified period
   */
  async performReconciliation(tenantId: string, startDate: Date, endDate: Date) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Get all Delivered Orders in period
      const orders = await tx.order.findMany({
        where: {
          tenantId,
          status: OrderStatus.DELIVERED,
          updatedAt: { gte: startDate, lte: endDate },
        },
      });

      // 2. Get all COD_COLLECTION transactions in period
      const collections = await tx.transaction.findMany({
        where: {
          tenantId,
          referenceType: 'COD_COLLECTION',
          createdAt: { gte: startDate, lte: endDate },
        },
      });

      const totalOrderCod = orders.reduce((sum, o) => sum.plus(new Decimal(o.codAmount.toString())), new Decimal(0));
      const totalCollected = collections.reduce((sum, c) => sum.plus(new Decimal(c.amount.toString())), new Decimal(0));

      // 3. Create Reconciliation Record
      return await tx.reconciliation.create({
        data: {
          tenantId,
          type: 'COD_COLLECTION' as any,
          status: totalOrderCod.equals(totalCollected) ? 'COMPLETED' : 'PENDING',
          totalAmount: totalCollected,
          matchedAmount: totalOrderCod.equals(totalCollected) ? totalCollected : new Decimal(0),
          unmatchedAmount: totalOrderCod.equals(totalCollected) ? new Decimal(0) : totalOrderCod.minus(totalCollected).abs(),
          discrepancies: {
            totalOrderCod: totalOrderCod.toNumber(),
            totalCollected: totalCollected.toNumber(),
            diff: totalOrderCod.minus(totalCollected).toNumber(),
            orderCount: orders.length,
          },
        },
      });
    });
  }
}
