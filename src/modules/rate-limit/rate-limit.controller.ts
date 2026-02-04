import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RateLimitService } from './rate-limit.service';
import { AccessTokenGuard } from '../iam/authentication/guards/access-token.guard';
import { SkipRateLimit } from './decorators/skip-rate-limit.decorator';

@ApiTags('Rate Limiting')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('rate-limit')
export class RateLimitController {
    constructor(private readonly rateLimitService: RateLimitService) { }

    @SkipRateLimit()
    @Get('usage')
    @ApiOperation({ summary: 'Get current quota usage', description: 'Returns current API quota usage for the authenticated tenant' })
    @ApiResponse({ status: 200, description: 'Quota usage returned' })
    async getUsage(@Req() req: any) {
        const tenantId = req.user.tenantId;
        return this.rateLimitService.getQuotaUsage(tenantId);
    }

    @SkipRateLimit()
    @Get('stats')
    @ApiOperation({ summary: 'Get quota statistics', description: 'Returns historical quota usage statistics' })
    @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days to retrieve (default: 7)', example: 7 })
    @ApiResponse({ status: 200, description: 'Statistics returned' })
    async getStats(@Req() req: any, @Query('days') days?: string) {
        const tenantId = req.user.tenantId;
        const daysNum = days ? parseInt(days) : 7;
        return this.rateLimitService.getQuotaStats(tenantId, daysNum);
    }
}
