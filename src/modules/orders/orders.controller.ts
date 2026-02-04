import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { FilterOrderDto } from './dto/filter-order.dto';
import { AssignOrderDto } from './dto/assign-order.dto';
import { BulkUpdateOrderStatusDto } from './dto/bulk-update-order-status.dto';
import { BulkAssignOrderDto } from './dto/bulk-assign-order.dto';
import { ImportOrdersDto, ImportOrdersCsvDto } from './dto/import-orders.dto';
import { OrderImportService } from './services/order-import.service';
import { OrderNotesService } from './services/order-notes.service';
import { OrderOperationsService } from './services/order-operations.service';
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import type { ActiveUserData } from '../../common/interfaces/active-user-data.interface';
import { Roles } from '../iam/authorization/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiQuery, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly orderImportService: OrderImportService,
    private readonly orderNotesService: OrderNotesService,
    private readonly orderOperationsService: OrderOperationsService,
  ) { }

  @Roles(UserRole.MERCHANT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  create(
    @Body() createOrderDto: CreateOrderDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.ordersService.create(createOrderDto, user);
  }

  @Roles(UserRole.MERCHANT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('import/json')
  @ApiOperation({ summary: 'Import multiple orders from JSON' })
  @ApiResponse({ status: 201, description: 'Orders imported successfully' })
  importFromJson(
    @Body() importDto: ImportOrdersDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.orderImportService.importFromJson(importDto.orders, user);
  }

  @Roles(UserRole.MERCHANT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('import/csv')
  @ApiOperation({ summary: 'Import orders from CSV content' })
  @ApiResponse({ status: 201, description: 'Orders imported from CSV' })
  importFromCsv(
    @Body() importDto: ImportOrdersCsvDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.orderImportService.importFromCsv(importDto.csvContent, user);
  }

  @Get('import/template')
  @ApiOperation({ summary: 'Download CSV template for bulk import' })
  @ApiResponse({ status: 200, description: 'CSV template returned' })
  getImportTemplate() {
    const template = this.orderImportService.generateCsvTemplate();
    return {
      template,
      filename: 'order_import_template.csv',
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders with filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  findAll(
    @Query() filterDto: FilterOrderDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.ordersService.findAll(user, filterDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  findOne(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.ordersService.findOne(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.COURIER)
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.ordersService.updateStatus(id, updateOrderStatusDto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id/assign')
  @ApiOperation({ summary: 'Assign order to courier' })
  assignOrderPatch(
    @Param('id') id: string,
    @Body() assignOrderDto: AssignOrderDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.ordersService.assignOrder(id, assignOrderDto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch('bulk/status')
  @ApiOperation({ summary: 'Bulk update order status' })
  bulkUpdateStatus(
    @Body() bulkUpdateDto: BulkUpdateOrderStatusDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.ordersService.bulkUpdateStatus(bulkUpdateDto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch('bulk/assign')
  @ApiOperation({ summary: 'Bulk assign orders to courier' })
  bulkAssign(
    @Body() bulkAssignDto: BulkAssignOrderDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.ordersService.bulkAssign(bulkAssignDto, user);
  }

  // Order Notes Endpoints
  @Post(':id/notes')
  @ApiOperation({ summary: 'Add note to order' })
  @ApiResponse({ status: 201, description: 'Note created successfully' })
  async createNote(
    @Param('id') orderId: string,
    @Body() createNoteDto: any,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.orderNotesService.create({ ...createNoteDto, orderId }, user);
  }

  @Get(':id/notes')
  @ApiOperation({ summary: 'Get all notes for an order' })
  async getOrderNotes(
    @Param('id') orderId: string,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.orderNotesService.findByOrder(orderId, user);
  }

  @Patch('notes/:noteId')
  @ApiOperation({ summary: 'Update order note' })
  async updateNote(
    @Param('noteId') noteId: string,
    @Body() updateNoteDto: any,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.orderNotesService.update(noteId, updateNoteDto, user);
  }

  // Order Operations Endpoints
  @Roles(UserRole.MERCHANT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  async cancelOrder(
    @Param('id') orderId: string,
    @Body() cancelDto: any,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.orderOperationsService.cancelOrder(orderId, cancelDto, user);
  }

  @Roles(UserRole.MERCHANT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post(':id/return')
  @ApiOperation({ summary: 'Return an order' })
  @ApiResponse({ status: 200, description: 'Order returned successfully' })
  async returnOrder(
    @Param('id') orderId: string,
    @Body() returnDto: any,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.orderOperationsService.returnOrder(orderId, returnDto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign order to courier' })
  @ApiResponse({ status: 200, description: 'Order assigned successfully' })
  async assignOrder(
    @Param('id') orderId: string,
    @Body() assignDto: any,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.orderOperationsService.assignOrder(orderId, assignDto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('bulk-assign')
  @ApiOperation({ summary: 'Bulk assign orders to courier' })
  @ApiResponse({ status: 200, description: 'Orders assigned successfully' })
  async bulkAssignOrders(
    @Body() bulkAssignDto: any,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.orderOperationsService.bulkAssignOrders(bulkAssignDto, user);
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Get order activity timeline' })
  @ApiResponse({ status: 200, description: 'Timeline retrieved successfully' })
  async getTimeline(
    @Param('id') orderId: string,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.orderOperationsService.getOrderTimeline(orderId, user);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('optimize-assignment')
  @ApiOperation({ summary: 'Optimize order assignment to couriers' })
  @ApiResponse({ status: 200, description: 'Assignment optimization completed' })
  async optimizeAssignment(
    @Body() body: { orderIds: string[] },
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.orderOperationsService.optimizeAssignment(body.orderIds, user.tenantId);
  }
}

