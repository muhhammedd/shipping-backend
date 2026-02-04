import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TrackingService } from './tracking.service';
import { TrackingController } from './tracking.controller';
import { CoreModule } from '../core/core.module';

@Module({
    imports: [ConfigModule, CoreModule],
    controllers: [TrackingController],
    providers: [TrackingService],
    exports: [TrackingService],
})
export class TrackingModule { }
