import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma.service';
import { CalculateShippingCostDto, ShippingCostBreakdown } from '../dto/calculate-cost.dto';
import { DeliveryZoneService } from './delivery-zone.service';

@Injectable()
export class ShippingCostService {
    // Pricing constants
    private readonly WEIGHT_RATE_PER_KG = 5.00;
    private readonly COD_FEE_PERCENT = 0.02; // 2% of COD amount
    private readonly EXPRESS_SURCHARGE = 20.00;
    private readonly INSURANCE_RATE = 0.01; // 1% of insured value
    private readonly FUEL_SURCHARGE_PERCENT = 0.05; // 5% fuel surcharge
    private readonly TAX_RATE = 0.14; // 14% VAT
    private readonly DEFAULT_BASE_RATE = 30.00;
    private readonly DEFAULT_ESTIMATED_DAYS = 3;

    constructor(
        private readonly prisma: PrismaService,
        private readonly deliveryZoneService: DeliveryZoneService,
    ) { }

    /**
     * Calculate shipping cost with detailed breakdown
     */
    async calculateCost(
        dto: CalculateShippingCostDto,
        tenantId: string,
    ): Promise<ShippingCostBreakdown> {
        // Find delivery zone for destination city
        const zone = await this.deliveryZoneService.findZoneForCity(dto.toCity, tenantId);

        // Base rate from zone or default
        const baseRate = zone ? Number(zone.baseRate) : this.DEFAULT_BASE_RATE;
        const estimatedDays = zone ? zone.estimatedDays : this.DEFAULT_ESTIMATED_DAYS;

        // Calculate distance cost (simplified - in production, use actual distance)
        const estimatedDistance = this.estimateDistance(dto.fromCity, dto.toCity);
        const perKmRate = zone ? Number(zone.perKmRate) : 2.00;
        const distanceCost = estimatedDistance * perKmRate;

        // Weight cost
        const weightCost = (dto.weight || 0) * this.WEIGHT_RATE_PER_KG;

        // COD fee
        const codFee = (dto.codAmount || 0) * this.COD_FEE_PERCENT;

        // Express surcharge
        const expressSurcharge = dto.isExpress ? this.EXPRESS_SURCHARGE : 0;

        // Insurance fee
        const insuranceFee = (dto.insuranceValue || 0) * this.INSURANCE_RATE;

        // Subtotal before fuel surcharge
        const subtotalBeforeFuel = baseRate + distanceCost + weightCost + codFee + expressSurcharge + insuranceFee;

        // Fuel surcharge
        const fuelSurcharge = subtotalBeforeFuel * this.FUEL_SURCHARGE_PERCENT;

        // Discount (can be customized based on business rules)
        const discount = 0;

        // Subtotal
        const subtotal = subtotalBeforeFuel + fuelSurcharge - discount;

        // Tax
        const tax = subtotal * this.TAX_RATE;

        // Total
        const total = subtotal + tax;

        return {
            baseRate,
            distanceCost: Math.round(distanceCost * 100) / 100,
            weightCost: Math.round(weightCost * 100) / 100,
            codFee: Math.round(codFee * 100) / 100,
            expressSurcharge,
            insuranceFee: Math.round(insuranceFee * 100) / 100,
            fuelSurcharge: Math.round(fuelSurcharge * 100) / 100,
            discount,
            subtotal: Math.round(subtotal * 100) / 100,
            tax: Math.round(tax * 100) / 100,
            total: Math.round(total * 100) / 100,
            estimatedDays: dto.isExpress ? Math.max(1, estimatedDays - 1) : estimatedDays,
            zone: zone?.name,
        };
    }

    /**
     * Estimate distance between cities (simplified)
     * In production, use actual distance calculation or Google Maps API
     */
    private estimateDistance(fromCity: string, toCity: string): number {
        // Simplified distance estimation
        // Same city = 10km, different cities = 100-300km based on major routes

        if (fromCity.toLowerCase() === toCity.toLowerCase()) {
            return 10;
        }

        // Major city pairs with estimated distances
        const cityDistances: Record<string, Record<string, number>> = {
            'cairo': {
                'alexandria': 220,
                'giza': 15,
                'port said': 220,
                'suez': 134,
                'luxor': 670,
                'aswan': 880,
            },
            'alexandria': {
                'cairo': 220,
                'port said': 240,
                'tanta': 90,
            },
        };

        const from = fromCity.toLowerCase();
        const to = toCity.toLowerCase();

        if (cityDistances[from]?.[to]) {
            return cityDistances[from][to];
        }

        if (cityDistances[to]?.[from]) {
            return cityDistances[to][from];
        }

        // Default estimate for unknown routes
        return 150;
    }

    /**
     * Get bulk pricing for multiple orders
     */
    async calculateBulkCost(
        orders: CalculateShippingCostDto[],
        tenantId: string,
    ) {
        const calculations = await Promise.all(
            orders.map(order => this.calculateCost(order, tenantId))
        );

        const totalCost = calculations.reduce((sum, calc) => sum + calc.total, 0);
        const averageCost = totalCost / calculations.length;

        // Bulk discount (e.g., 5% for 10+ orders, 10% for 50+ orders)
        let bulkDiscountPercent = 0;
        if (orders.length >= 50) {
            bulkDiscountPercent = 0.10;
        } else if (orders.length >= 10) {
            bulkDiscountPercent = 0.05;
        }

        const bulkDiscount = totalCost * bulkDiscountPercent;
        const finalTotal = totalCost - bulkDiscount;

        return {
            orderCount: orders.length,
            totalCost: Math.round(totalCost * 100) / 100,
            averageCost: Math.round(averageCost * 100) / 100,
            bulkDiscountPercent,
            bulkDiscount: Math.round(bulkDiscount * 100) / 100,
            finalTotal: Math.round(finalTotal * 100) / 100,
            calculations,
        };
    }
}
