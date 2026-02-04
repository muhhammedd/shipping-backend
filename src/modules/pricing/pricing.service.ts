import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../core/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { CalculateRateDto, ServiceTypeCode } from './dto/calculate-rate.dto';

@Injectable()
export class PricingService {
    private readonly logger = new Logger(PricingService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Enhanced Rate Calculation with Service Types
     */
    async calculateRate(tenantId: string, dto: CalculateRateDto) {
        // 1. Resolve zones for origin and destination
        const originZone = dto.origin.zone || (await this.resolveZoneForCity(tenantId, dto.origin.city));
        const destZone = dto.destination.zone || (await this.resolveZoneForCity(tenantId, dto.destination.city));

        if (!originZone || !destZone) {
            throw new NotFoundException('Unable to determine shipping zones for provided cities');
        }

        // 2. Get destination zone pricing
        const zone = await this.prisma.shippingZone.findFirst({
            where: {
                tenantId,
                name: destZone,
                isActive: true,
            },
            include: { pricingRules: true },
        });

        if (!zone || !zone.pricingRules.length) {
            throw new NotFoundException(`No pricing rules found for zone '${destZone}'`);
        }

        const rule = zone.pricingRules[0];

        // 3. Calculate base rate
        let baseRate = new Decimal(rule.basePrice);

        // 4. Add weight charges
        if (dto.weight > 1) {
            const extraWeight = new Decimal(dto.weight).minus(1);
            const weightCharge = extraWeight.times(new Decimal(rule.additionalKgPrice));
            baseRate = baseRate.plus(weightCharge);
        }

        // 5. Apply service type multiplier
        const serviceType = await this.prisma.serviceType.findFirst({
            where: {
                tenantId,
                code: dto.serviceType || ServiceTypeCode.STANDARD,
            },
        });

        let serviceCharge = new Decimal(0);
        let estimatedDeliveryDays = 3; // default

        if (serviceType) {
            const multiplier = new Decimal(serviceType.priceMultiplier);
            serviceCharge = baseRate.times(multiplier).minus(baseRate);
            estimatedDeliveryDays = serviceType.deliveryDays;
        }

        // 6. Calculate COD fee
        let codFee = new Decimal(0);
        if (dto.codAmount && dto.codAmount > 0) {
            codFee = new Decimal(rule.codFee);
        }

        // 7. Calculate dimensional weight (if dimensions provided)
        let dimensionalWeightCharge = new Decimal(0);
        if (dto.dimensions) {
            const dimWeight = this.calculateDimensionalWeight(dto.dimensions);
            if (dimWeight > dto.weight) {
                const extraDimWeight = new Decimal(dimWeight).minus(dto.weight);
                dimensionalWeightCharge = extraDimWeight.times(new Decimal(rule.additionalKgPrice));
            }
        }

        // 8. Calculate total
        const totalCost = baseRate
            .plus(serviceCharge)
            .plus(codFee)
            .plus(dimensionalWeightCharge);

        // 9. Calculate estimated delivery date
        const estimatedDelivery = new Date();
        estimatedDelivery.setDate(estimatedDelivery.getDate() + estimatedDeliveryDays);

        return {
            baseRate: baseRate.toNumber(),
            weightCharge: dto.weight > 1 ? baseRate.minus(rule.basePrice).toNumber() : 0,
            serviceCharge: serviceCharge.toNumber(),
            codFee: codFee.toNumber(),
            dimensionalWeightCharge: dimensionalWeightCharge.toNumber(),
            totalCost: totalCost.toNumber(),
            estimatedDelivery: estimatedDelivery.toISOString().split('T')[0],
            currency: 'EGP',
            breakdown: {
                originZone,
                destinationZone: destZone,
                serviceType: dto.serviceType || ServiceTypeCode.STANDARD,
                weight: dto.weight,
                dimensionalWeight: dto.dimensions ? this.calculateDimensionalWeight(dto.dimensions) : null,
            },
        };
    }

    /**
     * Legacy method for backward compatibility
     */
    async calculateShippingCost(
        tenantId: string,
        zoneName: string,
        weightKg: number,
        codAmount: number = 0,
    ): Promise<Decimal> {
        const zone = await this.prisma.shippingZone.findFirst({
            where: {
                tenantId,
                name: zoneName,
                isActive: true,
            },
            include: { pricingRules: true },
        });

        if (!zone) {
            throw new NotFoundException(`Shipping zone '${zoneName}' not found`);
        }

        const rule = zone.pricingRules[0];
        if (!rule) {
            throw new NotFoundException(`No pricing rules defined for zone '${zoneName}'`);
        }

        let totalCost = new Decimal(rule.basePrice);

        if (weightKg > 1) {
            const extraWeight = new Decimal(weightKg).minus(1);
            const weightSurcharge = extraWeight.times(new Decimal(rule.additionalKgPrice));
            totalCost = totalCost.plus(weightSurcharge);
        }

        if (codAmount > 0) {
            totalCost = totalCost.plus(new Decimal(rule.codFee));
        }

        return totalCost;
    }

    /**
     * Calculate dimensional weight (L x W x H / 5000)
     */
    private calculateDimensionalWeight(dimensions: { length: number; width: number; height: number }): number {
        return (dimensions.length * dimensions.width * dimensions.height) / 5000;
    }

    /**
     * Resolve zone for a given city
     */
    async resolveZoneForCity(tenantId: string, city: string): Promise<string | null> {
        const zone = await this.prisma.shippingZone.findFirst({
            where: {
                tenantId,
                cities: { has: city },
            },
            select: { name: true },
        });

        return zone?.name || null;
    }

    /**
     * List all available zones for a tenant
     */
    async listZones(tenantId: string) {
        return this.prisma.shippingZone.findMany({
            where: { tenantId, isActive: true },
            include: { pricingRules: true },
        });
    }

    /**
     * List all service types for a tenant
     */
    async listServiceTypes(tenantId: string) {
        return this.prisma.serviceType.findMany({
            where: { tenantId },
            orderBy: { deliveryDays: 'asc' },
        });
    }
}
