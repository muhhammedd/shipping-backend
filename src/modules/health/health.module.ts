import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { CoreModule } from '../core/core.module';

@Module({
    imports: [TerminusModule, HttpModule, CoreModule],
    controllers: [HealthController],
})
export class HealthModule { }
