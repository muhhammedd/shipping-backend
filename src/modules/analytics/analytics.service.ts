import { Injectable } from '@nestjs/common';
import { PrismaService } from '../core/prisma.service';
import { OrderStatus, UserRole } from '@prisma/client';
import { startOfMonth, subMonths, endOfMonth, format } from 'date-fns';

@Injectable()
export class AnalyticsService {
    constructor(private readonly prisma: PrismaService) { }

    async getAdminSummary(tenantId: string) {
        const [
            totalOrders,
            deliveredOrders,
            cancelledOrders,
            totalRevenue,
            activeMerchants,
            activeCouriers,
            activeTenants,
            pendingPayouts,
            totalCodCollection
        ] = await Promise.all([
            this.prisma.order.count({ where: { tenantId } }),
            this.prisma.order.count({ where: { tenantId, status: OrderStatus.DELIVERED } }),
            this.prisma.order.count({ where: { tenantId, status: OrderStatus.CANCELLED } }),
            this.prisma.order.aggregate({
                where: { tenantId, status: OrderStatus.DELIVERED },
                _sum: { price: true },
            }),
            this.prisma.user.count({ where: { tenantId, role: UserRole.MERCHANT, isActive: true } }),
            this.prisma.user.count({ where: { tenantId, role: UserRole.COURIER, isActive: true } }),
            this.prisma.tenant.count({ where: { status: 'ACTIVE' } }),
            this.prisma.payout.count({ where: { status: 'PENDING' } }),
            this.prisma.transaction.aggregate({
                where: { referenceType: 'COD_COLLECTION' },
                _sum: { amount: true }
            })
        ]);

        // Trend calculation (Current month vs Previous month)
        const currentMonthStart = startOfMonth(new Date());
        const lastMonthStart = startOfMonth(subMonths(new Date(), 1));

        const [currentMonthOrders, lastMonthOrders] = await Promise.all([
            this.prisma.order.count({ where: { tenantId, createdAt: { gte: currentMonthStart } } }),
            this.prisma.order.count({ where: { tenantId, createdAt: { gte: lastMonthStart, lt: currentMonthStart } } }),
        ]);

        let recentTrend = 0;
        if (lastMonthOrders > 0) {
            recentTrend = ((currentMonthOrders - lastMonthOrders) / lastMonthOrders) * 100;
        } else if (currentMonthOrders > 0) {
            recentTrend = 100;
        }

        // Chart Data (Last 6 months)
        const monthlyStats = await this.getMonthlyStats(tenantId, 6);

        // Top Zones (Group by city)
        const topZones = await this.prisma.order.groupBy({
            by: ['city'],
            where: { tenantId },
            _count: { id: true },
            _sum: { price: true },
            orderBy: { _count: { id: 'desc' } },
            take: 5,
        });

        // Top Merchants
        const topMerchantsGrouped = await this.prisma.order.groupBy({
            by: ['merchantId'],
            where: { tenantId },
            _count: { id: true },
            _sum: { price: true },
            orderBy: { _count: { id: 'desc' } },
            take: 5,
        });

        // Fetch merchant names for the IDs
        const merchantDetails = await this.prisma.merchantProfile.findMany({
            where: { id: { in: topMerchantsGrouped.map(m => m.merchantId) } },
            select: { id: true, companyName: true }
        });

        // Top Tenants
        const topTenantsGrouped = await this.prisma.order.groupBy({
            by: ['tenantId'],
            _count: { id: true },
            _sum: { price: true },
            orderBy: { _count: { id: 'desc' } },
            take: 5,
        });

        const tenantDetails = await this.prisma.tenant.findMany({
            where: { id: { in: topTenantsGrouped.map(t => t.tenantId) } },
            select: { id: true, name: true }
        });

        return {
            summary: {
                totalOrders,
                deliveredOrders,
                cancelledOrders,
                totalRevenue: Number(totalRevenue._sum.price || 0),
                activeMerchants,
                activeCouriers,
                activeTenants,
                pendingPayouts,
                totalCodCollection: Number(totalCodCollection._sum.amount || 0),
                recentTrend: Math.round(recentTrend),
            },
            orderVolume: monthlyStats.map(s => ({ date: s.month, value: s.orders })),
            revenueGrowth: monthlyStats.map(s => ({ date: s.month, value: s.revenue })),
            topZones: topZones.map(z => ({
                name: z.city,
                orders: z._count.id,
                revenue: Number(z._sum.price || 0)
            })),
            topMerchants: topMerchantsGrouped.map(m => {
                const detail = merchantDetails.find(d => d.id === m.merchantId);
                return {
                    name: detail?.companyName || 'Unknown',
                    orders: m._count.id,
                    revenue: Number(m._sum.price || 0)
                };
            }),
            topTenants: topTenantsGrouped.map(t => {
                const detail = tenantDetails.find(d => d.id === t.tenantId);
                return {
                    name: detail?.name || 'Unknown',
                    orders: t._count.id,
                    revenue: Number(t._sum.price || 0)
                };
            })
        };
    }

    async getMerchantSummary(merchantId: string, tenantId: string) {
        const [
            totalOrders,
            deliveredOrders,
            cancelledOrders,
            totalRevenue,
            statusCounts,
        ] = await Promise.all([
            this.prisma.order.count({ where: { merchantId, tenantId } }),
            this.prisma.order.count({ where: { merchantId, tenantId, status: OrderStatus.DELIVERED } }),
            this.prisma.order.count({ where: { merchantId, tenantId, status: OrderStatus.CANCELLED } }),
            this.prisma.order.aggregate({
                where: { merchantId, tenantId, status: OrderStatus.DELIVERED },
                _sum: { price: true },
            }),
            this.prisma.order.groupBy({
                by: ['status'],
                where: { merchantId, tenantId },
                _count: { id: true },
            }),
        ]);

        // Trend calculation (Current month vs Previous month)
        const currentMonthStart = startOfMonth(new Date());
        const lastMonthStart = startOfMonth(subMonths(new Date(), 1));

        const [currentMonthOrders, lastMonthOrders] = await Promise.all([
            this.prisma.order.count({ where: { merchantId, tenantId, createdAt: { gte: currentMonthStart } } }),
            this.prisma.order.count({ where: { merchantId, tenantId, createdAt: { gte: lastMonthStart, lt: currentMonthStart } } }),
        ]);

        let recentTrend = 0;
        if (lastMonthOrders > 0) {
            recentTrend = ((currentMonthOrders - lastMonthOrders) / lastMonthOrders) * 100;
        } else if (currentMonthOrders > 0) {
            recentTrend = 100;
        }

        // 6-month data
        const monthlyStats = await this.getMonthlyStatsForMerchant(merchantId, tenantId, 6);

        // Top zones for merchant
        const topZones = await this.prisma.order.groupBy({
            by: ['city'],
            where: { merchantId, tenantId },
            _count: { id: true },
            _sum: { price: true },
            orderBy: { _count: { id: 'desc' } },
            take: 5,
        });

        return {
            summary: {
                totalOrders,
                deliveredOrders,
                cancelledOrders,
                totalRevenue: Number(totalRevenue._sum.price || 0),
                recentTrend: Math.round(recentTrend),
            },
            statusBreakdown: statusCounts.map(s => ({
                status: s.status,
                count: s._count.id
            })),
            orderVolume: monthlyStats.map(s => ({ date: s.month, value: s.orders })),
            revenueGrowth: monthlyStats.map(s => ({ date: s.month, value: s.revenue })),
            topZones: topZones.map(z => ({
                name: z.city,
                orders: z._count.id,
                revenue: Number(z._sum.price || 0)
            })),
        };
    }

    private async getMonthlyStatsForMerchant(merchantId: string, tenantId: string, months: number) {
        const stats: { month: string; orders: number; revenue: number }[] = [];
        for (let i = months - 1; i >= 0; i--) {
            const date = subMonths(new Date(), i);
            const start = startOfMonth(date);
            const end = endOfMonth(date);

            const [orders, revenue] = await Promise.all([
                this.prisma.order.count({
                    where: { merchantId, tenantId, createdAt: { gte: start, lte: end } }
                }),
                this.prisma.order.aggregate({
                    where: { merchantId, tenantId, status: OrderStatus.DELIVERED, createdAt: { gte: start, lte: end } },
                    _sum: { price: true }
                })
            ]);

            stats.push({
                month: format(date, 'MMM'),
                orders,
                revenue: Number(revenue._sum.price || 0)
            });
        }
        return stats;
    }

    private async getMonthlyStats(tenantId: string, months: number) {
        const stats: { month: string; orders: number; revenue: number }[] = [];
        for (let i = months - 1; i >= 0; i--) {
            const date = subMonths(new Date(), i);
            const start = startOfMonth(date);
            const end = endOfMonth(date);

            const [orders, revenue] = await Promise.all([
                this.prisma.order.count({
                    where: { tenantId, createdAt: { gte: start, lte: end } }
                }),
                this.prisma.order.aggregate({
                    where: { tenantId, status: OrderStatus.DELIVERED, createdAt: { gte: start, lte: end } },
                    _sum: { price: true }
                })
            ]);

            stats.push({
                month: format(date, 'MMM'),
                orders,
                revenue: Number(revenue._sum.price || 0)
            });
        }
        return stats;
    }
}
