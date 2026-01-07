import { IsOptional, IsEnum, IsISO8601 } from 'class-validator';
import { OrderStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class FilterOrderDto extends PaginationDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsISO8601()
  @Type(() => String)
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  @Type(() => String)
  endDate?: string;
}
