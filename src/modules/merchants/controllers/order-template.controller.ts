import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrderTemplateService } from '../services/order-template.service';
import {
    CreateTemplateDto,
    UpdateTemplateDto,
    CreateOrderFromTemplateDto,
} from '../dto/order-template.dto';
import { ActiveUser } from '../../../common/decorators/active-user.decorator';
import { Roles } from '../../iam/authorization/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import type { ActiveUserData } from '../../../common/interfaces/active-user-data.interface';

@ApiTags('Merchants')
@ApiBearerAuth()
@Controller('merchants/order-templates')
@Roles(UserRole.MERCHANT)
export class OrderTemplateController {
    constructor(private readonly orderTemplateService: OrderTemplateService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new order template' })
    @ApiResponse({ status: 201, description: 'Template created successfully' })
    create(@Body() createTemplateDto: CreateTemplateDto, @ActiveUser() user: ActiveUserData) {
        return this.orderTemplateService.create(createTemplateDto, user);
    }

    @Get()
    @ApiOperation({ summary: 'Get all order templates' })
    @ApiResponse({ status: 200, description: 'List of order templates' })
    findAll(@ActiveUser() user: ActiveUserData) {
        return this.orderTemplateService.findAll(user);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a specific template' })
    @ApiResponse({ status: 200, description: 'Template details' })
    findOne(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
        return this.orderTemplateService.findOne(id, user);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a template' })
    @ApiResponse({ status: 200, description: 'Template updated successfully' })
    update(
        @Param('id') id: string,
        @Body() updateTemplateDto: UpdateTemplateDto,
        @ActiveUser() user: ActiveUserData,
    ) {
        return this.orderTemplateService.update(id, updateTemplateDto, user);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a template' })
    @ApiResponse({ status: 200, description: 'Template deleted successfully' })
    remove(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
        return this.orderTemplateService.remove(id, user);
    }

    @Post('create-order')
    @ApiOperation({ summary: 'Create an order from a template' })
    @ApiResponse({ status: 201, description: 'Order created from template' })
    createOrderFromTemplate(
        @Body() dto: CreateOrderFromTemplateDto,
        @ActiveUser() user: ActiveUserData,
    ) {
        return this.orderTemplateService.createOrderFromTemplate(dto, user);
    }

    @Post(':id/duplicate')
    @ApiOperation({ summary: 'Duplicate a template' })
    @ApiResponse({ status: 201, description: 'Template duplicated successfully' })
    duplicate(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
        return this.orderTemplateService.duplicate(id, user);
    }
}
