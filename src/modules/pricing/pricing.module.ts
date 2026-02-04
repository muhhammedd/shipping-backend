import { Module } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { CoreModule } from '../core/core.module';
import { PricingController } from './pricing.controller';
import { IamModule } from '../iam/iam.module';

@Module({
    imports: [CoreModule, IamModule],
    controllers: [PricingController],
    providers: [PricingService],
    exports: [PricingService],
})
export class PricingModule { }
