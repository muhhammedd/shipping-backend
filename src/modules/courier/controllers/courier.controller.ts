import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { CourierService } from '../services/courier.service';
import { RouteOptimizerService } from '../../shipping/services/route-optimizer.service';
import { TimeSlotService } from '../../shipping/services/time-slot.service';
import { AccessTokenGuard } from '../../iam/authentication/guards/access-token.guard';
import { RolesGuard } from '../../iam/authorization/guards/roles.guard';
import { Roles } from '../../iam/authorization/decorators/roles.decorator';
import { UserRole, CourierStatus } from '@prisma/client';
import { ActiveUser } from '../../../common/decorators/active-user.decorator';
import type { ActiveUserData } from '../../../common/interfaces/active-user-data.interface';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

@ApiTags('Couriers')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.COURIER)
@Controller('courier')
export class CourierController {
    constructor(
        private readonly courierService: CourierService,
        private readonly routeOptimizer: RouteOptimizerService,
        private readonly timeSlotService: TimeSlotService,
    ) { }

    @Get('profile')
    @ApiOperation({ summary: 'Get current courier profile' })
    async getProfile(@ActiveUser() user: ActiveUserData) {
        return this.courierService.getProfile(user.sub);
    }

    @Patch('status')
    @ApiOperation({ summary: 'Update availability and online status' })
    async updateStatus(
        @ActiveUser() user: ActiveUserData,
        @Body() body: { status: CourierStatus; isAvailable: boolean },
    ) {
        return this.courierService.updateStatus(user.sub, body.status, body.isAvailable);
    }

    @Get('assignments')
    @ApiOperation({ summary: 'Get current delivery assignments' })
    async getAssignments(@ActiveUser() user: ActiveUserData) {
        return this.courierService.getAssignments(user.sub);
    }

    @Get('route')
    @ApiOperation({ summary: 'Get optimized delivery route for current assignments' })
    async getRoute(@ActiveUser() user: ActiveUserData) {
        const courier = await this.courierService.getProfile(user.sub);
        return this.routeOptimizer.getCourierRoute(courier.id, user);
    }

    @Get('schedule')
    @ApiOperation({ summary: 'Get assigned delivery time slots' })
    async getSchedule(@ActiveUser() user: ActiveUserData) {
        // Fetch all order IDs assigned to courier
        const assignments = await this.courierService.getAssignments(user.sub);
        const orderIds = assignments.map(a => a.id);

        // This is a simplified approach, in a real app we'd have a specific time slot service method
        return this.timeSlotService.getSlotsForOrders(orderIds);
    }

    @Get('earnings')
    @ApiOperation({ summary: 'Get wallet balance and transaction history' })
    async getEarnings(@ActiveUser() user: ActiveUserData) {
        return this.courierService.getEarnings(user.sub);
    }

    @Get('performance')
    @ApiOperation({ summary: 'Get delivery performance metrics' })
    async getPerformance(@ActiveUser() user: ActiveUserData) {
        return this.courierService.getPerformance(user.sub);
    }
}
