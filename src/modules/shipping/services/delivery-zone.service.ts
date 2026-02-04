import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma.service';
import { CreateDeliveryZoneDto, UpdateDeliveryZoneDto } from '../dto/delivery-zone.dto';
import type { ActiveUserData } from '../../../common/interfaces/active-user-data.interface';

@Injectable()
export class DeliveryZoneService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Create a new delivery zone
     */
    async create(dto: CreateDeliveryZoneDto, user: ActiveUserData) {
        // Check for duplicate cities in existing zones
        const existingZones = await this.prisma.deliveryZone.findMany({
            where: {
                tenantId: user.tenantId,
                isActive: true,
            },
        });

        const duplicateCities = dto.cities.filter(city =>
            existingZones.some(zone => zone.cities.includes(city))
        );

        if (duplicateCities.length > 0) {
            throw new BadRequestException(
                `Cities already covered by other zones: ${duplicateCities.join(', ')}`
            );
        }

        return this.prisma.deliveryZone.create({
            data: {
                ...dto,
                tenantId: user.tenantId,
            },
        });
    }

    /**
     * Get all delivery zones for tenant
     */
    async findAll(user: ActiveUserData, activeOnly = false) {
        return this.prisma.deliveryZone.findMany({
            where: {
                tenantId: user.tenantId,
                ...(activeOnly && { isActive: true }),
            },
            orderBy: { name: 'asc' },
        });
    }

    /**
     * Get delivery zone by ID
     */
    async findOne(id: string, user: ActiveUserData) {
        const zone = await this.prisma.deliveryZone.findUnique({
            where: { id },
        });

        if (!zone || zone.tenantId !== user.tenantId) {
            throw new NotFoundException('Delivery zone not found');
        }

        return zone;
    }

    /**
     * Update delivery zone
     */
    async update(id: string, dto: UpdateDeliveryZoneDto, user: ActiveUserData) {
        const zone = await this.findOne(id, user);

        // Check for duplicate cities if cities are being updated
        if (dto.cities) {
            const existingZones = await this.prisma.deliveryZone.findMany({
                where: {
                    tenantId: user.tenantId,
                    isActive: true,
                    id: { not: id },
                },
            });

            const duplicateCities = dto.cities.filter(city =>
                existingZones.some(z => z.cities.includes(city))
            );

            if (duplicateCities.length > 0) {
                throw new BadRequestException(
                    `Cities already covered by other zones: ${duplicateCities.join(', ')}`
                );
            }
        }

        return this.prisma.deliveryZone.update({
            where: { id },
            data: dto,
        });
    }

    /**
     * Delete delivery zone
     */
    async remove(id: string, user: ActiveUserData) {
        await this.findOne(id, user);

        return this.prisma.deliveryZone.delete({
            where: { id },
        });
    }

    /**
     * Find zone for a specific city
     */
    async findZoneForCity(city: string, tenantId: string) {
        const zones = await this.prisma.deliveryZone.findMany({
            where: {
                tenantId,
                isActive: true,
                cities: {
                    has: city,
                },
            },
        });

        return zones[0] || null;
    }

    /**
     * Get coverage statistics
     */
    async getCoverageStats(user: ActiveUserData) {
        const zones = await this.findAll(user, true);

        const totalCities = new Set<string>();
        zones.forEach(zone => {
            zone.cities.forEach(city => totalCities.add(city));
        });

        return {
            totalZones: zones.length,
            totalCitiesCovered: totalCities.size,
            zones: zones.map(zone => ({
                id: zone.id,
                name: zone.name,
                citiesCount: zone.cities.length,
                baseRate: zone.baseRate,
                estimatedDays: zone.estimatedDays,
            })),
        };
    }
}
