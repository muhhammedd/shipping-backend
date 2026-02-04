import { Module } from '@nestjs/common';
import { RateLimitService } from './rate-limit.service';
import { RateLimitGuard } from './rate-limit.guard';
import { RateLimitController } from './rate-limit.controller';
import { CoreModule } from '../core/core.module';
import { RedisCacheModule } from '../cache/redis-cache.module';

@Module({
    imports: [CoreModule, RedisCacheModule],
    controllers: [RateLimitController],
    providers: [RateLimitService, RateLimitGuard],
    exports: [RateLimitService, RateLimitGuard],
})
export class RateLimitModule { }
