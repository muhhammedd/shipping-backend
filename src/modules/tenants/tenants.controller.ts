import { Controller, Get, Param, Query } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { Roles } from '../iam/authorization/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { FilterTenantDto } from './dto/filter-tenant.dto';
import { ApiQuery } from '@nestjs/swagger';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Roles(UserRole.SUPER_ADMIN)
  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  findAll(@Query() filterDto: FilterTenantDto) {
    return this.tenantsService.findAll(filterDto);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }
}
