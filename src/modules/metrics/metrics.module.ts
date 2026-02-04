import { Module } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { MetricsController } from './metrics.controller';

@Module({
    imports: [
        PrometheusModule.register({
            path: '/metrics',
            controller: MetricsController,
            defaultMetrics: {
                enabled: true,
                config: {
                    prefix: 'shipex_'
                }
            },
        }),
    ],
    controllers: [MetricsController],
})
export class MetricsModule { }
