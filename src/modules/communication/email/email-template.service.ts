import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class EmailTemplateService {
    private readonly logger = new Logger(EmailTemplateService.name);
    private readonly templateDir = path.join(process.cwd(), 'src', 'modules', 'communication', 'email', 'templates');

    async render(templateName: string, context: any): Promise<string> {
        try {
            const templatePath = path.join(this.templateDir, `${templateName}.html`);
            let template = await fs.readFile(templatePath, 'utf8');

            // Simple replacement for now. In production, use handlebars or ejs.
            Object.keys(context).forEach(key => {
                const value = context[key];
                const regex = new RegExp(`{{${key}}}`, 'g');
                template = template.replace(regex, value);
            });

            // Add common variables if missing
            if (!context.year) {
                template = template.replace(/{{year}}/g, new Date().getFullYear().toString());
            }

            return template;
        } catch (error) {
            this.logger.error(`Failed to render template ${templateName}: ${error.message}`);
            // Fallback to json string if template fails? Or throw?
            // Throwing allows retry or handling.
            throw error;
        }
    }
}
