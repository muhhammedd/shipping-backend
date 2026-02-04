import { Injectable } from '@nestjs/common';
import { ValidateAddressDto, AddressValidationResult } from '../dto/validate-address.dto';
import { EGYPTIAN_CITIES, normalizeCityName, findClosestCity, isValidEgyptianPhone } from '../constants/shipping.constants';

@Injectable()
export class AddressValidationService {
    /**
     * Validate address with comprehensive checks
     */
    validate(dto: ValidateAddressDto): AddressValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        const suggestions: any = {};

        // Validate recipient name
        if (dto.recipientName.length < 3) {
            errors.push('Recipient name must be at least 3 characters');
        }

        // Validate phone number
        if (!isValidEgyptianPhone(dto.recipientPhone)) {
            errors.push('Invalid Egyptian phone number format');

            // Suggest correction
            const cleaned = dto.recipientPhone.replace(/[\s\-+]/g, '');
            if (cleaned.length === 10 && !cleaned.startsWith('0')) {
                suggestions.phone = '0' + cleaned;
                warnings.push(`Did you mean: ${suggestions.phone}?`);
            }
        }

        // Validate address
        if (dto.address.length < 10) {
            errors.push('Address must be at least 10 characters');
        }

        if (!dto.address.match(/\d+/)) {
            warnings.push('Address should include a building/street number');
        }

        // Validate city
        const cityMatch = EGYPTIAN_CITIES.find(
            city => normalizeCityName(city) === normalizeCityName(dto.city)
        );

        if (!cityMatch) {
            errors.push(`City "${dto.city}" is not recognized`);

            // Suggest closest match
            const closest = findClosestCity(dto.city);
            if (closest) {
                suggestions.city = closest;
                warnings.push(`Did you mean: ${closest}?`);
            }
        }

        // Check for common issues
        if (dto.address.toLowerCase().includes('n/a') ||
            dto.address.toLowerCase().includes('tbd')) {
            errors.push('Address contains placeholder text');
        }

        // Build result
        const result: AddressValidationResult = {
            isValid: errors.length === 0,
            errors,
            warnings,
        };

        if (Object.keys(suggestions).length > 0) {
            result.suggestions = suggestions;
        }

        if (result.isValid) {
            result.normalizedAddress = {
                recipientName: dto.recipientName.trim(),
                recipientPhone: dto.recipientPhone.replace(/[\s\-+]/g, ''),
                address: dto.address.trim(),
                city: cityMatch || dto.city,
            };
        }

        return result;
    }

    /**
     * Get list of supported cities
     */
    getSupportedCities(): string[] {
        return [...EGYPTIAN_CITIES].sort();
    }

    /**
     * Check if city is supported
     */
    isCitySupported(city: string): boolean {
        return EGYPTIAN_CITIES.some(
            c => normalizeCityName(c) === normalizeCityName(city)
        );
    }
}
