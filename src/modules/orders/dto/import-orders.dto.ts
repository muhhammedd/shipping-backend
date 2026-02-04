import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateOrderDto } from './create-order.dto';

/**
 * DTO for importing multiple orders at once (JSON format)
 */
export class ImportOrdersDto {
    @ApiProperty({
        description: 'Array of orders to import',
        type: [CreateOrderDto],
        example: [
            {
                recipientName: 'Ahmed Mohamed',
                recipientPhone: '01012345678',
                address: '123 Main Street',
                city: 'Cairo',
                price: 50,
                codAmount: 200,
            },
        ],
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateOrderDto)
    orders: CreateOrderDto[];
}

/**
 * DTO for importing orders from CSV content
 */
export class ImportOrdersCsvDto {
    @ApiProperty({
        description: 'CSV content with headers: recipientName,recipientPhone,address,city,price,codAmount,notes',
        example: 'recipientName,recipientPhone,address,city,price,codAmount,notes\nAhmed Mohamed,01012345678,123 Main St,Cairo,50,200,Fragile',
    })
    @IsString()
    @IsNotEmpty()
    csvContent: string;
}

/**
 * Result of import operation
 */
export class ImportResultDto {
    @ApiProperty({ description: 'Number of successfully imported orders' })
    successCount: number;

    @ApiProperty({ description: 'Number of failed imports' })
    failureCount: number;

    @ApiProperty({ description: 'Array of successfully created order IDs' })
    successfulOrders: string[];

    @ApiProperty({ description: 'Array of errors for failed imports' })
    errors: Array<{
        row: number;
        error: string;
        data?: any;
    }>;
}
