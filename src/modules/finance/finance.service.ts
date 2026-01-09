import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../core/prisma.service';
import { OrderStatus } from '@prisma/client';
import Decimal from 'decimal.js';

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate merchant balance based on completed orders
   * Formula: Total COD Collected - Shipping Fees = Merchant Payout
   */
  async calculateMerchantBalance(merchantId: string, tenantId: string) {
    const orders = await this.prisma.order.findMany({
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
      totalCOD = totalCOD.plus(order.codAmount.toString());
      totalFees = totalFees.plus(order.price.toString());
    }

    return totalCOD.minus(totalFees);
  }

  /**
   * Update merchant balance after order delivery
   */
  async updateMerchantBalanceOnDelivery(orderId: string, _tenantId: string) {
    const order = await this.prisma.order.findUnique({
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
    const balanceChange = order.codAmount.minus(order.price);

    // Update merchant profile balance
    return await this.prisma.merchantProfile.update({
      where: { id: order.merchantId },
      data: {
        balance: {
          increment: balanceChange as any,
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
    return await this.prisma.courierProfile.update({
      where: { id: courierId },
      data: {
        wallet: {
          increment: new Decimal(codAmount) as any,
        },
      },
    });
  }

  /**
   * Get merchant balance
   */
  async getMerchantBalance(merchantId: string) {
    const merchant = await this.prisma.merchantProfile.findUnique({
      where: { id: merchantId },
      select: { balance: true },
    });

    return merchant?.balance || new Decimal(0);
  }

  /**
   * Get courier wallet
   */
  async getCourierWallet(courierId: string) {
    const courier = await this.prisma.courierProfile.findUnique({
      where: { id: courierId },
      select: { wallet: true },
    });

    return courier?.wallet || new Decimal(0);
  }

  /**
   * Deduct courier wallet (when payout is made)
   */
  async deductCourierWallet(courierId: string, amount: number) {
    const courier = await this.prisma.courierProfile.findUnique({
      where: { id: courierId },
      select: { wallet: true },
    });

    if (!courier) {
      throw new BadRequestException('Courier not found');
    }

    if (new Decimal(courier.wallet.toString()).lessThan(new Decimal(amount))) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    return await this.prisma.courierProfile.update({
      where: { id: courierId },
      data: {
        wallet: {
          decrement: new Decimal(amount) as any,
        },
      },
    });
  }
}
