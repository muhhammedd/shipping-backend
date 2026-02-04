import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LabelsService } from './labels.service';
import { LabelsController } from './labels.controller';
import { CoreModule } from '../core/core.module';

@Module({
    imports: [ConfigModule, CoreModule],
    controllers: [LabelsController],
    providers: [LabelsService],
    exports: [LabelsService],
})
export class LabelsModule { }
