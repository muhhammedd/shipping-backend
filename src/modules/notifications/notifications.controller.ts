import { Controller, Get, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import type { ActiveUserData } from '../../common/interfaces/active-user-data.interface';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) { }

  @Get()
  @ApiOperation({ summary: 'Get all notifications for the user with pagination' })
  @ApiResponse({ status: 200, description: 'List of notifications' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @ActiveUser() user: ActiveUserData,
    @Query() paginationDto: PaginationDto,
  ) {
    return await this.notificationsService.findAll(
      user.sub,
      user.tenantId,
      paginationDto.page,
      paginationDto.limit,
    );
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread notifications for the user' })
  @ApiResponse({ status: 200, description: 'List of unread notifications' })
  async getUnreadNotifications(@ActiveUser() user: ActiveUserData) {
    return await this.notificationsService.getUnreadNotifications(
      user.sub,
      user.tenantId,
    );
  }

  @Patch(':id/read')
  async markNotificationAsRead(@Param('id') notificationId: string) {
    return await this.notificationsService.markNotificationAsRead(
      notificationId,
    );
  }

  @Patch('mark-all-read')
  async markAllNotificationsAsRead(@ActiveUser() user: ActiveUserData) {
    return await this.notificationsService.markAllNotificationsAsRead(
      user.sub,
      user.tenantId,
    );
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  @ApiResponse({ status: 200, description: 'User preferences' })
  async getPreferences(@ActiveUser() user: ActiveUserData) {
    return await this.notificationsService.getPreferences(user.sub);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  async updatePreferences(
    @ActiveUser() user: ActiveUserData,
    @Body() data: any,
  ) {
    return await this.notificationsService.updatePreferences(user.sub, data);
  }
}
