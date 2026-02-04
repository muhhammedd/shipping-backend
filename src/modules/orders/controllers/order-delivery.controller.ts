import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TimeSlotService } from '../../shipping/services/time-slot.service';
import { FailedDeliveryService } from '../../shipping/services/failed-delivery.service';
import { CreateTimeSlotDto, UpdateTimeSlotDto } from '../../shipping/dto/time-slot.dto';
import { RecordFailedDeliveryDto } from '../../shipping/dto/failed-delivery.dto';
import { ActiveUser } from '../../../common/decorators/active-user.decorator';
import type { ActiveUserData } from '../../../common/interfaces/active-user-data.interface';
import { Roles } from '../../iam/authorization/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Orders - Time Slots & Deliveries')
@Controller('orders')
export class OrderDeliveryController {
    constructor(
        private readonly timeSlotService: TimeSlotService,
        private readonly failedDeliveryService: FailedDeliveryService,
    ) { }

    // Time Slot Endpoints
    @Post(':id/time-slot')
    @ApiOperation({ summary: 'Create time slot for order' })
    @ApiResponse({ status: 201, description: 'Time slot created' })
    createTimeSlot(
        @Param('id') orderId: string,
        @Body() dto: Omit<CreateTimeSlotDto, 'orderId'>,
        @ActiveUser() user: ActiveUserData,
    ) {
        return this.timeSlotService.create({ ...dto, orderId }, user);
    }

    @Patch(':id/time-slot')
    @ApiOperation({ summary: 'Update order time slot' })
    @ApiResponse({ status: 200, description: 'Time slot updated' })
    updateTimeSlot(
        @Param('id') orderId: string,
        @Body() dto: UpdateTimeSlotDto,
        @ActiveUser() user: ActiveUserData,
    ) {
        return this.timeSlotService.update(orderId, dto, user);
    }

    @Delete(':id/time-slot')
    @ApiOperation({ summary: 'Delete order time slot' })
    @ApiResponse({ status: 200, description: 'Time slot deleted' })
    deleteTimeSlot(
        @Param('id') orderId: string,
        @ActiveUser() user: ActiveUserData,
    ) {
        return this.timeSlotService.remove(orderId, user);
    }

    // Failed Delivery Endpoints
    @Roles(UserRole.COURIER)
    @Post(':id/failed-delivery')
    @ApiOperation({ summary: 'Record failed delivery attempt' })
    @ApiResponse({ status: 201, description: 'Failed delivery recorded' })
    recordFailedDelivery(
        @Param('id') orderId: string,
        @Body() dto: Omit<RecordFailedDeliveryDto, 'orderId'>,
        @ActiveUser() user: ActiveUserData,
    ) {
        return this.failedDeliveryService.recordFailure({ ...dto, orderId }, user);
    }

    @Get(':id/failed-deliveries')
    @ApiOperation({ summary: 'Get failed delivery attempts for order' })
    @ApiResponse({ status: 200, description: 'Failed deliveries retrieved' })
    getFailedDeliveries(
        @Param('id') orderId: string,
        @ActiveUser() user: ActiveUserData,
    ) {
        return this.failedDeliveryService.getOrderFailures(orderId, user);
    }
}
