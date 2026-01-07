import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { CoreModule } from '../core/core.module';

@Module({
  imports: [CoreModule],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
