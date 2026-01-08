import { Injectable } from '@nestjs/common';
import { PrismaService } from '../core/prisma.service';
import { OrderStatus } from '@prisma/client';

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
  private connectedUsers = new Map<string, Set<string>>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Register a user connection for WebSocket notifications
   */
  registerUserConnection(userId: string, socketId: string, tenantId: string) {
    const userKey = `${tenantId}:${userId}`;
    if (!this.connectedUsers.has(userKey)) {
      this.connectedUsers.set(userKey, new Set());
    }
    this.connectedUsers.get(userKey)?.add(socketId);
  }

  /**
   * Unregister a user connection
   */
  unregisterUserConnection(userId: string, socketId: string, tenantId: string) {
    const userKey = `${tenantId}:${userId}`;
    if (this.connectedUsers.has(userKey)) {
      this.connectedUsers.get(userKey)?.delete(socketId);
    }
  }

  /**
   * Get connected socket IDs for a user
   */
  getUserConnections(userId: string, tenantId: string): Set<string> {
    const userKey = `${tenantId}:${userId}`;
    return this.connectedUsers.get(userKey) || new Set();
  }

  /**
   * Create a notification record in the database
   */
  async createNotification(payload: NotificationPayload) {
    return await this.prisma.notification.create({
      data: {
        type: payload.type,
        orderId: payload.orderId,
        status: payload.status,
        message: payload.message,
        recipientId: payload.recipientId,
        tenantId: payload.tenantId,
        isRead: false,
      },
    });
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

    // Notify merchant
    if (order.merchant?.userId) {
      await this.createNotification({
        type: 'ORDER_STATUS_CHANGE',
        orderId,
        status: newStatus,
        message: `Order ${order.trackingNumber}: ${statusMessages[newStatus]}`,
        recipientId: order.merchant.userId,
        tenantId,
      });
    }

    // Notify courier if assigned
    if (order.courier?.userId && newStatus !== OrderStatus.CREATED) {
      await this.createNotification({
        type: 'ORDER_STATUS_CHANGE',
        orderId,
        status: newStatus,
        message: `Order ${order.trackingNumber}: ${statusMessages[newStatus]}`,
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
}
