import { Controller, Post, Get, Param, Body, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { LabelsService } from './labels.service';
import { GenerateLabelDto, BulkGenerateLabelsDto, LabelFormat } from './dto/generate-label.dto';
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import type { ActiveUserData } from '../../common/interfaces/active-user-data.interface';
import { Roles } from '../iam/authorization/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { createReadStream } from 'fs';
import { join } from 'path';

@Controller('labels')
export class LabelsController {
    constructor(private readonly labelsService: LabelsService) { }

    @Roles(UserRole.MERCHANT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @Post('generate')
    async generateLabel(
        @Body() dto: GenerateLabelDto,
        @ActiveUser() user: ActiveUserData,
    ) {
        return this.labelsService.generateLabel(dto.orderId, user.tenantId, dto.format);
    }

    @Roles(UserRole.MERCHANT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @Post('generate/bulk')
    async generateBulkLabels(
        @Body() dto: BulkGenerateLabelsDto,
        @ActiveUser() user: ActiveUserData,
    ) {
        return this.labelsService.generateBulkLabels(dto.orderIds, user.tenantId, dto.format || LabelFormat.A4);
    }

    @Roles(UserRole.MERCHANT, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.COURIER)
    @Get('order/:orderId')
    async getLabel(
        @Param('orderId') orderId: string,
        @ActiveUser() user: ActiveUserData,
    ) {
        return this.labelsService.getLabel(orderId, user.tenantId);
    }

    @Roles(UserRole.MERCHANT, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.COURIER)
    @Get('order/:orderId/download')
    async downloadLabel(
        @Param('orderId') orderId: string,
        @ActiveUser() user: ActiveUserData,
        @Res() res: Response,
    ) {
        const label = await this.labelsService.getLabel(orderId, user.tenantId);

        const uploadsDir = process.env.UPLOADS_DIR || 'uploads';
        const filePath = join(uploadsDir, label.labelUrl);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="label-${label.order.trackingNumber}.pdf"`);

        const fileStream = createReadStream(filePath);
        fileStream.pipe(res);
    }
}
