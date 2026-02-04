import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CalculateShippingCostDto {
    @ApiProperty({ example: 'Cairo' })
    @IsString()
    @IsNotEmpty()
    fromCity: string;

    @ApiProperty({ example: 'Alexandria' })
    @IsString()
    @IsNotEmpty()
    toCity: string;

    @ApiPropertyOptional({ example: 2.5, description: 'Package weight in kg' })
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    @IsOptional()
    weight?: number;

    @ApiPropertyOptional({ example: 500.00, description: 'COD amount' })
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    @IsOptional()
    codAmount?: number;

    @ApiPropertyOptional({ example: true, description: 'Express delivery' })
    @IsBoolean()
    @IsOptional()
    isExpress?: boolean;

    @ApiPropertyOptional({ example: 1000.00, description: 'Insurance value' })
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    @IsOptional()
    insuranceValue?: number;
}

export class ShippingCostBreakdown {
    baseRate: number;
    distanceCost: number;
    weightCost: number;
    codFee: number;
    expressSurcharge: number;
    insuranceFee: number;
    fuelSurcharge: number;
    discount: number;
    subtotal: number;
    tax: number;
    total: number;
    estimatedDays: number;
    zone?: string;
}
