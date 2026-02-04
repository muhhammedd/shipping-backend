import { Module } from '@nestjs/common';
import { CoreModule } from '../core/core.module';
import { ShippingModule } from '../shipping/shipping.module';
import { DeliveryProofService } from './services/delivery-proof.service';
import { CourierService } from './services/courier.service';
import { DeliveryProofController } from './controllers/delivery-proof.controller';
import { CourierController } from './controllers/courier.controller';

@Module({
    imports: [CoreModule, ShippingModule],
    providers: [DeliveryProofService, CourierService],
    controllers: [DeliveryProofController, CourierController],
    exports: [DeliveryProofService, CourierService],
})
export class CourierModule { }
