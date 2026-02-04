import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderDeliveryController } from './controllers/order-delivery.controller';
import { CoreModule } from '../core/core.module';
import { OrderRepository } from './repositories/order.repository';
import { OrderImportService } from './services/order-import.service';
import { OrderNotesService } from './services/order-notes.service';
import { OrderOperationsService } from './services/order-operations.service';
import { ShippingModule } from '../shipping/shipping.module';

@Module({
  imports: [CoreModule, ShippingModule],
  controllers: [OrdersController, OrderDeliveryController],
  providers: [
    OrdersService,
    OrderRepository,
    OrderImportService,
    OrderNotesService,
    OrderOperationsService,
  ],
  exports: [OrdersService],
})
export class OrdersModule { }
