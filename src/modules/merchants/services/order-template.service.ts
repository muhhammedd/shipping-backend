import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma.service';
import { CreateTemplateDto, UpdateTemplateDto, CreateOrderFromTemplateDto } from '../dto/order-template.dto';
import { OrdersService } from '../../orders/orders.service';
import type { ActiveUserData } from '../../../common/interfaces/active-user-data.interface';

@Injectable()
export class OrderTemplateService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly ordersService: OrdersService,
    ) { }

    /**
     * Get all templates for a merchant
     */
    async findAll(user: ActiveUserData) {
        const merchantProfile = await this.prisma.merchantProfile.findUnique({
            where: { userId: user.sub },
        });

        if (!merchantProfile) {
            throw new NotFoundException('Merchant profile not found');
        }

        return this.prisma.orderTemplate.findMany({
            where: {
                merchantId: merchantProfile.id,
                deletedAt: null,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    /**
     * Get a single template
     */
    async findOne(id: string, user: ActiveUserData) {
        const merchantProfile = await this.prisma.merchantProfile.findUnique({
            where: { userId: user.sub },
        });

        if (!merchantProfile) {
            throw new NotFoundException('Merchant profile not found');
        }

        const template = await this.prisma.orderTemplate.findFirst({
            where: {
                id,
                merchantId: merchantProfile.id,
                deletedAt: null,
            },
        });

        if (!template) {
            throw new NotFoundException('Template not found');
        }

        return template;
    }

    /**
     * Create a new template
     */
    async create(dto: CreateTemplateDto, user: ActiveUserData) {
        const merchantProfile = await this.prisma.merchantProfile.findUnique({
            where: { userId: user.sub },
        });

        if (!merchantProfile) {
            throw new NotFoundException('Merchant profile not found');
        }

        return this.prisma.orderTemplate.create({
            data: {
                ...dto,
                merchantId: merchantProfile.id,
                tenantId: user.tenantId,
            },
        });
    }

    /**
     * Update a template
     */
    async update(id: string, dto: UpdateTemplateDto, user: ActiveUserData) {
        const merchantProfile = await this.prisma.merchantProfile.findUnique({
            where: { userId: user.sub },
        });

        if (!merchantProfile) {
            throw new NotFoundException('Merchant profile not found');
        }

        // Verify ownership
        const template = await this.prisma.orderTemplate.findFirst({
            where: {
                id,
                merchantId: merchantProfile.id,
                deletedAt: null,
            },
        });

        if (!template) {
            throw new NotFoundException('Template not found');
        }

        return this.prisma.orderTemplate.update({
            where: { id },
            data: dto,
        });
    }

    /**
     * Soft delete a template
     */
    async remove(id: string, user: ActiveUserData) {
        const merchantProfile = await this.prisma.merchantProfile.findUnique({
            where: { userId: user.sub },
        });

        if (!merchantProfile) {
            throw new NotFoundException('Merchant profile not found');
        }

        // Verify ownership
        const template = await this.prisma.orderTemplate.findFirst({
            where: {
                id,
                merchantId: merchantProfile.id,
                deletedAt: null,
            },
        });

        if (!template) {
            throw new NotFoundException('Template not found');
        }

        return this.prisma.orderTemplate.update({
            where: { id },
            data: {
                deletedAt: new Date(),
            },
        });
    }

    /**
     * Create an order from a template
     */
    async createOrderFromTemplate(dto: CreateOrderFromTemplateDto, user: ActiveUserData) {
        const template = await this.findOne(dto.templateId, user);

        if (!template) {
            throw new NotFoundException('Template not found');
        }

        // Merge template data with overrides
        const orderData = {
            recipientName: dto.overrides?.recipientName || template.recipientName,
            recipientPhone: dto.overrides?.recipientPhone || template.recipientPhone,
            address: dto.overrides?.address || template.address,
            city: dto.overrides?.city || template.city,
            price: dto.overrides?.price || Number(template.price),
            codAmount: dto.overrides?.codAmount || Number(template.codAmount),
            notes: (dto.overrides?.notes || template.notes) ?? undefined,
        };

        // Create order using orders service
        return this.ordersService.create(orderData, user);
    }

    /**
     * Duplicate a template
     */
    async duplicate(id: string, user: ActiveUserData) {
        const template = await this.findOne(id, user);

        if (!template) {
            throw new NotFoundException('Template not found');
        }

        const merchantProfile = await this.prisma.merchantProfile.findUnique({
            where: { userId: user.sub },
        });

        if (!merchantProfile) {
            throw new NotFoundException('Merchant profile not found');
        }

        return this.prisma.orderTemplate.create({
            data: {
                name: `${template.name} (Copy)`,
                recipientName: template.recipientName,
                recipientPhone: template.recipientPhone,
                address: template.address,
                city: template.city,
                price: template.price,
                codAmount: template.codAmount,
                notes: template.notes,
                merchantId: merchantProfile.id,
                tenantId: user.tenantId,
            },
        });
    }
}
