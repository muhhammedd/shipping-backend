import { IsArray, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OptimizeRouteDto {
    @ApiProperty({ example: ['order-1', 'order-2', 'order-3'], description: 'Order IDs to optimize' })
    @IsArray()
    @IsString({ each: true })
    orderIds: string[];

    @ApiPropertyOptional({ example: 'courier-uuid', description: 'Specific courier ID' })
    @IsString()
    @IsOptional()
    courierId?: string;
}

export class RouteStop {
    orderId: string;
    trackingNumber: string;
    recipientName: string;
    address: string;
    city: string;
    sequence: number;
    estimatedArrival?: string;
}

export class OptimizedRoute {
    courierId?: string;
    totalStops: number;
    estimatedDistance: number;
    estimatedDuration: number; // in minutes
    stops: RouteStop[];
    optimizationStrategy: string;
}
