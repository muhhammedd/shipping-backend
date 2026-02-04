import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../../core/prisma.service';
import { ExportService } from '../../../common/services/export.service';
import { AccessTokenGuard } from '../../iam/authentication/guards/access-token.guard';
import { RolesGuard } from '../../iam/authorization/guards/roles.guard';
import { Roles } from '../../iam/authorization/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Admin - Reports')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/reports')
export class ReportsAdminController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly exportService: ExportService,
    ) { }

    @Get('orders/export')
    @ApiOperation({ summary: 'Export orders to CSV' })
    async exportOrders(
        @Res() res: Response,
        @Query('status') status?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const where: any = {};
        if (status) where.status = status;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        const orders = await this.prisma.order.findMany({
            where,
            include: {
                merchant: { select: { companyName: true } },
                courier: { select: { user: { select: { email: true } } } },
            },
            orderBy: { createdAt: 'desc' },
        }) as any[];

        const data = orders.map(o => ({
            id: o.id,
            trackingNumber: o.trackingNumber,
            merchant: o.merchant?.companyName || 'N/A',
            recipient: o.recipientName,
            phone: o.recipientPhone,
            city: o.city,
            status: o.status,
            price: o.price.toString(),
            codAmount: o.codAmount.toString(),
            courier: o.courier?.user?.email || 'N/A',
            createdAt: o.createdAt.toISOString(),
        }));

        const csv = this.exportService.generateCsv(data, {
            id: 'ID',
            trackingNumber: 'Tracking Number',
            merchant: 'Merchant',
            recipient: 'Recipient Name',
            phone: 'Phone',
            city: 'City',
            status: 'Status',
            price: 'Price',
            codAmount: 'COD Amount',
            courier: 'Courier',
            createdAt: 'Date',
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=orders_export.csv');
        return res.send(csv);
    }

    @Get('transactions/export')
    @ApiOperation({ summary: 'Export transactions to CSV' })
    async exportTransactions(@Res() res: Response) {
        const transactions = await this.prisma.transaction.findMany({
            include: {
                merchant: { select: { companyName: true } },
            },
            orderBy: { createdAt: 'desc' },
        }) as any[];

        const data = transactions.map(t => ({
            id: t.id,
            merchant: t.merchant?.companyName || 'System',
            amount: t.amount.toString(),
            type: t.type,
            refType: t.referenceType,
            description: t.description || '',
            createdAt: t.createdAt.toISOString(),
        }));

        const csv = this.exportService.generateCsv(data, {
            id: 'ID',
            merchant: 'Merchant',
            amount: 'Amount',
            type: 'Type',
            refType: 'Reference Type',
            description: 'Description',
            createdAt: 'Date',
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=transactions_export.csv');
        return res.send(csv);
    }

    @Get('tenants/export')
    @ApiOperation({ summary: 'Export tenants to CSV' })
    async exportTenants(@Res() res: Response) {
        const tenants = await this.prisma.tenant.findMany({
            include: {
                _count: {
                    select: { orders: true, merchants: true, users: true }
                }
            }
        }) as any[];

        const data = tenants.map(t => ({
            id: t.id,
            name: t.name,
            slug: t.slug,
            orders: t._count.orders,
            merchants: t._count.merchants,
            users: t._count.users,
            createdAt: t.createdAt.toISOString(),
        }));

        const csv = this.exportService.generateCsv(data, {
            id: 'ID',
            name: 'Name',
            slug: 'Slug',
            orders: 'Total Orders',
            merchants: 'Merchants',
            users: 'Users',
            createdAt: 'Created At',
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=tenants_export.csv');
        return res.send(csv);
    }
}
