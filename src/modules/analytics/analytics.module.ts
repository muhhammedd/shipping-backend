import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { CoreModule } from '../core/core.module';
import { IamModule } from '../iam/iam.module';

@Module({
    imports: [CoreModule, IamModule],
    controllers: [AnalyticsController],
    providers: [AnalyticsService],
    exports: [AnalyticsService],
})
export class AnalyticsModule { }
