
import { Module } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { ApiKeysController } from './api-keys.controller';
import { KeyRotationService } from './key-rotation.service';
import { CoreModule } from '../../core/core.module';

@Module({
    imports: [CoreModule],
    providers: [ApiKeysService, KeyRotationService],
    controllers: [ApiKeysController],
    exports: [ApiKeysService, KeyRotationService],
})
export class ApiKeysModule { }
