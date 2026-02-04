import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

export class RedisIoAdapter extends IoAdapter {
    private adapterConstructor: ReturnType<typeof createAdapter>;

    async connectToRedis(): Promise<void> {
        const redisUrl = process.env.REDIS_URL;
        const host = process.env.REDIS_HOST || 'localhost';
        const port = parseInt(process.env.REDIS_PORT || '6379', 10);
        const password = process.env.REDIS_PASSWORD || undefined;

        const redisOptions = {
            host,
            port,
            password,
            lazyConnect: true,
            retryStrategy: (times: number) => {
                const delay = Math.min(times * 50, 2000);
                return times > 3 ? null : delay;
            },
        };

        try {
            // Create two Redis clients: one for publishing, one for subscribing
            const pubClient = redisUrl ? new Redis(redisUrl, redisOptions) : new Redis(redisOptions);
            const subClient = pubClient.duplicate();

            await Promise.all([pubClient.connect(), subClient.connect()]);

            this.adapterConstructor = createAdapter(pubClient, subClient);
            console.log('✅ Redis connected for WebSocket adapter');
        } catch (error) {
            console.warn('⚠️  Redis connection failed for WebSocket adapter. Falling back to default adapter.');
            console.error(error.message);
        }
    }

    createIOServer(port: number, options?: ServerOptions): any {
        const server = super.createIOServer(port, options);
        if (this.adapterConstructor) {
            server.adapter(this.adapterConstructor);
        }
        return server;
    }
}
