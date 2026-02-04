import { IsNotEmpty, IsString, IsNumber, IsPositive, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEgyptianPhone, IsEgyptianCity, IsPositiveDecimal } from '../../../common/validators/custom-validators';

export class CreateTemplateDto {
    @ApiProperty({ example: 'Regular Customer - Cairo', description: 'Template name' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'Ahmed Mohamed' })
    @IsString()
    @IsNotEmpty()
    recipientName: string;

    @ApiProperty({ example: '01012345678' })
    @IsString()
    @IsNotEmpty()
    @IsEgyptianPhone()
    recipientPhone: string;

    @ApiProperty({ example: '123 Main Street, Apartment 4' })
    @IsString()
    @IsNotEmpty()
    address: string;

    @ApiProperty({ example: 'Cairo' })
    @IsString()
    @IsNotEmpty()
    @IsEgyptianCity()
    city: string;

    @ApiProperty({ example: 50.00 })
    @IsNumber()
    @IsPositive()
    @IsPositiveDecimal()
    price: number;

    @ApiProperty({ example: 200.00 })
    @IsNumber()
    @IsPositive()
    @IsPositiveDecimal()
    codAmount: number;

    @ApiPropertyOptional({ example: 'Fragile items' })
    @IsString()
    @IsOptional()
    notes?: string;
}

export class UpdateTemplateDto {
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    name?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    recipientName?: string;

    @ApiPropertyOptional()
    @IsEgyptianPhone()
    @IsOptional()
    recipientPhone?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    address?: string;

    @ApiPropertyOptional()
    @IsEgyptianCity()
    @IsOptional()
    city?: string;

    @ApiPropertyOptional()
    @IsPositiveDecimal()
    @IsOptional()
    price?: number;

    @ApiPropertyOptional()
    @IsPositiveDecimal()
    @IsOptional()
    codAmount?: number;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    notes?: string;
}

export class CreateOrderFromTemplateDto {
    @ApiProperty({ example: 'template-uuid', description: 'Template ID to use' })
    @IsString()
    @IsNotEmpty()
    templateId: string;

    @ApiPropertyOptional({ description: 'Override template values' })
    @IsOptional()
    overrides?: {
        recipientName?: string;
        recipientPhone?: string;
        address?: string;
        city?: string;
        price?: number;
        codAmount?: number;
        notes?: string;
    };
}
