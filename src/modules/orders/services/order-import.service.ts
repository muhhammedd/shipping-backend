import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { ImportResultDto } from '../dto/import-orders.dto';
import { OrdersService } from '../orders.service';
import type { ActiveUserData } from '../../../common/interfaces/active-user-data.interface';

/**
 * Service for handling batch order imports
 */
@Injectable()
export class OrderImportService {
    private readonly logger = new Logger(OrderImportService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly ordersService: OrdersService,
    ) { }

    /**
     * Import orders from JSON array
     */
    async importFromJson(
        orders: CreateOrderDto[],
        user: ActiveUserData,
    ): Promise<ImportResultDto> {
        const result: ImportResultDto = {
            successCount: 0,
            failureCount: 0,
            successfulOrders: [],
            errors: [],
        };

        for (let i = 0; i < orders.length; i++) {
            try {
                const order = await this.ordersService.create(orders[i], user);
                result.successCount++;
                result.successfulOrders.push(order.id);
            } catch (error) {
                result.failureCount++;
                result.errors.push({
                    row: i + 1,
                    error: error.message || 'Unknown error',
                    data: orders[i],
                });
                this.logger.error(`Failed to import order at row ${i + 1}:`, error.message);
            }
        }

        this.logger.log(
            `Import completed: ${result.successCount} successful, ${result.failureCount} failed`,
        );

        return result;
    }

    /**
     * Import orders from CSV content
     */
    async importFromCsv(
        csvContent: string,
        user: ActiveUserData,
    ): Promise<ImportResultDto> {
        const result: ImportResultDto = {
            successCount: 0,
            failureCount: 0,
            successfulOrders: [],
            errors: [],
        };

        try {
            const orders = this.parseCsv(csvContent);

            for (let i = 0; i < orders.length; i++) {
                try {
                    const order = await this.ordersService.create(orders[i], user);
                    result.successCount++;
                    result.successfulOrders.push(order.id);
                } catch (error) {
                    result.failureCount++;
                    result.errors.push({
                        row: i + 2, // +2 because of header row and 0-indexing
                        error: error.message || 'Unknown error',
                        data: orders[i],
                    });
                    this.logger.error(`Failed to import order at row ${i + 2}:`, error.message);
                }
            }
        } catch (error) {
            throw new BadRequestException(`CSV parsing failed: ${error.message}`);
        }

        this.logger.log(
            `CSV import completed: ${result.successCount} successful, ${result.failureCount} failed`,
        );

        return result;
    }

    /**
     * Parse CSV content into CreateOrderDto array
     */
    private parseCsv(csvContent: string): CreateOrderDto[] {
        const lines = csvContent.trim().split('\n');

        if (lines.length < 2) {
            throw new BadRequestException('CSV must contain at least a header row and one data row');
        }

        // Parse header
        const headers = lines[0].split(',').map((h) => h.trim());

        // Validate required headers
        const requiredHeaders = ['recipientName', 'recipientPhone', 'address', 'city', 'price', 'codAmount'];
        const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));

        if (missingHeaders.length > 0) {
            throw new BadRequestException(
                `Missing required headers: ${missingHeaders.join(', ')}`,
            );
        }

        // Parse data rows
        const orders: CreateOrderDto[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map((v) => v.trim());

            if (values.length !== headers.length) {
                throw new BadRequestException(
                    `Row ${i + 1} has ${values.length} columns, expected ${headers.length}`,
                );
            }

            const orderData: any = {};

            headers.forEach((header, index) => {
                const value = values[index];

                // Convert numeric fields
                if (header === 'price' || header === 'codAmount') {
                    orderData[header] = parseFloat(value);
                } else {
                    orderData[header] = value;
                }
            });

            orders.push(orderData as CreateOrderDto);
        }

        return orders;
    }

    /**
     * Generate CSV template for download
     */
    generateCsvTemplate(): string {
        const headers = [
            'recipientName',
            'recipientPhone',
            'address',
            'city',
            'price',
            'codAmount',
            'notes',
        ];

        const exampleRow = [
            'Ahmed Mohamed',
            '01012345678',
            '123 Main Street, Apartment 4',
            'Cairo',
            '50.00',
            '200.00',
            'Fragile items',
        ];

        return `${headers.join(',')}\n${exampleRow.join(',')}`;
    }
}
