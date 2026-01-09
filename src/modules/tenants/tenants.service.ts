import { Injectable } from '@nestjs/common';
import { PrismaService } from '../core/prisma.service';
import { FilterTenantDto } from './dto/filter-tenant.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filterDto: FilterTenantDto) {
    const where: Prisma.TenantWhereInput = {};

    // Filter by status if provided
    if (filterDto.status) {
      where.status = filterDto.status;
    }

    // Get total count for pagination metadata
    const total = await this.prisma.tenant.count({ where });

    const limit = filterDto.limit || 10;

    // Fetch paginated results
    const data = await this.prisma.tenant.findMany({
      where,
      skip: filterDto.skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return {
      data,
      meta: {
        page: filterDto.page,
        limit: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    return tenant;
  }
}
