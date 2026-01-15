import './common/interfaces/express.interface';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RolesGuard } from './modules/iam/authorization/guards/roles.guard';
import { AccessTokenGuard } from './modules/iam/authentication/guards/access-token.guard';
import { JwtService } from '@nestjs/jwt';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS - allow all origins for Replit proxy
  app.enableCors({
    origin: process.env.CORS_ORIGIN === '*' ? true : (process.env.CORS_ORIGIN?.split(',') || true),
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

  // Resolve dependencies for global guards
  const jwtService = app.get(JwtService);
  const reflector = app.get(Reflector);
  app.useGlobalGuards(
    new AccessTokenGuard(jwtService, reflector),
    new RolesGuard(reflector),
  );

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

  const port = process.env.PORT ?? 5000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Shipex API is running on http://0.0.0.0:${port}`);
  console.log(
    `📚 Swagger documentation available at http://localhost:${port}/api/docs`,
  );
}

bootstrap().catch((error) => {
  console.error('Failed to start Shipex API:', error);
  process.exit(1);
});
