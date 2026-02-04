import { IsEnum, IsArray, IsUUID, IsNotEmpty } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class BulkUpdateOrderStatusDto {
    @IsArray()
    @IsUUID('all', { each: true })
    @IsNotEmpty()
    orderIds: string[];

    @IsEnum(OrderStatus)
    @IsNotEmpty()
    status: OrderStatus;
}
