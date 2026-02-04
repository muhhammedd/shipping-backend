import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-ioredis-yet';

@Global()
@Module({
    imports: [
        CacheModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => {
                const redisHost = configService.get('REDIS_HOST');
                const redisPort = configService.get('REDIS_PORT');
                const redisPassword = configService.get('REDIS_PASSWORD');
                const redisTtl = configService.get('REDIS_TTL', 3600);

                // Try to use Redis if configured, otherwise fall back to in-memory cache
                if (redisHost && redisPort) {
                    try {
                        return {
                            store: await redisStore({
                                host: redisHost,
                                port: redisPort,
                                password: redisPassword || undefined,
                                ttl: redisTtl * 1000, // Convert to milliseconds
                            }),
                        };
                    } catch (error) {
                        console.warn(
                            '⚠️  Redis connection failed, falling back to in-memory cache',
                            error,
                        );
                        return {
                            ttl: redisTtl * 1000,
                            max: 100,
                        };
                    }
                }

                // In-memory cache fallback
                console.log('ℹ️  Using in-memory cache (Redis not configured)');
                return {
                    ttl: redisTtl * 1000,
                    max: 100,
                };
            },
        }),
    ],
    exports: [CacheModule],
})
export class RedisCacheModule { }
