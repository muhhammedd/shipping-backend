import { Controller, Post, Get, Body, UseGuards, ValidationPipe } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { AccessTokenGuard } from '../iam/authentication/guards/access-token.guard';
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import type { ActiveUserData } from '../../common/interfaces/active-user-data.interface';
import { CalculateRateDto } from './dto/calculate-rate.dto';
import { Roles } from '../iam/authorization/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Shipping')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('shipping')
export class PricingController {
    constructor(private readonly pricingService: PricingService) { }

    @Post('calculate-rate')
    @ApiOperation({ summary: 'Calculate shipping rate for an order' })
    @ApiResponse({ status: 200, description: 'Rate calculation successful' })
    async calculateRate(
        @ActiveUser() user: ActiveUserData,
        @Body(new ValidationPipe({ transform: true })) dto: CalculateRateDto,
    ) {
        return this.pricingService.calculateRate(user.tenantId, dto);
    }

    @Get('zones')
    @ApiOperation({ summary: 'List available delivery zones' })
    @ApiResponse({ status: 200, description: 'List of zones returned' })
    async listZones(@ActiveUser() user: ActiveUserData) {
        return this.pricingService.listZones(user.tenantId);
    }

    @Get('service-types')
    @ApiOperation({ summary: 'List available shipping service types' })
    @ApiResponse({ status: 200, description: 'List of service types returned' })
    async listServiceTypes(@ActiveUser() user: ActiveUserData) {
        return this.pricingService.listServiceTypes(user.tenantId);
    }

    // Legacy endpoint for backward compatibility
    @Post('calculate-shipping')
    async calculateShipping(
        @ActiveUser() user: ActiveUserData,
        @Body(new ValidationPipe()) dto: { zoneName: string; weight: number; codAmount?: number },
    ) {
        const cost = await this.pricingService.calculateShippingCost(
            user.tenantId,
            dto.zoneName,
            dto.weight,
            dto.codAmount || 0,
        );

        return {
            cost: cost.toNumber(),
            formattedCost: cost.toFixed(2),
            currency: 'EGP',
        };
    }
}
