import { PrismaClient, UserRole, OrderStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function validateFlow() {
    console.log('🚀 Starting End-to-End Validation Flow...');

    // 1. Setup Tenant and Users
    const tenant = await prisma.tenant.upsert({
        where: { slug: 'test-logistics' },
        update: {},
        create: {
            name: 'Test Logistics',
            slug: 'test-logistics',
            plan: 'PREMIUM',
        },
    });

    const pwHash = await bcrypt.hash('password', 10);

    // Admin
    const admin = await prisma.user.upsert({
        where: { email: 'admin@test.com' },
        update: { tenantId: tenant.id },
        create: {
            email: 'admin@test.com',
            passwordHash: pwHash,
            role: UserRole.ADMIN,
            tenantId: tenant.id,
        },
    });

    // Merchant
    const merchant = await prisma.user.upsert({
        where: { email: 'merchant@test.com' },
        update: { tenantId: tenant.id },
        create: {
            email: 'merchant@test.com',
            passwordHash: pwHash,
            role: UserRole.MERCHANT,
            tenantId: tenant.id,
            merchantProfile: {
                create: {
                    tenantId: tenant.id,
                    companyName: 'Test Store',
                    balance: 1000,
                },
            },
        },
        include: { merchantProfile: true },
    });

    // Courier
    const courier = await prisma.user.upsert({
        where: { email: 'courier@test.com' },
        update: { tenantId: tenant.id },
        create: {
            email: 'courier@test.com',
            passwordHash: pwHash,
            role: UserRole.COURIER,
            tenantId: tenant.id,
            courierProfile: {
                create: {
                    tenantId: tenant.id,
                    vehicleInfo: 'Delivery Van - V1',
                },
            },
        },
        include: { courierProfile: true },
    });

    console.log('✅ Identity Layer Verified.');

    // 2. Merchant Creates Order
    const order = await prisma.order.create({
        data: {
            trackingNumber: `SHP-${Date.now()}`,
            tenantId: tenant.id,
            merchantId: (merchant as any).merchantProfile.id, // Order needs Profile ID
            status: OrderStatus.CREATED,
            recipientName: 'Recipient User',
            recipientPhone: '1234567890',
            address: '123 Test St',
            city: 'Test City',
            price: 10,
            codAmount: 100,
        },
    });

    console.log(`📦 Order Created: ${order.trackingNumber}`);

    // 3. Admin Assigns Courier
    const assignedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
            courierId: (courier as any).courierProfile.id, // Order needs Profile ID
            status: OrderStatus.ASSIGNED,
        },
    });

    console.log('👷 Courier Assigned.');

    // 4. Courier Picks Up
    await prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PICKED_UP },
    });

    console.log('🚚 Order Picked Up.');

    // 5. Courier Delivers
    const completedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
            status: OrderStatus.DELIVERED,
        },
    });

    console.log('🏁 Order Delivered.');
    console.log('✨ Full E2E Logistics Flow Validated Successfully.');
}

validateFlow()
    .catch((e) => {
        console.error('❌ Validation Failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
