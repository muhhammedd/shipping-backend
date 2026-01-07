import { Controller, Get, Param } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { Roles } from '../iam/authorization/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Roles(UserRole.SUPER_ADMIN)
  @Get()
  findAll() {
    return this.tenantsService.findAll();
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }
}
