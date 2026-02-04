import { Module } from '@nestjs/common';
import { CoreModule } from '../core/core.module';
import { OrdersModule } from '../orders/orders.module';
import { AddressBookService } from './services/address-book.service';
import { OrderTemplateService } from './services/order-template.service';
import { AddressBookController } from './controllers/address-book.controller';
import { OrderTemplateController } from './controllers/order-template.controller';

@Module({
    imports: [CoreModule, OrdersModule],
    providers: [AddressBookService, OrderTemplateService],
    controllers: [AddressBookController, OrderTemplateController],
    exports: [AddressBookService, OrderTemplateService],
})
export class MerchantsModule { }
