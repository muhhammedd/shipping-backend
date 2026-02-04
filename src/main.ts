import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggerService } from './common/logger/logger.service';
import helmet from 'helmet';
import compression from 'compression';
import { XssSanitizerPipe } from './common/pipes/xss-sanitizer.pipe';
import * as crypto from 'crypto';

import * as Sentry from '@sentry/nestjs';

async function bootstrap() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  });

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true, // Buffer logs until logger is ready
  });

  // Set custom logger
  const logger = app.get(LoggerService);
  app.useLogger(logger);
  logger.setContext('Bootstrap');

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));
  app.use(compression());

  // Request ID Middleware
  app.use((req, res, next) => {
    req.headers['x-request-id'] = req.headers['x-request-id'] || crypto.randomUUID();
    next();
  });

  // CORS configuration
  const corsOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new XssSanitizerPipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Shipex API')
    .setDescription('Shipex Shipping Platform API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication')
    .addTag('Orders')
    .addTag('Merchants')
    .addTag('Couriers')
    .addTag('Admin')
    .addTag('Tracking')
    .addTag('Finance')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Merchant-specific documentation portal
  const merchantConfig = new DocumentBuilder()
    .setTitle('Shipex Merchant API Portal')
    .setDescription('Dedicated documentation for Merchant integrations. Use your API Key or Bearer Token for authentication.')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Merchants', 'Core merchant account and profile operations')
    .addTag('Orders', 'Order creation, management and tracking')
    .addTag('Finance', 'Wallet, transactions and payout requests')
    .addTag('Tracking', 'Public tracking status operations')
    .build();

  const merchantDocument = SwaggerModule.createDocument(app, merchantConfig);
  // Filter document to only include merchant-relevant tags
  merchantDocument.paths = Object.keys(merchantDocument.paths).reduce((acc, path) => {
    const methods = merchantDocument.paths[path];
    const merchantMethods = Object.keys(methods).reduce((mAcc, method) => {
      const operation = methods[method];
      const tags = operation.tags || [];
      const isMerchantRelevant = tags.some(tag =>
        ['Merchants', 'Orders', 'Finance', 'Tracking', 'Shipping', 'Merchant - Address Book', 'Merchant - Templates'].includes(tag)
      );
      if (isMerchantRelevant) {
        mAcc[method] = operation;
      }
      return mAcc;
    }, {});
    if (Object.keys(merchantMethods).length > 0) {
      acc[path] = merchantMethods;
    }
    return acc;
  }, {});

  SwaggerModule.setup('api/merchant/docs', app, merchantDocument, {
    customSiteTitle: 'Shipex Merchant API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 5000;
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}`, 'Bootstrap');
  logger.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`, 'Bootstrap');
  logger.log(`🔧 Environment: ${process.env.NODE_ENV}`, 'Bootstrap');
  logger.log(`📊 Log Level: ${process.env.LOG_LEVEL || 'info'}`, 'Bootstrap');
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
