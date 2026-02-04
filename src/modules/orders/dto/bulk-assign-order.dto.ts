import { IsArray, IsUUID, IsNotEmpty } from 'class-validator';

export class BulkAssignOrderDto {
    @IsArray()
    @IsUUID('all', { each: true })
    @IsNotEmpty()
    orderIds: string[];

    @IsUUID()
    @IsNotEmpty()
    courierId: string;
}
