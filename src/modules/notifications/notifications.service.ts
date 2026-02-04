import { Injectable } from '@nestjs/common';
import { PrismaService } from '../core/prisma.service';
import { OrderStatus, NotificationType } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { paginate, PaginationResult } from '../../common/utils/pagination.util';

interface NotificationPayload {
  type: string;
  orderId: string;
  status: OrderStatus;
  message: string;
  recipientId?: string;
  tenantId: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  /**
   * Create a notification record in the database
   */
  async createNotification(payload: NotificationPayload) {
    const notification = await this.prisma.notification.create({
      data: {
        type: payload.type as NotificationType,
        orderId: payload.orderId,
        status: payload.status,
        message: payload.message,
        recipientId: payload.recipientId,
        tenantId: payload.tenantId,
        isRead: false,
      },
    });

    // Emit event for real-time delivery
    this.eventEmitter.emit('notification.created', notification);

    return notification;
  }

  /**
   * Get all notifications for a user with pagination
   */
  async findAll(userId: string, tenantId: string, page = 1, limit = 20): Promise<PaginationResult<any>> {
    return paginate(
      this.prisma.notification,
      {
        where: {
          recipientId: userId,
          tenantId,
        },
        orderBy: { createdAt: 'desc' },
      },
      page,
      limit,
    );
  }

  /**
   * Get unread notifications for a user
   */
  async getUnreadNotifications(userId: string, tenantId: string) {
    return await this.prisma.notification.findMany({
      where: {
        recipientId: userId,
        tenantId,
        isRead: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string) {
    return await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllNotificationsAsRead(userId: string, tenantId: string) {
    return await this.prisma.notification.updateMany({
      where: {
        recipientId: userId,
        tenantId,
        isRead: false,
      },
      data: { isRead: true },
    });
  }

  /**
   * Notify order status change
   */
  async notifyOrderStatusChange(
    orderId: string,
    newStatus: OrderStatus,
    tenantId: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        trackingNumber: true,
        merchantId: true,
        courierId: true,
        merchant: {
          select: {
            userId: true,
          },
        },
        courier: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!order) {
      return;
    }

    const statusMessages: { [key in OrderStatus]: string } = {
      CREATED: 'Order has been created',
      ASSIGNED: 'Order has been assigned to a courier',
      PICKED_UP: 'Order has been picked up',
      IN_TRANSIT: 'Order is in transit',
      DELIVERED: 'Order has been delivered',
      CANCELLED: 'Order has been cancelled',
      RETURNED: 'Order has been returned',
    };

    const message = `Order ${order.trackingNumber}: ${statusMessages[newStatus]}`;

    // Emit detailed event for other listeners (e.g., SMS, Email)
    this.eventEmitter.emit('order.status_updated', {
      orderId,
      status: newStatus,
      tenantId,
      message,
      merchantUserId: order.merchant?.userId,
      courierUserId: order.courier?.userId,
    });

    // Create DB notifications (which will trigger real-time updates via 'notification.created')
    if (order.merchant?.userId) {
      await this.createNotification({
        type: 'ORDER_STATUS_CHANGE',
        orderId,
        status: newStatus,
        message,
        recipientId: order.merchant.userId,
        tenantId,
      });
    }

    if (order.courier?.userId && newStatus !== OrderStatus.CREATED) {
      await this.createNotification({
        type: 'ORDER_STATUS_CHANGE',
        orderId,
        status: newStatus,
        message,
        recipientId: order.courier.userId,
        tenantId,
      });
    }
  }

  /**
   * Notify order assignment
   */
  async notifyOrderAssignment(
    orderId: string,
    courierId: string,
    tenantId: string,
  ) {
    const courier = await this.prisma.courierProfile.findUnique({
      where: { id: courierId },
      select: {
        userId: true,
      },
    });

    if (!courier) {
      return;
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        trackingNumber: true,
      },
    });

    if (!order) {
      return;
    }

    await this.createNotification({
      type: 'ORDER_ASSIGNED',
      orderId,
      status: OrderStatus.ASSIGNED,
      message: `You have been assigned to deliver order ${order.trackingNumber}`,
      recipientId: courier.userId,
      tenantId,
    });
  }

  /**
   * Get Notification Preferences for a user
   */
  async getPreferences(userId: string) {
    let prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!prefs) {
      prefs = await this.prisma.notificationPreference.create({
        data: { userId },
      });
    }
    return prefs;
  }

  /**
   * Update Notification Preferences
   */
  async updatePreferences(userId: string, data: any) {
    return await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { ...data, userId },
      update: data,
    });
  }
}
