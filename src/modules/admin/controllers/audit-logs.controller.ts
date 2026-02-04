import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AuditLogService } from '../../../common/services/audit-log.service';
import { ActiveUser } from '../../../common/decorators/active-user.decorator';
import { Roles } from '../../iam/authorization/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import type { ActiveUserData } from '../../../common/interfaces/active-user-data.interface';

@ApiTags('Admin - Audit Logs')
@Controller('admin/audit-logs')
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AuditLogsController {
    constructor(private readonly auditLogService: AuditLogService) { }

    @Get()
    @ApiOperation({ summary: 'Get audit logs with filtering and pagination' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'action', required: false, type: String })
    @ApiQuery({ name: 'entityType', required: false, type: String })
    @ApiQuery({ name: 'userId', required: false, type: String })
    @ApiQuery({ name: 'startDate', required: false, type: String })
    @ApiQuery({ name: 'endDate', required: false, type: String })
    @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
    async findAll(
        @ActiveUser() user: ActiveUserData,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('action') action?: string,
        @Query('entityType') entityType?: string,
        @Query('userId') userId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.auditLogService.getTenantLogs(
            user.tenantId,
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 50,
            {
                action,
                entityType,
                userId,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
            },
        );
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get audit log statistics' })
    @ApiQuery({ name: 'days', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
    async getStats(@ActiveUser() user: ActiveUserData, @Query('days') days?: string) {
        return this.auditLogService.getStats(user.tenantId, days ? parseInt(days) : 30);
    }

    @Get('entity/:entityType/:entityId')
    @ApiOperation({ summary: 'Get audit logs for a specific entity' })
    @ApiResponse({ status: 200, description: 'Entity audit logs retrieved' })
    async getEntityLogs(
        @Param('entityType') entityType: string,
        @Param('entityId') entityId: string,
        @ActiveUser() user: ActiveUserData,
    ) {
        return this.auditLogService.getEntityLogs(entityType, entityId, user.tenantId);
    }

    @Get('user/:userId')
    @ApiOperation({ summary: 'Get audit logs for a specific user' })
    @ApiResponse({ status: 200, description: 'User audit logs retrieved' })
    async getUserLogs(@Param('userId') userId: string, @ActiveUser() user: ActiveUserData) {
        return this.auditLogService.getUserLogs(userId, user.tenantId);
    }
}
