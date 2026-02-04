import { PrismaService } from '../../modules/core/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Base Repository Pattern
 * Provides common database operations with soft delete support
 */
export abstract class BaseRepository<T, CreateInput, UpdateInput, WhereInput, WhereUniqueInput> {
    constructor(
        protected readonly prisma: PrismaService,
        protected readonly modelName: Prisma.ModelName,
    ) { }

    /**
     * Find all records with optional filtering, pagination, and sorting
     */
    async findAll(params: {
        where?: WhereInput;
        skip?: number;
        take?: number;
        orderBy?: any;
        select?: any;
        include?: any;
    }): Promise<T[]> {
        const { where, skip, take, orderBy, select, include } = params;

        return (this.prisma[this.modelName.toLowerCase()] as any).findMany({
            where: this.applyTenantFilter(where),
            skip,
            take,
            orderBy,
            select,
            include,
        });
    }

    /**
     * Find a single record by unique identifier
     */
    async findOne(params: {
        where: WhereUniqueInput;
        select?: any;
        include?: any;
    }): Promise<T | null> {
        const { where, select, include } = params;

        return (this.prisma[this.modelName.toLowerCase()] as any).findUnique({
            where,
            select,
            include,
        });
    }

    /**
     * Find first record matching criteria
     */
    async findFirst(params: {
        where?: WhereInput;
        select?: any;
        include?: any;
        orderBy?: any;
    }): Promise<T | null> {
        const { where, select, include, orderBy } = params;

        return (this.prisma[this.modelName.toLowerCase()] as any).findFirst({
            where: this.applyTenantFilter(where),
            select,
            include,
            orderBy,
        });
    }

    /**
     * Count records matching criteria
     */
    async count(where?: WhereInput): Promise<number> {
        return (this.prisma[this.modelName.toLowerCase()] as any).count({
            where: this.applyTenantFilter(where),
        });
    }

    /**
     * Create a new record
     */
    async create(data: CreateInput): Promise<T> {
        return (this.prisma[this.modelName.toLowerCase()] as any).create({
            data,
        });
    }

    /**
     * Create multiple records
     */
    async createMany(data: CreateInput[]): Promise<Prisma.BatchPayload> {
        return (this.prisma[this.modelName.toLowerCase()] as any).createMany({
            data,
            skipDuplicates: true,
        });
    }

    /**
     * Update a record
     */
    async update(params: {
        where: WhereUniqueInput;
        data: UpdateInput;
    }): Promise<T> {
        const { where, data } = params;

        return (this.prisma[this.modelName.toLowerCase()] as any).update({
            where,
            data,
        });
    }

    /**
     * Update multiple records
     */
    async updateMany(params: {
        where: WhereInput;
        data: UpdateInput;
    }): Promise<Prisma.BatchPayload> {
        const { where, data } = params;

        return (this.prisma[this.modelName.toLowerCase()] as any).updateMany({
            where: this.applyTenantFilter(where),
            data,
        });
    }

    /**
     * Delete a record (hard delete)
     */
    async delete(where: WhereUniqueInput): Promise<T> {
        return (this.prisma[this.modelName.toLowerCase()] as any).delete({
            where,
        });
    }

    /**
     * Delete multiple records (hard delete)
     */
    async deleteMany(where: WhereInput): Promise<Prisma.BatchPayload> {
        return (this.prisma[this.modelName.toLowerCase()] as any).deleteMany({
            where: this.applyTenantFilter(where),
        });
    }

    /**
     * Soft delete a record (if model supports deletedAt)
     */
    async softDelete(where: WhereUniqueInput): Promise<T> {
        return (this.prisma[this.modelName.toLowerCase()] as any).update({
            where,
            data: { deletedAt: new Date() },
        });
    }

    /**
     * Execute operations in a transaction
     */
    async transaction<R>(fn: (tx: PrismaService) => Promise<R>): Promise<R> {
        return this.prisma.$transaction(async (tx) => {
            return fn(tx as PrismaService);
        });
    }

    /**
     * Paginate results
     */
    async paginate(params: {
        where?: WhereInput;
        page?: number;
        limit?: number;
        orderBy?: any;
        select?: any;
        include?: any;
    }) {
        const { where, page = 1, limit = 20, orderBy, select, include } = params;
        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            this.findAll({ where, skip, take: limit, orderBy, select, include }),
            this.count(where),
        ]);

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page * limit < total,
                hasPreviousPage: page > 1,
            },
        };
    }

    /**
     * Apply tenant filter for multi-tenancy
     * Override in child repositories if needed
     */
    protected applyTenantFilter(where?: any): any {
        return where;
    }

    /**
     * Check if record exists
     */
    async exists(where: WhereInput): Promise<boolean> {
        const count = await this.count(where);
        return count > 0;
    }
}
