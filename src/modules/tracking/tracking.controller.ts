import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { TrackingService } from './tracking.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Tracking')
@Controller()
export class TrackingController {
    constructor(private readonly trackingService: TrackingService) { }

    @Public()
    @Get('public/track/:trackingNumber')
    @ApiOperation({
        summary: 'Track order by tracking number (Public)',
        description: 'Public endpoint for customers to track their orders without authentication'
    })
    @ApiParam({ name: 'trackingNumber', description: 'Order tracking number (e.g., SHX123456789)', example: 'SHX123456789' })
    @ApiResponse({ status: 200, description: 'Tracking information returned' })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async trackOrder(@Param('trackingNumber') trackingNumber: string) {
        return this.trackingService.trackByNumber(trackingNumber);
    }

    @Public()
    @Get('track/:trackingNumber')
    @ApiOperation({ summary: 'Track order (Alias)', description: 'Alternative endpoint for tracking' })
    @ApiParam({ name: 'trackingNumber', description: 'Order tracking number', example: 'SHX123456789' })
    @ApiResponse({ status: 200, description: 'Tracking information returned' })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async trackOrderAlias(@Param('trackingNumber') trackingNumber: string) {
        return this.trackingService.trackByNumber(trackingNumber);
    }
}
