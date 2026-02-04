import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DeliveryZoneService } from '../../shipping/services/delivery-zone.service';
import { FailedDeliveryService } from '../../shipping/services/failed-delivery.service';
import { CreateDeliveryZoneDto, UpdateDeliveryZoneDto } from '../../shipping/dto/delivery-zone.dto';
import { ActiveUser } from '../../../common/decorators/active-user.decorator';
import type { ActiveUserData } from '../../../common/interfaces/active-user-data.interface';
import { Roles } from '../../iam/authorization/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Admin - Delivery Zones')
@Controller('admin/delivery-zones')
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class DeliveryZonesController {
    constructor(
        private readonly deliveryZoneService: DeliveryZoneService,
        private readonly failedDeliveryService: FailedDeliveryService,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Create delivery zone' })
    @ApiResponse({ status: 201, description: 'Zone created successfully' })
    create(
        @Body() createDto: CreateDeliveryZoneDto,
        @ActiveUser() user: ActiveUserData,
    ) {
        return this.deliveryZoneService.create(createDto, user);
    }

    @Get()
    @ApiOperation({ summary: 'Get all delivery zones' })
    @ApiResponse({ status: 200, description: 'Zones retrieved' })
    findAll(@ActiveUser() user: ActiveUserData) {
        return this.deliveryZoneService.findAll(user);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get coverage statistics' })
    @ApiResponse({ status: 200, description: 'Statistics retrieved' })
    getStats(@ActiveUser() user: ActiveUserData) {
        return this.deliveryZoneService.getCoverageStats(user);
    }

    @Get('failure-stats')
    @ApiOperation({ summary: 'Get failed delivery statistics' })
    @ApiResponse({ status: 200, description: 'Statistics retrieved' })
    getFailureStats(@ActiveUser() user: ActiveUserData) {
        return this.failedDeliveryService.getFailureStats(user);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get delivery zone by ID' })
    @ApiResponse({ status: 200, description: 'Zone retrieved' })
    findOne(
        @Param('id') id: string,
        @ActiveUser() user: ActiveUserData,
    ) {
        return this.deliveryZoneService.findOne(id, user);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update delivery zone' })
    @ApiResponse({ status: 200, description: 'Zone updated' })
    update(
        @Param('id') id: string,
        @Body() updateDto: UpdateDeliveryZoneDto,
        @ActiveUser() user: ActiveUserData,
    ) {
        return this.deliveryZoneService.update(id, updateDto, user);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete delivery zone' })
    @ApiResponse({ status: 200, description: 'Zone deleted' })
    remove(
        @Param('id') id: string,
        @ActiveUser() user: ActiveUserData,
    ) {
        return this.deliveryZoneService.remove(id, user);
    }
}
