import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ValidateAddressDto {
    @ApiProperty({ description: 'Recipient Name', example: 'John Doe' })
    @IsString()
    recipientName: string;

    @ApiProperty({ description: 'Recipient Phone', example: '01012345678' })
    @IsString()
    recipientPhone: string;

    @ApiProperty({ description: 'Full street address', example: '123 Main Street, Apartment 5' })
    @IsString()
    address: string;

    @ApiProperty({ description: 'City name', example: 'Cairo' })
    @IsString()
    city: string;

    @ApiPropertyOptional({ description: 'Country (default: Egypt)', example: 'Egypt', default: 'Egypt' })
    @IsString()
    @IsOptional()
    country?: string = 'Egypt';
}

export interface AddressValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions?: {
        city?: string;
        phone?: string;
    };
    normalizedAddress?: {
        recipientName: string;
        recipientPhone: string;
        address: string;
        city: string;
    };
}

export class AutocompleteDto {
    @ApiProperty({ description: 'Search query for autocomplete', example: 'Alex' })
    @IsString()
    query: string;

    @ApiPropertyOptional({ description: 'Country to search in', example: 'Egypt', default: 'Egypt' })
    @IsString()
    @IsOptional()
    country?: string = 'Egypt';
}
