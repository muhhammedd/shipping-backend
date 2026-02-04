import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { ShippingService } from './shipping.service';
import { AccessTokenGuard } from '../iam/authentication/guards/access-token.guard';
import { ValidateAddressDto, AutocompleteDto } from './dto/validate-address.dto';

@ApiTags('Shipping')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('shipping')
export class ShippingController {
    constructor(private readonly shippingService: ShippingService) { }

    @Post('validate-address')
    @ApiOperation({ summary: 'Validate shipping address', description: 'Validates address using Google Maps API with fallback to local database' })
    @ApiBody({ type: ValidateAddressDto })
    @ApiResponse({ status: 200, description: 'Address validated successfully' })
    @ApiResponse({ status: 400, description: 'Invalid address' })
    async validateAddress(@Body() dto: ValidateAddressDto) {
        return this.shippingService.validateAddress(dto);
    }

    @Get('autocomplete')
    @ApiOperation({ summary: 'Address autocomplete', description: 'Get address suggestions for autocomplete' })
    @ApiResponse({ status: 200, description: 'Suggestions returned' })
    async autocomplete(@Query() dto: AutocompleteDto) {
        return this.shippingService.autocomplete(dto);
    }

    @Get('cities')
    @ApiOperation({ summary: 'List supported cities', description: 'Get list of all supported Egyptian cities' })
    @ApiResponse({ status: 200, description: 'Cities list returned' })
    async listCities() {
        return this.shippingService.listCities();
    }
}
