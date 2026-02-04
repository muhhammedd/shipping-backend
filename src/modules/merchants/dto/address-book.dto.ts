import { IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEgyptianPhone, IsEgyptianCity } from '../../../common/validators/custom-validators';

export class CreateAddressDto {
    @ApiProperty({ example: 'Home', description: 'Address label' })
    @IsString()
    @IsNotEmpty()
    label: string;

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

    @ApiPropertyOptional({ example: false, description: 'Set as default address' })
    @IsBoolean()
    @IsOptional()
    isDefault?: boolean;
}

export class UpdateAddressDto {
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    label?: string;

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
    @IsBoolean()
    @IsOptional()
    isDefault?: boolean;
}
