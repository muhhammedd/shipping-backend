import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ShippingService } from './shipping.service';
import { ShippingController } from './shipping.controller';
import { DeliveryZoneService } from './services/delivery-zone.service';
import { ShippingCostService } from './services/shipping-cost.service';
import { AddressValidationService } from './services/address-validation.service';
import { RouteOptimizerService } from './services/route-optimizer.service';
import { TimeSlotService } from './services/time-slot.service';
import { FailedDeliveryService } from './services/failed-delivery.service';
import { CoreModule } from '../core/core.module';

@Module({
    imports: [ConfigModule, CoreModule],
    controllers: [ShippingController],
    providers: [
        ShippingService,
        DeliveryZoneService,
        ShippingCostService,
        AddressValidationService,
        RouteOptimizerService,
        TimeSlotService,
        FailedDeliveryService,
    ],
    exports: [
        ShippingService,
        DeliveryZoneService,
        ShippingCostService,
        AddressValidationService,
        RouteOptimizerService,
        TimeSlotService,
        FailedDeliveryService,
    ],
})
export class ShippingModule { }
