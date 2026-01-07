import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CoreModule } from './modules/core/core.module';
import { IamModule } from './modules/iam/iam.module';
import { TenantsModule } from './modules/tenants/tenants.module';

@Module({
  imports: [ConfigModule.forRoot(), CoreModule, IamModule, TenantsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
