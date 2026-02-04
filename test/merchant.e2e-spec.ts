import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/core/prisma.service';
import { TestFactories } from './factories';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { getQueueToken } from '@nestjs/bullmq';

describe('MerchantController (Integration)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let jwtService: JwtService;
    let authToken: string;
    let tenantId: string;

    const mockQueue = {
        add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(getQueueToken('webhooks')).useValue(mockQueue)
            .overrideProvider(getQueueToken('email')).useValue(mockQueue)
            .overrideProvider(getQueueToken('sms')).useValue(mockQueue)
            .overrideProvider(getQueueToken('push')).useValue(mockQueue)
            .compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe());
        await app.init();

        prisma = app.get<PrismaService>(PrismaService);
        jwtService = app.get<JwtService>(JwtService);

        // Setup Test Data
        const tenant = await prisma.tenant.create({
            data: TestFactories.createTenant({ slug: `merchant-test-${Date.now()}` }),
        });
        tenantId = tenant.id;

        const user = await prisma.user.create({
            data: TestFactories.createUser({
                tenantId,
                role: UserRole.MERCHANT,
                email: `merchant-test-${Date.now()}@example.com`
            }),
        });

        await prisma.merchantProfile.create({
            data: {
                userId: user.id,
                tenantId,
                companyName: 'Merchant Test Corp',
            },
        });

        authToken = jwtService.sign({
            sub: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
        });
    });

    afterAll(async () => {
        if (prisma && tenantId) {
            await prisma.merchantProfile.deleteMany({ where: { tenantId } });
            await prisma.user.deleteMany({ where: { tenantId } });
            await prisma.tenant.delete({ where: { id: tenantId } });
        }
        if (app) {
            await app.close();
        }
    });

    describe('GET /merchants/profile', () => {
        it('should return merchant profile', async () => {
            const response = await (request as any)(app.getHttpServer())
                .get('/merchants/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('companyName', 'Merchant Test Corp');
        });
    });
});
