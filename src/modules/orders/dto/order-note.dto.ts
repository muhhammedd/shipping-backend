import { IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderNoteDto {
    @ApiProperty({ example: 'order-uuid', description: 'Order ID' })
    @IsString()
    @IsNotEmpty()
    orderId: string;

    @ApiProperty({ example: 'Customer requested delivery after 5 PM' })
    @IsString()
    @IsNotEmpty()
    note: string;

    @ApiPropertyOptional({ example: true, description: 'Internal note (not visible to customer)' })
    @IsBoolean()
    @IsOptional()
    isInternal?: boolean;
}

export class UpdateOrderNoteDto {
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    note?: string;

    @ApiPropertyOptional()
    @IsBoolean()
    @IsOptional()
    isInternal?: boolean;
}
