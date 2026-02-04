import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../core/prisma.service';
import { Roles } from '../../iam/authorization/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AccessTokenGuard } from '../../iam/authentication/guards/access-token.guard';
import { RolesGuard } from '../../iam/authorization/guards/roles.guard';

@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/config')
export class ConfigAdminController {
    constructor(private readonly prisma: PrismaService) { }

    @Get('global')
    async getGlobalConfig() {
        // This could read from a dedicated SystemConfig model or environment
        return {
            platformFees: 0.15,
            payoutThreshold: 100,
            maintenanceMode: false,
            supportEmail: 'support@shipex.com'
        };
    }

    @Put('global')
    async updateGlobalConfig(@Body() config: any) {
        // Logic to persist global settings
        return { success: true, updatedConfig: config };
    }
}
