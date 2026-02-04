import { Controller, Get } from '@nestjs/common';
import {
    HealthCheck,
    HealthCheckService,
    HttpHealthIndicator,
    MemoryHealthIndicator,
    PrismaHealthIndicator,
    DiskHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../core/prisma.service';

@Controller('health')
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private http: HttpHealthIndicator,
        private memory: MemoryHealthIndicator,
        private disk: DiskHealthIndicator,
        private prisma: PrismaService, // Direct access for manual checks if needed, but Terminus usually wraps it
    ) { }

    @Get()
    @HealthCheck()
    check() {
        return this.health.check([
            // Check heap memory usage > 150MB
            () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
            // Check disk storage > 50% full (generic threshold)
            () =>
                this.disk.checkStorage('storage', { path: '/', thresholdPercent: 0.5 }),

            // Ping database
            async () => {
                try {
                    await this.prisma.$queryRaw`SELECT 1`;
                    return {
                        database: {
                            status: 'up',
                        }
                    }
                } catch (e) {
                    return {
                        database: {
                            status: 'down',
                            message: e.message
                        }
                    }
                }
            }
        ]);
    }
}
