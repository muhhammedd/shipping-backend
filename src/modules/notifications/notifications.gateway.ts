import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { NotificationsService } from './notifications.service';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    credentials: true,
  },
  perMessageDeflate: {
    threshold: 1024, // Only compress data larger than 1KB
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly jwtService: JwtService,
  ) { }

  async handleConnection(client: Socket) {
    try {
      const auth = client.handshake.auth as { token?: string };
      const token = auth.token;
      if (!token) {
        this.logger.warn('Connection attempt without token');
        client.disconnect();
        return;
      }

      // Verify JWT token
      const decoded = await this.jwtService.verifyAsync(token);

      const userId = decoded.sub;
      const tenantId = decoded.tenantId;

      // Store user connection
      const userKey = `${tenantId}:${userId}`;
      if (!this.userSockets.has(userKey)) {
        this.userSockets.set(userKey, new Set());
      }
      this.userSockets.get(userKey)?.add(client.id);

      // Join user to their personal room
      await client.join(userKey);

      this.logger.log(
        `Client ${client.id} connected for user ${userId} in tenant ${tenantId}`,
      );

      // Send welcome message
      client.emit('connected', {
        message: 'Connected to Shipex notifications',
        clientId: client.id,
      });
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Find and remove the user connection
    for (const [userKey, sockets] of this.userSockets.entries()) {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userKey);
        }
        this.logger.log(`Client ${client.id} disconnected from ${userKey}`);
        break;
      }
    }
  }

  @SubscribeMessage('subscribe_to_order')
  async handleOrderSubscription(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    const orderRoom = `order:${data.orderId}`;
    await client.join(orderRoom);
    this.logger.log(`Client ${client.id} subscribed to order ${data.orderId}`);
    return { status: 'subscribed', orderId: data.orderId };
  }

  @SubscribeMessage('unsubscribe_from_order')
  async handleOrderUnsubscription(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    const orderRoom = `order:${data.orderId}`;
    await client.leave(orderRoom);
    this.logger.log(
      `Client ${client.id} unsubscribed from order ${data.orderId}`,
    );
    return { status: 'unsubscribed', orderId: data.orderId };
  }

  @OnEvent('notification.created')
  handleNotificationCreated(notification: any) {
    const { tenantId, recipientId, type, message } = notification;
    if (recipientId) {
      this.sendNotificationToUser(recipientId, tenantId, notification);
    }
    // Logic for tenant-wide notifications if needed
  }

  @OnEvent('order.status_updated')
  handleOrderStatusUpdated(payload: any) {
    const { orderId, tenantId, status, message } = payload;
    this.broadcastOrderStatusUpdate(orderId, tenantId, status, message);
  }

  /**
   * Send notification to a specific user
   */
  sendNotificationToUser(userId: string, tenantId: string, notification: any) {
    const userKey = `${tenantId}:${userId}`;
    this.server.to(userKey).emit('notification', notification);
    this.logger.debug(
      `Notification sent to user ${userId} in tenant ${tenantId}`,
    );
  }

  /**
   * Send notification to all users in a tenant
   */
  sendNotificationToTenant(tenantId: string, notification: any) {
    const tenantRoom = `tenant:${tenantId}`;
    this.server.to(tenantRoom).emit('notification', notification);
    this.logger.debug(`Notification sent to all users in tenant ${tenantId}`);
  }

  /**
   * Send order status update to all subscribers
   */
  broadcastOrderStatusUpdate(
    orderId: string,
    tenantId: string,
    status: string,
    message: string,
  ) {
    const orderRoom = `order:${orderId}`;

    this.server.to(orderRoom).emit('order_status_update', {
      orderId,
      status,
      message,
      timestamp: new Date(),
    });

    this.logger.debug(
      `Order status update broadcasted for order ${orderId} in tenant ${tenantId}`,
    );
  }

  /**
   * Send order assignment notification
   */
  broadcastOrderAssignment(
    orderId: string,
    courierId: string,
    tenantId: string,
    message: string,
  ) {
    const orderRoom = `order:${orderId}`;
    const courierKey = `${tenantId}:${courierId}`;

    this.server.to(orderRoom).emit('order_assigned', {
      orderId,
      courierId,
      message,
      timestamp: new Date(),
    });

    this.server.to(courierKey).emit('new_assignment', {
      orderId,
      message,
      timestamp: new Date(),
    });

    this.logger.debug(
      `Order assignment broadcasted for order ${orderId} to courier ${courierId}`,
    );
  }

  /**
   * Send real-time update on merchant balance
   */
  broadcastMerchantBalanceUpdate(
    merchantId: string,
    tenantId: string,
    newBalance: number,
  ) {
    const merchantKey = `${tenantId}:${merchantId}`;

    this.server.to(merchantKey).emit('balance_updated', {
      newBalance,
      timestamp: new Date(),
    });

    this.logger.debug(
      `Merchant balance update sent to ${merchantId} in tenant ${tenantId}`,
    );
  }

  /**
   * Send real-time update on courier wallet
   */
  broadcastCourierWalletUpdate(
    courierId: string,
    tenantId: string,
    newWallet: number,
  ) {
    const courierKey = `${tenantId}:${courierId}`;

    this.server.to(courierKey).emit('wallet_updated', {
      newWallet,
      timestamp: new Date(),
    });

    this.logger.debug(
      `Courier wallet update sent to ${courierId} in tenant ${tenantId}`,
    );
  }
}
