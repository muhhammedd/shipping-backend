import { IsString, IsNumber, IsOptional, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class LocationDto {
    @IsString()
    city: string;

    @IsString()
    @IsOptional()
    zone?: string;
}

export class DimensionsDto {
    @IsNumber()
    length: number;

    @IsNumber()
    width: number;

    @IsNumber()
    height: number;
}

export enum ServiceTypeCode {
    EXPRESS = 'EXPRESS',
    STANDARD = 'STANDARD',
    ECONOMY = 'ECONOMY',
}

export class CalculateRateDto {
    @ValidateNested()
    @Type(() => LocationDto)
    origin: LocationDto;

    @ValidateNested()
    @Type(() => LocationDto)
    destination: LocationDto;

    @IsNumber()
    weight: number; // in kg

    @ValidateNested()
    @Type(() => DimensionsDto)
    @IsOptional()
    dimensions?: DimensionsDto;

    @IsEnum(ServiceTypeCode)
    @IsOptional()
    serviceType?: ServiceTypeCode = ServiceTypeCode.STANDARD;

    @IsNumber()
    @IsOptional()
    codAmount?: number = 0;
}
