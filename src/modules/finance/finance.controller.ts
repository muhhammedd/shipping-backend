import { Controller, Get, Post, Body, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import type { ActiveUserData } from '../../common/interfaces/active-user-data.interface';
import { Roles } from '../iam/authorization/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AccessTokenGuard } from '../iam/authentication/guards/access-token.guard';
import { RolesGuard } from '../iam/authorization/guards/roles.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Finance')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Controller('finance')
export class FinanceController {
    constructor(private readonly financeService: FinanceService) { }

    @Get('balance')
    @Roles(UserRole.MERCHANT, UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Get merchant wallet balance' })
    @ApiResponse({ status: 200, description: 'Current balance returned successfully' })
    async getBalance(@ActiveUser() user: ActiveUserData) {
        return this.financeService.getMerchantBalanceByUserId(user.sub);
    }

    @Get('transactions')
    @Roles(UserRole.MERCHANT, UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Get transaction history' })
    @ApiResponse({ status: 200, description: 'List of transactions returned' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getTransactions(
        @ActiveUser() user: ActiveUserData,
        @Query() paginationDto: PaginationDto,
    ) {
        return this.financeService.getTransactionsByUserId(
            user.sub,
            paginationDto.page,
            paginationDto.limit,
        );
    }

    @Post('payout-request')
    @Roles(UserRole.MERCHANT)
    @ApiOperation({ summary: 'Request a payout from wallet' })
    @ApiResponse({ status: 201, description: 'Payout request created' })
    async requestPayout(
        @ActiveUser() user: ActiveUserData,
        @Body('amount') amount: number,
        @Body('method') method: string,
        @Body('details') details?: any,
    ) {
        // First get merchant profile ID
        const { merchantId } = await this.financeService.getMerchantBalanceByUserId(user.sub);
        // We need tenantId. For now let's assume we can get it from somewhere or pass it from user.tenantId
        return this.financeService.createPayoutRequest(user.tenantId, merchantId, amount, method, details);
    }

    @Get('report')
    @Roles(UserRole.MERCHANT)
    @ApiOperation({ summary: 'Generate financial report' })
    @ApiResponse({ status: 200, description: 'Financial report data returned' })
    async getReport(
        @ActiveUser() user: ActiveUserData,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const { merchantId } = await this.financeService.getMerchantBalanceByUserId(user.sub);
        return this.financeService.generateFinancialReport(
            merchantId,
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined,
        );
    }
}
