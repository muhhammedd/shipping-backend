import { Controller, Get, Res } from '@nestjs/common';
import { PrometheusController } from '@willsoto/nestjs-prometheus';
import type { Response } from 'express';
import { Roles } from '../iam/authorization/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('metrics')
export class MetricsController extends PrometheusController {
    @Get()
    // @Roles(UserRole.SUPER_ADMIN) // Protect if needed, though usually internal scraper accesses this
    async index(@Res({ passthrough: true }) response: Response) {
        return super.index(response);
    }
}
