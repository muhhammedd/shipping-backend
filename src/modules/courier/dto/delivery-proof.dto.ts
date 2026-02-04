import { IsNotEmpty, IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDeliveryProofDto {
    @ApiProperty({ example: 'order-uuid', description: 'Order ID' })
    @IsString()
    @IsNotEmpty()
    orderId: string;

    @ApiPropertyOptional({ example: 'https://cdn.example.com/signature.png' })
    @IsString()
    @IsOptional()
    signatureUrl?: string;

    @ApiPropertyOptional({ example: 'https://cdn.example.com/photo.jpg' })
    @IsString()
    @IsOptional()
    photoUrl?: string;

    @ApiPropertyOptional({ example: 'Ahmed Mohamed' })
    @IsString()
    @IsOptional()
    recipientName?: string;

    @ApiPropertyOptional({ example: 'Package delivered to reception' })
    @IsString()
    @IsOptional()
    notes?: string;

    @ApiPropertyOptional({ example: 30.0444 })
    @IsNumber()
    @Min(-90)
    @Max(90)
    @IsOptional()
    latitude?: number;

    @ApiPropertyOptional({ example: 31.2357 })
    @IsNumber()
    @Min(-180)
    @Max(180)
    @IsOptional()
    longitude?: number;
}
