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
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import type { ActiveUserData } from '../../common/interfaces/active-user-data.interface';
import { Roles } from '../iam/authorization/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiQuery } from '@nestjs/swagger';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @Post()
  create(
    @Body() createOrderDto: CreateOrderDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.ordersService.create(createOrderDto, user);
  }

  @Get()
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
  findOne(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.ordersService.findOne(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.COURIER)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.ordersService.updateStatus(id, updateOrderStatusDto, user);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id/assign')
  assignOrder(
    @Param('id') id: string,
    @Body() assignOrderDto: AssignOrderDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.ordersService.assignOrder(id, assignOrderDto, user);
  }
}
