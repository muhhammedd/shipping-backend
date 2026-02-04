export interface PaginationResult<T> {
    data: T[];
    meta: {
        total: number;
        lastPage: number;
        currentPage: number;
        perPage: number;
        prev: number | null;
        next: number | null;
    };
}

export async function paginate<T>(
    model: any,
    queryOptions: any = {},
    page: number = 1,
    perPage: number = 10,
): Promise<PaginationResult<T>> {
    const skip = (page - 1) * perPage;
    const [data, total] = await Promise.all([
        model.findMany({
            ...queryOptions,
            take: perPage,
            skip,
        }),
        model.count({
            where: queryOptions.where,
        }),
    ]);

    const lastPage = Math.ceil(total / perPage);

    return {
        data,
        meta: {
            total,
            lastPage,
            currentPage: page,
            perPage,
            prev: page > 1 ? page - 1 : null,
            next: page < lastPage ? page + 1 : null,
        },
    };
}
