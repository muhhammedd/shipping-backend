import { IsString, IsNotEmpty, IsInt, IsOptional, IsNumber, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class RecordFailedDeliveryDto {
    @ApiProperty({ example: 'order-uuid' })
    @IsString()
    @IsNotEmpty()
    orderId: string;

    @ApiProperty({ example: 'Customer not available' })
    @IsString()
    @IsNotEmpty()
    failureReason: string;

    @ApiPropertyOptional({ example: 'Customer requested delivery tomorrow' })
    @IsString()
    @IsOptional()
    notes?: string;

    @ApiPropertyOptional({ example: 'https://cdn.example.com/proof.jpg' })
    @IsString()
    @IsOptional()
    photoUrl?: string;

    @ApiPropertyOptional({ example: 30.0444 })
    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    latitude?: number;

    @ApiPropertyOptional({ example: 31.2357 })
    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    longitude?: number;

    @ApiPropertyOptional({ example: '2026-02-05T10:00:00Z', description: 'Next attempt date' })
    @IsDateString()
    @IsOptional()
    nextAttemptDate?: string;
}
