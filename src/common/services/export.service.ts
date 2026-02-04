import { Injectable } from '@nestjs/common';

@Injectable()
export class ExportService {
    /**
     * Converts an array of objects into a CSV string
     * @param data Array of objects to export
     * @param columns Optional mapping of field names to column headers
     */
    generateCsv(data: any[], columns?: { [key: string]: string }): string {
        if (!data || data.length === 0) {
            return '';
        }

        const fieldNames = columns ? Object.keys(columns) : Object.keys(data[0]);
        const headers = columns ? Object.values(columns) : fieldNames;

        const csvRows: string[] = [];

        // Add header row
        csvRows.push(headers.join(','));

        // Add data rows
        for (const item of data) {
            const row = fieldNames.map((fieldName) => {
                const value = (item as any)[fieldName];

                // Handle null/undefined
                if (value === null || value === undefined) {
                    return '""';
                }

                // Handle strings with commas or quotes
                const stringValue = String(value).replace(/"/g, '""');
                if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                    return `"${stringValue}"`;
                }

                return stringValue;
            });
            csvRows.push(row.join(','));
        }

        return csvRows.join('\n');
    }
}
