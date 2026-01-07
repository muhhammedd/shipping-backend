import { Injectable } from '@nestjs/common';
import { PrismaService } from '../core/prisma.service';
import { FilterTenantDto } from './dto/filter-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filterDto: FilterTenantDto) {
    const where: any = {};

    // Filter by status if provided
    if (filterDto.status) {
      where.status = filterDto.status;
    }

    // Get total count for pagination metadata
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const total = await (this.prisma as any).tenant.count({ where });

    // Fetch paginated results
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const data = await (this.prisma as any).tenant.findMany({
      where,
      skip: filterDto.skip,
      take: filterDto.limit,
      orderBy: { createdAt: 'desc' },
    });

    return {
      data,
      meta: {
        page: filterDto.page,
        limit: filterDto.limit,
        total,
        totalPages: Math.ceil(total / filterDto.limit),
      },
    };
  }

  async findOne(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const tenant = await (this.prisma as any).tenant.findUnique({
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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return tenant;
  }
}
