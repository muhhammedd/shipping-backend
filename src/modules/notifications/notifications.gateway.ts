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
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      if (!token) {
        this.logger.warn('Connection attempt without token');
        client.disconnect();
        return;
      }

      // Verify JWT token
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const decoded = await this.jwtService.verifyAsync(token);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const userId = decoded.sub;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const tenantId = decoded.tenantId;

      // Store user connection
      const userKey = `${tenantId}:${userId}`;
      if (!this.userSockets.has(userKey)) {
        this.userSockets.set(userKey, new Set());
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      this.userSockets.get(userKey).add(client.id);

      // Join user to their personal room
      client.join(userKey);

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
  handleOrderSubscription(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    const orderRoom = `order:${data.orderId}`;
    client.join(orderRoom);
    this.logger.log(`Client ${client.id} subscribed to order ${data.orderId}`);
    return { status: 'subscribed', orderId: data.orderId };
  }

  @SubscribeMessage('unsubscribe_from_order')
  handleOrderUnsubscription(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    const orderRoom = `order:${data.orderId}`;
    client.leave(orderRoom);
    this.logger.log(`Client ${client.id} unsubscribed from order ${data.orderId}`);
    return { status: 'unsubscribed', orderId: data.orderId };
  }

  /**
   * Send notification to a specific user
   */
  sendNotificationToUser(userId: string, tenantId: string, notification: any) {
    const userKey = `${tenantId}:${userId}`;
    this.server.to(userKey).emit('notification', notification);
    this.logger.log(`Notification sent to user ${userId} in tenant ${tenantId}`);
  }

  /**
   * Send notification to all users in a tenant
   */
  sendNotificationToTenant(tenantId: string, notification: any) {
    const tenantRoom = `tenant:${tenantId}`;
    this.server.to(tenantRoom).emit('notification', notification);
    this.logger.log(`Notification sent to all users in tenant ${tenantId}`);
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
    const tenantRoom = `tenant:${tenantId}`;

    this.server.to(orderRoom).emit('order_status_update', {
      orderId,
      status,
      message,
      timestamp: new Date(),
    });

    this.logger.log(
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

    this.logger.log(
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

    this.logger.log(
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

    this.logger.log(
      `Courier wallet update sent to ${courierId} in tenant ${tenantId}`,
    );
  }
}
