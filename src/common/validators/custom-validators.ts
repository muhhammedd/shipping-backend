import {
    registerDecorator,
    ValidationOptions,
    ValidationArguments,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Egyptian Phone Number Validator
 * Validates Egyptian phone numbers (mobile and landline)
 */
@ValidatorConstraint({ name: 'isEgyptianPhone', async: false })
export class IsEgyptianPhoneConstraint implements ValidatorConstraintInterface {
    validate(phone: string, args: ValidationArguments) {
        if (!phone) return false;

        // Remove spaces, dashes, and parentheses
        const cleaned = phone.replace(/[\s\-()]/g, '');

        // Egyptian mobile: starts with 01 followed by 9 digits (total 11 digits)
        // Or with country code: +2 or 002 followed by 10 digits
        const mobilePattern = /^(01[0-2,5]{1}[0-9]{8})$/;
        const mobileWithCountryCode = /^(\+2|002)(01[0-2,5]{1}[0-9]{8})$/;

        // Egyptian landline: starts with 0 followed by area code and number
        const landlinePattern = /^(0[1-9]{1}[0-9]{7,8})$/;

        return (
            mobilePattern.test(cleaned) ||
            mobileWithCountryCode.test(cleaned) ||
            landlinePattern.test(cleaned)
        );
    }

    defaultMessage(args: ValidationArguments) {
        return 'Phone number must be a valid Egyptian phone number (e.g., 01012345678)';
    }
}

export function IsEgyptianPhone(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsEgyptianPhoneConstraint,
        });
    };
}

/**
 * Tracking Number Validator
 * Validates tracking number format
 */
@ValidatorConstraint({ name: 'isValidTrackingNumber', async: false })
export class IsValidTrackingNumberConstraint implements ValidatorConstraintInterface {
    validate(trackingNumber: string, args: ValidationArguments) {
        if (!trackingNumber) return false;

        // Tracking number format: SHX-YYYYMMDD-XXXXX
        // Example: SHX-20260203-12345
        const pattern = /^SHX-\d{8}-\d{5}$/;

        return pattern.test(trackingNumber);
    }

    defaultMessage(args: ValidationArguments) {
        return 'Tracking number must follow format: SHX-YYYYMMDD-XXXXX';
    }
}

export function IsValidTrackingNumber(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsValidTrackingNumberConstraint,
        });
    };
}

/**
 * Egyptian City Validator
 * Validates against a list of Egyptian cities
 */
@ValidatorConstraint({ name: 'isEgyptianCity', async: false })
export class IsEgyptianCityConstraint implements ValidatorConstraintInterface {
    private readonly egyptianCities = [
        'Cairo',
        'Alexandria',
        'Giza',
        'Shubra El Kheima',
        'Port Said',
        'Suez',
        'Luxor',
        'Mansoura',
        'El-Mahalla El-Kubra',
        'Tanta',
        'Asyut',
        'Ismailia',
        'Faiyum',
        'Zagazig',
        'Aswan',
        'Damietta',
        'Damanhur',
        'Minya',
        'Beni Suef',
        'Qena',
        'Sohag',
        'Hurghada',
        'Shibin El Kom',
        'Banha',
        'Kafr El Sheikh',
        '10th of Ramadan City',
        '6th of October City',
        'Obour City',
        'New Cairo',
        'Nasr City',
        'Heliopolis',
        'Maadi',
        'Zamalek',
    ];

    validate(city: string, args: ValidationArguments) {
        if (!city) return false;

        return this.egyptianCities.some(
            (c) => c.toLowerCase() === city.toLowerCase(),
        );
    }

    defaultMessage(args: ValidationArguments) {
        return 'City must be a valid Egyptian city';
    }
}

export function IsEgyptianCity(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsEgyptianCityConstraint,
        });
    };
}

/**
 * Positive Decimal Validator
 * Validates that a number is positive and has max 2 decimal places
 */
@ValidatorConstraint({ name: 'isPositiveDecimal', async: false })
export class IsPositiveDecimalConstraint implements ValidatorConstraintInterface {
    validate(value: any, args: ValidationArguments) {
        if (value === null || value === undefined) return false;

        const num = Number(value);
        if (isNaN(num) || num <= 0) return false;

        // Check max 2 decimal places
        const decimalPlaces = (num.toString().split('.')[1] || '').length;
        return decimalPlaces <= 2;
    }

    defaultMessage(args: ValidationArguments) {
        return 'Value must be a positive number with maximum 2 decimal places';
    }
}

export function IsPositiveDecimal(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsPositiveDecimalConstraint,
        });
    };
}

/**
 * Future Date Validator
 * Validates that a date is in the future
 */
@ValidatorConstraint({ name: 'isFutureDate', async: false })
export class IsFutureDateConstraint implements ValidatorConstraintInterface {
    validate(date: any, args: ValidationArguments) {
        if (!date) return false;

        const inputDate = new Date(date);
        const now = new Date();

        return inputDate > now;
    }

    defaultMessage(args: ValidationArguments) {
        return 'Date must be in the future';
    }
}

export function IsFutureDate(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsFutureDateConstraint,
        });
    };
}

/**
 * Valid Coordinates Validator
 * Validates latitude and longitude
 */
@ValidatorConstraint({ name: 'isValidCoordinates', async: false })
export class IsValidCoordinatesConstraint implements ValidatorConstraintInterface {
    validate(value: any, args: ValidationArguments) {
        if (!value || typeof value !== 'object') return false;

        const { latitude, longitude } = value;

        if (
            typeof latitude !== 'number' ||
            typeof longitude !== 'number'
        ) {
            return false;
        }

        // Validate latitude range: -90 to 90
        // Validate longitude range: -180 to 180
        return (
            latitude >= -90 &&
            latitude <= 90 &&
            longitude >= -180 &&
            longitude <= 180
        );
    }

    defaultMessage(args: ValidationArguments) {
        return 'Coordinates must have valid latitude (-90 to 90) and longitude (-180 to 180)';
    }
}

export function IsValidCoordinates(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsValidCoordinatesConstraint,
        });
    };
}
