import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DeliveryProofService } from '../services/delivery-proof.service';
import { CreateDeliveryProofDto } from '../dto/delivery-proof.dto';
import { ActiveUser } from '../../../common/decorators/active-user.decorator';
import { Roles } from '../../iam/authorization/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import type { ActiveUserData } from '../../../common/interfaces/active-user-data.interface';

@ApiTags('Courier - Delivery Proof')
@Controller('courier/delivery-proof')
@Roles(UserRole.COURIER)
export class DeliveryProofController {
    constructor(private readonly deliveryProofService: DeliveryProofService) { }

    @Post()
    @ApiOperation({ summary: 'Submit delivery proof for an order' })
    @ApiResponse({ status: 201, description: 'Delivery proof submitted successfully' })
    create(@Body() createDto: CreateDeliveryProofDto, @ActiveUser() user: ActiveUserData) {
        return this.deliveryProofService.create(createDto, user);
    }

    @Get('order/:orderId')
    @ApiOperation({ summary: 'Get delivery proof for a specific order' })
    @ApiResponse({ status: 200, description: 'Delivery proof retrieved' })
    findByOrder(@Param('orderId') orderId: string, @ActiveUser() user: ActiveUserData) {
        return this.deliveryProofService.findByOrder(orderId, user);
    }

    @Get('my-deliveries')
    @ApiOperation({ summary: 'Get all my delivery proofs' })
    @ApiResponse({ status: 200, description: 'List of delivery proofs' })
    findMy(@ActiveUser() user: ActiveUserData, @Query('limit') limit?: string) {
        return this.deliveryProofService.findByCourier(user, limit ? parseInt(limit) : 50);
    }
}
