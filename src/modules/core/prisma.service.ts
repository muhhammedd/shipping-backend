import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private prismaClient: PrismaClient | null = null;
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    this.initializePrismaClient();
  }

  private initializePrismaClient(): void {
    try {
      this.prismaClient = new PrismaClient({
        log: ['error', 'warn'],
        datasourceUrl: process.env.DATABASE_URL,
      });
    } catch (error) {
      this.logger.error('Failed to initialize PrismaClient', error);
      throw error;
    }
  }

  get client(): PrismaClient {
    if (!this.prismaClient) {
      throw new Error('PrismaClient is not initialized');
    }
    return this.prismaClient;
  }

  // Proxy all model accessors
  get tenant() {
    return this.client.tenant;
  }

  get user() {
    return this.client.user;
  }

  get merchantProfile() {
    return this.client.merchantProfile;
  }

  get courierProfile() {
    return this.client.courierProfile;
  }

  get order() {
    return this.client.order;
  }

  get orderHistory() {
    return this.client.orderHistory;
  }

  get uploadedFile() {
    return this.client.uploadedFile;
  }

  get notification() {
    return this.client.notification;
  }

  // Proxy transaction method
  async $transaction<T>(
    callback: (tx: PrismaClient) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction(callback);
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.$connect();
      this.logger.log('Prisma connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to Prisma', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      if (this.prismaClient) {
        await this.prismaClient.$disconnect();
        this.logger.log('Prisma disconnected successfully');
      }
    } catch (error) {
      this.logger.error('Failed to disconnect Prisma', error);
    }
  }
}
