import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { CoreModule } from '../core/core.module';

@Module({
  imports: [CoreModule],
  providers: [OrdersService],
  controllers: [OrdersController],
})
export class OrdersModule {}
