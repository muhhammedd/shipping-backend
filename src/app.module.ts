import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoreModule } from './modules/core/core.module';
import { IamModule } from './modules/iam/iam.module';
import { OrdersModule } from './modules/orders/orders.module';
import { FilesModule } from './modules/files/files.module';
import { DeveloperModule } from './modules/developer/developer.module';
import { LabelsModule } from './modules/labels/labels.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { RateLimitModule } from './modules/rate-limit/rate-limit.module';
import { AdminModule } from './modules/admin/admin.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { FinanceModule } from './modules/finance/finance.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { RedisCacheModule } from './modules/cache/redis-cache.module';
import { ThrottleConfigModule } from './modules/throttle/throttle-config.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { QueueModule } from './modules/queue/queue.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { MerchantsModule } from './modules/merchants/merchants.module';
import { CourierModule } from './modules/courier/courier.module';
import { LoggerModule } from './common/logger/logger.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { UsageInterceptor } from './common/interceptors/usage.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SecurityMiddleware } from './common/middleware/security.middleware';
import { HealthModule } from './modules/health/health.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { ClsModule } from 'nestjs-cls';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    LoggerModule,
    CoreModule,
    RedisCacheModule,
    ThrottleConfigModule,
    IamModule,
    OrdersModule,
    MerchantsModule,
    CourierModule,
    FilesModule,
    DeveloperModule,
    NotificationsModule,
    FinanceModule,
    TenantsModule,
    UsersModule,
    PricingModule,
    AnalyticsModule,
    QueueModule,
    CommunicationModule,
    LabelsModule,
    ShippingModule,
    TrackingModule,
    RateLimitModule,
    AdminModule,
    HealthModule,
    MetricsModule,
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    EventEmitterModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: UsageInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SecurityMiddleware)
      .forRoutes('*');
  }
}
