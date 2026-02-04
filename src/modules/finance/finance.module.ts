import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { CoreModule } from '../core/core.module';
import { FinanceController } from './finance.controller';
import { FinanceAdminController } from './finance.admin.controller';
import { IamModule } from '../iam/iam.module';
import { BillingModule } from './billing/billing.module';

@Module({
  imports: [CoreModule, IamModule, BillingModule],
  controllers: [FinanceController, FinanceAdminController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule { }
