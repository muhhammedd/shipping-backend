import { IsString, IsNotEmpty, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTimeSlotDto {
    @ApiProperty({ example: 'order-uuid' })
    @IsString()
    @IsNotEmpty()
    orderId: string;

    @ApiProperty({ example: '2026-02-05' })
    @IsDateString()
    slotDate: string;

    @ApiProperty({ example: 'morning', enum: ['morning', 'afternoon', 'evening', 'night'] })
    @IsEnum(['morning', 'afternoon', 'evening', 'night'])
    slot: string;
}

export class UpdateTimeSlotDto {
    @ApiPropertyOptional({ example: '2026-02-06' })
    @IsDateString()
    @IsOptional()
    slotDate?: string;

    @ApiPropertyOptional({ example: 'afternoon' })
    @IsEnum(['morning', 'afternoon', 'evening', 'night'])
    @IsOptional()
    slot?: string;
}

export class GetAvailableSlotsDto {
    @ApiProperty({ example: '2026-02-05' })
    @IsDateString()
    date: string;

    @ApiPropertyOptional({ example: 'Cairo' })
    @IsString()
    @IsOptional()
    city?: string;
}
