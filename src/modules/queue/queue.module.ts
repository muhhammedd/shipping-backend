import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
    imports: [
        BullModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                connection: {
                    host: configService.get('REDIS_HOST') || 'localhost',
                    port: parseInt(configService.get('REDIS_PORT') || '6379'),
                    password: configService.get('REDIS_PASSWORD') || undefined,
                    lazyConnect: true,
                    retryStrategy: (times: number) => {
                        // Retry forever with max 5s delay
                        return Math.min(times * 500, 5000);
                    },
                },
            }),
            inject: [ConfigService],
        }),
    ],
    exports: [BullModule],
})
export class QueueModule { }
