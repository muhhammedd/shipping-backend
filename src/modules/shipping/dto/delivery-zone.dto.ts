import { IsString, IsNotEmpty, IsNumber, IsBoolean, IsArray, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateDeliveryZoneDto {
    @ApiProperty({ example: 'Greater Cairo' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: ['Cairo', 'Giza', 'Shubra El Kheima'], description: 'Cities covered by this zone' })
    @IsArray()
    @IsString({ each: true })
    cities: string[];

    @ApiProperty({ example: 50.00, description: 'Base delivery rate' })
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    baseRate: number;

    @ApiProperty({ example: 2.50, description: 'Rate per kilometer' })
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    perKmRate: number;

    @ApiProperty({ example: 2, description: 'Estimated delivery days' })
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    estimatedDays: number;

    @ApiPropertyOptional({ example: true, default: true })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

export class UpdateDeliveryZoneDto {
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    name?: string;

    @ApiPropertyOptional()
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    cities?: string[];

    @ApiPropertyOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    @IsOptional()
    baseRate?: number;

    @ApiPropertyOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    @IsOptional()
    perKmRate?: number;

    @ApiPropertyOptional()
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    @IsOptional()
    estimatedDays?: number;

    @ApiPropertyOptional()
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
