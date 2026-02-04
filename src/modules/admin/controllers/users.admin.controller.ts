import { Controller, Get, Put, Body, Param, UseGuards, Query, ParseIntPipe, Patch } from '@nestjs/common';
import { PrismaService } from '../../core/prisma.service';
import { Roles } from '../../iam/authorization/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AccessTokenGuard } from '../../iam/authentication/guards/access-token.guard';
import { RolesGuard } from '../../iam/authorization/guards/roles.guard';

@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/users')
export class UsersAdminController {
    constructor(private readonly prisma: PrismaService) { }

    @Get()
    async listAllUsers(
        @Query('page', new ParseIntPipe({ optional: true })) page = 1,
        @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
        @Query('role') role?: UserRole,
    ) {
        const skip = (page - 1) * limit;
        const where = role ? { role } : {};

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { tenant: { select: { name: true } } }
            }),
            this.prisma.user.count({ where }),
        ]);

        return { users, total, page, limit };
    }

    @Patch(':id/status')
    async toggleUserStatus(
        @Param('id') id: string,
        @Body('isActive') isActive: boolean,
    ) {
        return this.prisma.user.update({
            where: { id },
            data: { isActive },
        });
    }

    @Patch(':id/role')
    async updateUserRole(
        @Param('id') id: string,
        @Body('role') role: UserRole,
    ) {
        return this.prisma.user.update({
            where: { id },
            data: { role },
        });
    }
}
