import { IsOptional, IsEnum } from 'class-validator';
import { TenantStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class FilterTenantDto extends PaginationDto {
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;
}
