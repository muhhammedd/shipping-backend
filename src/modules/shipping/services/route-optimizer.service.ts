import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma.service';
import { OptimizeRouteDto, OptimizedRoute, RouteStop } from '../dto/optimize-route.dto';
import type { ActiveUserData } from '../../../common/interfaces/active-user-data.interface';

@Injectable()
export class RouteOptimizerService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Optimize delivery route for orders
     * Uses a simple nearest-neighbor algorithm grouped by city
     */
    async optimizeRoute(dto: OptimizeRouteDto, user: ActiveUserData): Promise<OptimizedRoute> {
        // Fetch orders
        const orders = await this.prisma.order.findMany({
            where: {
                id: { in: dto.orderIds },
                tenantId: user.tenantId,
            },
            select: {
                id: true,
                trackingNumber: true,
                recipientName: true,
                address: true,
                city: true,
                timeSlot: true,
            },
        });

        if (orders.length === 0) {
            throw new NotFoundException('No valid orders found');
        }

        // Group orders by city
        const ordersByCity = this.groupByCity(orders);

        // Optimize within each city group
        const optimizedStops: RouteStop[] = [];
        let sequence = 1;
        let totalDistance = 0;

        // Sort cities by priority (can be customized)
        const sortedCities = Object.keys(ordersByCity).sort();

        for (const city of sortedCities) {
            const cityOrders = ordersByCity[city];

            // Sort by time slot if available, otherwise by order ID
            cityOrders.sort((a, b) => {
                if (a.timeSlot && b.timeSlot) {
                    return a.timeSlot.slotStart.localeCompare(b.timeSlot.slotStart);
                }
                return a.id.localeCompare(b.id);
            });

            // Add to route
            for (const order of cityOrders) {
                optimizedStops.push({
                    orderId: order.id,
                    trackingNumber: order.trackingNumber,
                    recipientName: order.recipientName,
                    address: order.address,
                    city: order.city,
                    sequence: sequence++,
                });
            }

            // Estimate distance within city (5km per stop on average)
            totalDistance += cityOrders.length * 5;
        }

        // Add inter-city distances (simplified)
        if (sortedCities.length > 1) {
            totalDistance += (sortedCities.length - 1) * 50; // 50km between cities
        }

        // Estimate duration (30 min per stop + travel time at 40km/h)
        const stopTime = optimizedStops.length * 30;
        const travelTime = (totalDistance / 40) * 60; // Convert hours to minutes
        const estimatedDuration = Math.round(stopTime + travelTime);

        return {
            courierId: dto.courierId,
            totalStops: optimizedStops.length,
            estimatedDistance: Math.round(totalDistance),
            estimatedDuration,
            stops: optimizedStops,
            optimizationStrategy: 'city_grouping_with_time_slots',
        };
    }

    /**
     * Get optimized routes for all couriers
     */
    async optimizeAllRoutes(user: ActiveUserData) {
        // Get all assigned orders
        const orders = await this.prisma.order.findMany({
            where: {
                tenantId: user.tenantId,
                status: { in: ['ASSIGNED', 'PICKED_UP'] },
                courierId: { not: null },
            },
            select: {
                id: true,
                courierId: true,
            },
        });

        // Group by courier
        const ordersByCourier: Record<string, string[]> = {};
        orders.forEach(order => {
            if (order.courierId) {
                if (!ordersByCourier[order.courierId]) {
                    ordersByCourier[order.courierId] = [];
                }
                ordersByCourier[order.courierId].push(order.id);
            }
        });

        // Optimize route for each courier
        const routes = await Promise.all(
            Object.entries(ordersByCourier).map(([courierId, orderIds]) =>
                this.optimizeRoute({ orderIds, courierId }, user)
            )
        );

        return {
            totalCouriers: routes.length,
            totalOrders: orders.length,
            routes,
        };
    }

    /**
     * Group orders by city
     */
    private groupByCity(orders: any[]): Record<string, any[]> {
        const grouped: Record<string, any[]> = {};

        orders.forEach(order => {
            if (!grouped[order.city]) {
                grouped[order.city] = [];
            }
            grouped[order.city].push(order);
        });

        return grouped;
    }

    /**
     * Get courier's current route
     */
    async getCourierRoute(courierId: string, user: ActiveUserData) {
        const courier = await this.prisma.courierProfile.findUnique({
            where: { id: courierId },
        });

        if (!courier || courier.tenantId !== user.tenantId) {
            throw new NotFoundException('Courier not found');
        }

        // Get courier's assigned orders
        const orders = await this.prisma.order.findMany({
            where: {
                courierId,
                status: { in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'] },
            },
            select: { id: true },
        });

        if (orders.length === 0) {
            return {
                courierId,
                totalStops: 0,
                estimatedDistance: 0,
                estimatedDuration: 0,
                stops: [],
                optimizationStrategy: 'none',
            };
        }

        return this.optimizeRoute(
            { orderIds: orders.map(o => o.id), courierId },
            user
        );
    }
}
