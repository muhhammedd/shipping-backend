import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [
        ThrottlerModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => [
                {
                    ttl: configService.get('THROTTLE_TTL', 60) * 1000, // Convert to milliseconds
                    limit: configService.get('THROTTLE_LIMIT', 100),
                },
            ],
        }),
    ],
    exports: [ThrottlerModule],
})
export class ThrottleConfigModule { }
