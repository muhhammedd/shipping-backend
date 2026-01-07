import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CoreModule } from './modules/core/core.module';
import { IamModule } from './modules/iam/iam.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { OrdersModule } from './modules/orders/orders.module';
import { FinanceModule } from './modules/finance/finance.module';
import { FilesModule } from './modules/files/files.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    CoreModule,
    IamModule,
    TenantsModule,
    OrdersModule,
    FinanceModule,
    FilesModule,
    NotificationsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
