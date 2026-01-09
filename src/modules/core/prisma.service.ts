import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private prismaClient: PrismaClient;

  constructor() {
    this.prismaClient = new PrismaClient({
      errorFormat: 'pretty',
    });
  }

  get client(): PrismaClient {
    return this.prismaClient;
  }

  // Proxy methods to maintain backward compatibility
  get order() {
    return this.prismaClient.order;
  }

  get user() {
    return this.prismaClient.user;
  }

  get tenant() {
    return this.prismaClient.tenant;
  }

  get merchantProfile() {
    return this.prismaClient.merchantProfile;
  }

  get courierProfile() {
    return this.prismaClient.courierProfile;
  }

  get uploadedFile() {
    return this.prismaClient.uploadedFile;
  }

  get notification() {
    return this.prismaClient.notification;
  }

  get orderHistory() {
    return this.prismaClient.orderHistory;
  }

  async $connect() {
    return this.prismaClient.$connect();
  }

  async $disconnect() {
    return this.prismaClient.$disconnect();
  }

  async $transaction(callback: (tx: PrismaClient) => Promise<any>) {
    return this.prismaClient.$transaction(callback);
  }

  async onModuleInit() {
    await this.prismaClient.$connect();
  }

  async onModuleDestroy() {
    await this.prismaClient.$disconnect();
  }
}
