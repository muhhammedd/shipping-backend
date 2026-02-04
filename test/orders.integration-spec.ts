import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/core/prisma.service';
import { TestFactories } from './factories';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

describe('OrdersController (Integration)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let jwtService: JwtService;
    let authToken: string;
    let merchantId: string;
    let tenantId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe());
        await app.init();

        prisma = app.get<PrismaService>(PrismaService);
        jwtService = app.get<JwtService>(JwtService);

        // Setup Test Data
        const tenant = await prisma.tenant.create({
            data: TestFactories.createTenant({ slug: 'test-integration-tenant' }),
        });
        tenantId = tenant.id;

        const user = await prisma.user.create({
            data: TestFactories.createUser({
                tenantId,
                role: UserRole.MERCHANT,
                email: 'integration-test@example.com'
            }),
        });

        const merchant = await prisma.merchantProfile.create({
            data: {
                userId: user.id,
                tenantId,
                companyName: 'Integration Test Corp',
            },
        });
        merchantId = merchant.id;

        // Generate Auth Token
        authToken = jwtService.sign({
            sub: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
        });
    });

    afterAll(async () => {
        // Cleanup
        await prisma.order.deleteMany({ where: { tenantId } });
        await prisma.merchantProfile.deleteMany({ where: { tenantId } });
        await prisma.user.deleteMany({ where: { tenantId } });
        await prisma.tenant.delete({ where: { id: tenantId } });
        await app.close();
    });

    describe('POST /orders', () => {
        it('should create a new order', async () => {
            const orderData = {
                recipientName: 'Jane Doe',
                recipientPhone: '+1987654321',
                address: '456 Oak Ave',
                city: 'Los Angeles',
                price: 20,
                codAmount: 200,
            };

            const response = await request(app.getHttpServer())
                .post('/orders')
                .set('Authorization', `Bearer ${authToken}`)
                .send(orderData)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.trackingNumber).toContain('SHP-');
            expect(response.body.recipientName).toBe(orderData.recipientName);
        });

        it('should return 400 for invalid data', async () => {
            const invalidData = {
                recipientName: '', // Invalid
                price: -10, // Invalid
            };

            await request(app.getHttpServer())
                .post('/orders')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidData)
                .expect(400);
        });
    });

    describe('GET /orders', () => {
        it('should return orders for the merchant', async () => {
            const response = await request(app.getHttpServer())
                .get('/orders')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.meta).toBeDefined();
        });
    });
});
