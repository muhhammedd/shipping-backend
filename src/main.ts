import './common/interfaces/express.interface';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RolesGuard } from './modules/iam/authorization/guards/roles.guard';
import { AccessTokenGuard } from './modules/iam/authentication/guards/access-token.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalInterceptors(
    new TransformInterceptor(),
    new TenantInterceptor(),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalGuards(new AccessTokenGuard(), new RolesGuard());

  const config = new DocumentBuilder()
    .setTitle('Shipex API')
    .setDescription('The Shipex Shipping Management Platform API description')
    .setVersion('1.0')
    .addBearerAuth()
    .addServer(process.env.API_URL || 'http://localhost:3000', 'Development')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Shipex API is running on http://localhost:${port}`);
  console.log(
    `📚 Swagger documentation available at http://localhost:${port}/api/docs`,
  );
}

bootstrap().catch((error) => {
  console.error('Failed to start Shipex API:', error);
  process.exit(1);
});
