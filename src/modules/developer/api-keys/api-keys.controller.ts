
import { Controller, Post, Get, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { KeyRotationService } from './key-rotation.service';
import { ActiveUser } from '../../../common/decorators/active-user.decorator';
import type { ActiveUserData } from '../../../common/interfaces/active-user-data.interface';
import { Roles } from '../../../modules/iam/authorization/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { RateLimit } from '../../../common/decorators/rate-limit.decorator';

@Controller('developer/api-keys')
export class ApiKeysController {
    constructor(
        private readonly apiKeysService: ApiKeysService,
        private readonly keyRotationService: KeyRotationService,
    ) { }

    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @RateLimit({ limit: 3, ttl: 60 })
    @Post()
    async create(
        @Body() createApiKeyDto: CreateApiKeyDto,
        @ActiveUser() user: ActiveUserData,
    ) {
        return this.apiKeysService.createKey(user.tenantId, createApiKeyDto.name, createApiKeyDto.permissions);
    }

    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @Get()
    async findAll(@ActiveUser() user: ActiveUserData) {
        return this.apiKeysService.listKeys(user.tenantId);
    }

    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @Delete(':id')
    async remove(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
        return this.apiKeysService.revokeKey(id, user.tenantId);
    }

    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @Post(':id/rotate')
    async rotate(
        @Param('id') id: string,
        @ActiveUser() user: ActiveUserData,
        @Body('gracePeriodMinutes') gracePeriodMinutes?: number,
    ) {
        return this.keyRotationService.rotateKey(id, user.tenantId, gracePeriodMinutes);
    }
}
