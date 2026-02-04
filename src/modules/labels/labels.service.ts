import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../core/prisma.service';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import * as bwipjs from 'bwip-js';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import { LabelFormat } from './dto/generate-label.dto';

@Injectable()
export class LabelsService {
    private readonly logger = new Logger(LabelsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) { }

    async generateLabel(orderId: string, tenantId: string, format: LabelFormat = LabelFormat.A4) {
        // 1. Fetch order details
        const order = await this.prisma.order.findFirst({
            where: { id: orderId, tenantId },
            include: {
                merchant: { include: { user: true } },
                courier: { include: { user: true } },
                tenant: true,
            },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        // 2. Check if label already exists
        const existingLabel = await this.prisma.shippingLabel.findUnique({
            where: { orderId },
        });

        if (existingLabel) {
            return existingLabel;
        }

        // 3. Generate QR code
        const qrCodeDataUrl = await QRCode.toDataURL(order.trackingNumber, {
            width: 200,
            margin: 1,
        });

        // 4. Generate barcode
        const barcodeBuffer = await this.generateBarcode(order.trackingNumber);

        // 5. Generate PDF
        const labelPath = await this.createPDF(order, qrCodeDataUrl, barcodeBuffer, format);

        // 6. Save to database
        const label = await this.prisma.shippingLabel.create({
            data: {
                orderId: order.id,
                tenantId: order.tenantId,
                labelUrl: labelPath,
                format,
            },
        });

        this.logger.log(`Generated shipping label for order ${order.trackingNumber}`);
        return label;
    }

    async generateBulkLabels(orderIds: string[], tenantId: string, format: LabelFormat) {
        const labels: any[] = [];
        for (const orderId of orderIds) {
            try {
                const label = await this.generateLabel(orderId, tenantId, format);
                labels.push(label);
            } catch (error) {
                this.logger.error(`Failed to generate label for order ${orderId}:`, error.message);
            }
        }
        return labels;
    }

    async getLabel(orderId: string, tenantId: string) {
        const label = await this.prisma.shippingLabel.findFirst({
            where: { orderId, tenantId },
            include: { order: true },
        });

        if (!label) {
            throw new NotFoundException('Label not found');
        }

        return label;
    }

    private async generateBarcode(trackingNumber: string): Promise<Buffer> {
        try {
            const png = await bwipjs.toBuffer({
                bcid: 'code128',
                text: trackingNumber,
                scale: 3,
                height: 10,
                includetext: true,
                textxalign: 'center',
            });
            return png;
        } catch (error) {
            this.logger.error('Barcode generation failed:', error);
            throw new BadRequestException('Failed to generate barcode');
        }
    }

    private async createPDF(
        order: any,
        qrCodeDataUrl: string,
        barcodeBuffer: Buffer,
        format: LabelFormat,
    ): Promise<string> {
        const uploadsDir = this.configService.get('UPLOADS_DIR') || 'uploads';
        const labelsDir = join(uploadsDir, 'labels');
        const fileName = `label-${order.trackingNumber}-${Date.now()}.pdf`;
        const filePath = join(labelsDir, fileName);

        // Create directory if it doesn't exist
        const fs = require('fs');
        if (!fs.existsSync(labelsDir)) {
            fs.mkdirSync(labelsDir, { recursive: true });
        }

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({
                size: format === LabelFormat.A4 ? 'A4' : [288, 432], // 4x6 inches in points
                margin: 20,
            });

            const stream = createWriteStream(filePath);
            doc.pipe(stream);

            // Header
            doc.fontSize(20).font('Helvetica-Bold').text('SHIPPING LABEL', { align: 'center' });
            doc.moveDown(0.5);

            // Tracking Number (Large)
            doc.fontSize(16).font('Helvetica-Bold').text(`Tracking: ${order.trackingNumber}`, { align: 'center' });
            doc.moveDown();

            // Barcode
            doc.image(barcodeBuffer, {
                fit: [250, 80],
                align: 'center',
            });
            doc.moveDown();

            // From Section
            doc.fontSize(12).font('Helvetica-Bold').text('FROM:', { underline: true });
            doc.fontSize(10).font('Helvetica')
                .text(`Merchant: ${order.merchant.companyName}`)
                .text(`Email: ${order.merchant.user.email}`)
                .moveDown();

            // To Section
            doc.fontSize(12).font('Helvetica-Bold').text('TO:', { underline: true });
            doc.fontSize(10).font('Helvetica')
                .text(`Name: ${order.recipientName}`)
                .text(`Phone: ${order.recipientPhone}`)
                .text(`Address: ${order.address}`)
                .text(`City: ${order.city}`)
                .moveDown();

            // Order Details
            doc.fontSize(12).font('Helvetica-Bold').text('ORDER DETAILS:', { underline: true });
            doc.fontSize(10).font('Helvetica')
                .text(`Status: ${order.status}`)
                .text(`Price: ${order.price} EGP`)
                .text(`COD Amount: ${order.codAmount} EGP`)
                .moveDown();

            // QR Code
            doc.fontSize(10).font('Helvetica-Bold').text('Scan for tracking:', { align: 'center' });
            doc.image(qrCodeDataUrl, {
                fit: [120, 120],
                align: 'center',
            });

            // Footer
            doc.moveDown();
            doc.fontSize(8).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
            doc.text(`Powered by Shipex`, { align: 'center' });

            doc.end();

            stream.on('finish', () => resolve(`/labels/${fileName}`));
            stream.on('error', reject);
        });
    }
}
