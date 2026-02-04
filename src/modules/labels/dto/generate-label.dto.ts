import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum LabelFormat {
    A4 = 'A4',
    THERMAL = 'THERMAL',
}

export class GenerateLabelDto {
    @IsString()
    orderId: string;

    @IsEnum(LabelFormat)
    @IsOptional()
    format?: LabelFormat = LabelFormat.A4;
}

export class BulkGenerateLabelsDto {
    @IsString({ each: true })
    orderIds: string[];

    @IsEnum(LabelFormat)
    @IsOptional()
    format?: LabelFormat = LabelFormat.A4;
}
