import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../modules/core/prisma.service';

export interface AuditLogData {
    tenantId: string;
    userId?: string;
    action: string;
    entityType: string;
    entityId: string;
    oldValue?: any;
    newValue?: any;
    ipAddress?: string;
    userAgent?: string;
}

import { paginate, PaginationResult } from '../../common/utils/pagination.util';

/**
 * Audit Log Service
 * Tracks all important system actions for compliance and debugging
 */
@Injectable()
export class AuditLogService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Create an audit log entry
     */
    async log(data: AuditLogData) {
        try {
            return await this.prisma.auditLog.create({
                data: {
                    tenantId: data.tenantId,
                    userId: data.userId,
                    action: data.action,
                    entityType: data.entityType,
                    entityId: data.entityId,
                    oldValue: data.oldValue,
                    newValue: data.newValue,
                    ipAddress: data.ipAddress,
                    userAgent: data.userAgent,
                },
            });
        } catch (error) {
            // Don't fail the main operation if audit logging fails
            console.error('Failed to create audit log:', error);
        }
    }

    /**
     * Log order creation
     */
    async logOrderCreated(orderId: string, orderData: any, userId: string, tenantId: string) {
        return this.log({
            tenantId,
            userId,
            action: 'ORDER_CREATED',
            entityType: 'Order',
            entityId: orderId,
            newValue: orderData,
        });
    }

    /**
     * Log order status update
     */
    async logOrderStatusUpdate(
        orderId: string,
        oldStatus: string,
        newStatus: string,
        userId: string,
        tenantId: string,
    ) {
        return this.log({
            tenantId,
            userId,
            action: 'ORDER_STATUS_UPDATED',
            entityType: 'Order',
            entityId: orderId,
            oldValue: { status: oldStatus },
            newValue: { status: newStatus },
        });
    }

    /**
     * Log user login
     */
    async logUserLogin(userId: string, tenantId: string, ipAddress?: string, userAgent?: string) {
        return this.log({
            tenantId,
            userId,
            action: 'USER_LOGIN',
            entityType: 'User',
            entityId: userId,
            ipAddress,
            userAgent,
        });
    }

    /**
     * Log tenant configuration change
     */
    async logTenantConfigChange(
        tenantId: string,
        configKey: string,
        oldValue: any,
        newValue: any,
        userId: string,
    ) {
        return this.log({
            tenantId,
            userId,
            action: 'TENANT_CONFIG_UPDATED',
            entityType: 'Tenant',
            entityId: tenantId,
            oldValue: { [configKey]: oldValue },
            newValue: { [configKey]: newValue },
        });
    }

    /**
     * Get audit logs for an entity with pagination
     */
    async getEntityLogs(entityType: string, entityId: string, tenantId: string, page = 1, limit = 50): Promise<PaginationResult<any>> {
        return paginate(
            this.prisma.auditLog,
            {
                where: {
                    tenantId,
                    entityType,
                    entityId,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            },
            page,
            limit,
        );
    }

    /**
     * Get audit logs for a user with pagination
     */
    async getUserLogs(userId: string, tenantId: string, page = 1, limit = 50): Promise<PaginationResult<any>> {
        return paginate(
            this.prisma.auditLog,
            {
                where: {
                    tenantId,
                    userId,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            },
            page,
            limit,
        );
    }

    /**
     * Get audit logs for a tenant with pagination
     */
    async getTenantLogs(
        tenantId: string,
        page = 1,
        limit = 50,
        filters?: {
            action?: string;
            entityType?: string;
            userId?: string;
            startDate?: Date;
            endDate?: Date;
        },
    ): Promise<PaginationResult<any>> {
        const where: any = {
            tenantId,
        };

        if (filters?.action) {
            where.action = filters.action;
        }

        if (filters?.entityType) {
            where.entityType = filters.entityType;
        }

        if (filters?.userId) {
            where.userId = filters.userId;
        }

        if (filters?.startDate || filters?.endDate) {
            where.createdAt = {};
            if (filters.startDate) {
                where.createdAt.gte = filters.startDate;
            }
            if (filters.endDate) {
                where.createdAt.lte = filters.endDate;
            }
        }

        return paginate(
            this.prisma.auditLog,
            {
                where,
                orderBy: {
                    createdAt: 'desc',
                },
            },
            page,
            limit,
        );
    }

    /**
     * Get audit log statistics
     */
    async getStats(tenantId: string, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const logs = await this.prisma.auditLog.findMany({
            where: {
                tenantId,
                createdAt: {
                    gte: startDate,
                },
            },
            select: {
                action: true,
                userId: true,
                createdAt: true,
            },
        });

        // Group by action
        const actionCounts = logs.reduce(
            (acc, log) => {
                acc[log.action] = (acc[log.action] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>,
        );

        // Group by user
        const userCounts = logs.reduce(
            (acc, log) => {
                if (log.userId) {
                    acc[log.userId] = (acc[log.userId] || 0) + 1;
                }
                return acc;
            },
            {} as Record<string, number>,
        );

        return {
            totalLogs: logs.length,
            actionCounts,
            userCounts,
            mostActiveUsers: Object.entries(userCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([userId, count]) => ({ userId, count })),
        };
    }
}
