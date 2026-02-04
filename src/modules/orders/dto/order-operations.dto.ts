import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CancelOrderDto {
    @ApiProperty({ example: 'Customer requested cancellation' })
    @IsString()
    @IsNotEmpty()
    reason: string;

    @ApiPropertyOptional({ example: 'Customer changed mind about purchase' })
    @IsString()
    @IsOptional()
    notes?: string;
}

export class ReturnOrderDto {
    @ApiProperty({ example: 'Product defective' })
    @IsString()
    @IsNotEmpty()
    reason: string;

    @ApiPropertyOptional({ example: 'Item damaged during shipping' })
    @IsString()
    @IsOptional()
    notes?: string;
}

export class AssignOrderDto {
    @ApiProperty({ example: 'courier-uuid', description: 'Courier ID to assign' })
    @IsString()
    @IsNotEmpty()
    courierId: string;
}

export class BulkAssignOrdersDto {
    @ApiProperty({ example: ['order-1', 'order-2'], description: 'Array of order IDs' })
    @IsString({ each: true })
    @IsNotEmpty()
    orderIds: string[];

    @ApiProperty({ example: 'courier-uuid', description: 'Courier ID to assign' })
    @IsString()
    @IsNotEmpty()
    courierId: string;
}
