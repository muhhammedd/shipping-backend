import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../core/prisma.service';
import { OrderStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate merchant balance based on completed orders
   * Formula: Total COD Collected - Shipping Fees = Merchant Payout
   */
  async calculateMerchantBalance(merchantId: string, tenantId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const orders = await (this.prisma as any).order.findMany({
      where: {
        merchantId,
        tenantId,
        status: OrderStatus.DELIVERED,
      },
      select: {
        price: true,
        codAmount: true,
      },
    });

    let totalCOD = new Decimal(0);
    let totalFees = new Decimal(0);

    for (const order of orders) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      totalCOD = totalCOD.plus(new Decimal(order.codAmount));
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      totalFees = totalFees.plus(new Decimal(order.price));
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return totalCOD.minus(totalFees);
  }

  /**
   * Update merchant balance after order delivery
   */
  async updateMerchantBalanceOnDelivery(orderId: string, tenantId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const order = await (this.prisma as any).order.findUnique({
      where: { id: orderId },
      select: {
        merchantId: true,
        price: true,
        codAmount: true,
      },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    // Calculate the balance change for this order
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const balanceChange = new Decimal(order.codAmount).minus(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      new Decimal(order.price),
    );

    // Update merchant profile balance
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return await (this.prisma as any).merchantProfile.update({
      where: { id: order.merchantId },
      data: {
        balance: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          increment: balanceChange,
        },
      },
    });
  }

  /**
   * Update courier wallet after order delivery
   */
  async updateCourierWalletOnDelivery(courierId: string, codAmount: number) {
    if (!courierId) {
      throw new BadRequestException('Courier ID is required');
    }

    // Update courier wallet with COD amount
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return await (this.prisma as any).courierProfile.update({
      where: { id: courierId },
      data: {
        wallet: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          increment: new Decimal(codAmount),
        },
      },
    });
  }

  /**
   * Get merchant balance
   */
  async getMerchantBalance(merchantId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const merchant = await (this.prisma as any).merchantProfile.findUnique({
      where: { id: merchantId },
      select: { balance: true },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return merchant?.balance || new Decimal(0);
  }

  /**
   * Get courier wallet
   */
  async getCourierWallet(courierId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const courier = await (this.prisma as any).courierProfile.findUnique({
      where: { id: courierId },
      select: { wallet: true },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return courier?.wallet || new Decimal(0);
  }

  /**
   * Deduct courier wallet (when payout is made)
   */
  async deductCourierWallet(courierId: string, amount: number) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const courier = await (this.prisma as any).courierProfile.findUnique({
      where: { id: courierId },
      select: { wallet: true },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (courier.wallet < amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return await (this.prisma as any).courierProfile.update({
      where: { id: courierId },
      data: {
        wallet: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          decrement: new Decimal(amount),
        },
      },
    });
  }
}
