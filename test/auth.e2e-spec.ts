import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/core/prisma.service';
import { TestFactories } from './factories';
import { getQueueToken, BullExplorer } from '@nestjs/bullmq';

describe('AuthController (Integration)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let tenantId: string;

    const mockQueue = {
        add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(BullExplorer).useValue({ onModuleInit: jest.fn(), onModuleDestroy: jest.fn() })
            .overrideProvider(getQueueToken('webhooks')).useValue(mockQueue)
            .overrideProvider(getQueueToken('email')).useValue(mockQueue)
            .overrideProvider(getQueueToken('sms')).useValue(mockQueue)
            .overrideProvider(getQueueToken('push')).useValue(mockQueue)
            .compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe());
        await app.init();

        prisma = app.get<PrismaService>(PrismaService);

        // Setup Test Tenant
        const tenant = await prisma.tenant.create({
            data: TestFactories.createTenant({ slug: `auth-test-${Date.now()}` }),
        });
        tenantId = tenant.id;
    });

    afterAll(async () => {
        if (prisma && tenantId) {
            await prisma.user.deleteMany({ where: { tenantId } });
            await prisma.tenant.delete({ where: { id: tenantId } });
        }
        if (app) {
            await app.close();
        }
    });

    describe('POST /auth/sign-in', () => {
        it('should fail with incorrect credentials', async () => {
            await (request as any)(app.getHttpServer())
                .post('/auth/sign-in')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'wrong-password',
                })
                .expect(401);
        });

        it('should sign in successfully with correct credentials', async () => {
            const bcrypt = require('bcrypt');
            const password = 'password123';
            const passwordHash = await bcrypt.hash(password, 10);

            await prisma.user.create({
                data: TestFactories.createUser({
                    tenantId,
                    email: `test-${Date.now()}@example.com`,
                    passwordHash,
                }),
            });

            const response = await (request as any)(app.getHttpServer())
                .post('/auth/sign-in')
                .send({
                    email: `test-${Date.now()}@example.com`,
                    password: 'password123',
                })
                .expect(200);

            expect(response.body).toHaveProperty('accessToken');
        });
    });
});
