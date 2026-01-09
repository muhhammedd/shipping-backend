import { Controller, Get, Patch, Param } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import type { ActiveUserData } from '../../common/interfaces/active-user-data.interface';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('unread')
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
}
