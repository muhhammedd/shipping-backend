import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

async function generateSvg() {
    const app = await NestFactory.create(AppModule, { logger: false });

    const config = new DocumentBuilder()
        .setTitle('Shipex API')
        .setDescription('Shipex Shipping Platform API Documentation')
        .setVersion('1.0')
        .addBearerAuth()
        .build();

    const document = SwaggerModule.createDocument(app, config);

    const outputPath = path.resolve(__dirname, '..', 'swagger.json');
    fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));

    console.log(`Swagger JSON generated at ${outputPath}`);
    await app.close();
}

generateSvg();
