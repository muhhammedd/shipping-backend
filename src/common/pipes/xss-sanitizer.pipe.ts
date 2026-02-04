import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class XssSanitizerPipe implements PipeTransform {
    transform(value: any, metadata: ArgumentMetadata) {
        if (typeof value === 'string') {
            return this.sanitize(value);
        }
        if (typeof value === 'object' && value !== null) {
            return this.sanitizeObject(value);
        }
        return value;
    }

    private sanitize(text: string): string {
        // Simple regex-based sanitization for common XSS patterns
        // In production, use a library like 'dompurify' or 'xss'
        return text
            .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, '')
            .replace(/on\w+="[^"]*"/gim, '')
            .replace(/on\w+='[^']*'/gim, '')
            .replace(/javascript:[^"']*/gim, '');
    }

    private sanitizeObject(obj: any): any {
        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                obj[key] = this.sanitize(obj[key]);
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                this.sanitizeObject(obj[key]);
            }
        }
        return obj;
    }
}
