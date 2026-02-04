import { PrismaClient, UserRole, OrderStatus, TenantStatus, SubscriptionPlan } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Database Seeding Script
 * Creates realistic test data for development
 */

async function main() {
    console.log('🌱 Starting database seeding...');

    // Clear existing data (in reverse order of dependencies)
    console.log('🗑️  Clearing existing data...');
    await prisma.deliveryProof.deleteMany();
    await prisma.orderNote.deleteMany();
    await prisma.orderHistory.deleteMany();
    await prisma.order.deleteMany();
    await prisma.orderTemplate.deleteMany();
    await prisma.addressBook.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.courierProfile.deleteMany();
    await prisma.merchantProfile.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();

    console.log('✅ Cleared existing data');

    // Hash password for all users
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create Tenants
    console.log('🏢 Creating tenants...');
    const tenant1 = await prisma.tenant.create({
        data: {
            name: 'FastShip Egypt',
            slug: 'fastship-egypt',
            status: TenantStatus.ACTIVE,
            plan: SubscriptionPlan.PREMIUM,
            maxOrders: 10000,
        },
    });

    const tenant2 = await prisma.tenant.create({
        data: {
            name: 'QuickDeliver Co',
            slug: 'quickdeliver-co',
            status: TenantStatus.ACTIVE,
            plan: SubscriptionPlan.ENTERPRISE,
            maxOrders: 50000,
        },
    });

    console.log(`✅ Created ${2} tenants`);

    // Create Users
    console.log('👥 Creating users...');

    // Super Admin
    const superAdmin = await prisma.user.create({
        data: {
            email: 'admin@shipex.com',
            passwordHash: hashedPassword,
            role: UserRole.SUPER_ADMIN,
            tenantId: tenant1.id,
        },
    });

    // Tenant 1 Users
    const merchant1 = await prisma.user.create({
        data: {
            email: 'merchant1@fastship.com',
            passwordHash: hashedPassword,
            role: UserRole.MERCHANT,
            tenantId: tenant1.id,
        },
    });

    const merchant2 = await prisma.user.create({
        data: {
            email: 'merchant2@fastship.com',
            passwordHash: hashedPassword,
            role: UserRole.MERCHANT,
            tenantId: tenant1.id,
        },
    });

    const courier1 = await prisma.user.create({
        data: {
            email: 'courier1@fastship.com',
            passwordHash: hashedPassword,
            role: UserRole.COURIER,
            tenantId: tenant1.id,
        },
    });

    const courier2 = await prisma.user.create({
        data: {
            email: 'courier2@fastship.com',
            passwordHash: hashedPassword,
            role: UserRole.COURIER,
            tenantId: tenant1.id,
        },
    });

    const admin1 = await prisma.user.create({
        data: {
            email: 'admin1@fastship.com',
            passwordHash: hashedPassword,
            role: UserRole.ADMIN,
            tenantId: tenant1.id,
        },
    });

    console.log(`✅ Created ${6} users`);

    // Create Merchant Profiles
    console.log('🏪 Creating merchant profiles...');
    const merchantProfile1 = await prisma.merchantProfile.create({
        data: {
            userId: merchant1.id,
            tenantId: tenant1.id,
            companyName: 'Cairo Electronics Store',
            balance: 5000.00,
        },
    });

    const merchantProfile2 = await prisma.merchantProfile.create({
        data: {
            userId: merchant2.id,
            tenantId: tenant1.id,
            companyName: 'Alexandria Fashion Boutique',
            balance: 3500.00,
        },
    });

    console.log(`✅ Created ${2} merchant profiles`);

    // Create Courier Profiles
    console.log('🚚 Creating courier profiles...');
    const courierProfile1 = await prisma.courierProfile.create({
        data: {
            userId: courier1.id,
            tenantId: tenant1.id,
            vehicleInfo: 'Motorcycle - Honda 150cc',
            wallet: 1200.00,
        },
    });

    const courierProfile2 = await prisma.courierProfile.create({
        data: {
            userId: courier2.id,
            tenantId: tenant1.id,
            vehicleInfo: 'Van - Toyota Hiace',
            wallet: 2500.00,
        },
    });

    console.log(`✅ Created ${2} courier profiles`);

    // Create Address Book entries
    console.log('📍 Creating address book entries...');
    await prisma.addressBook.createMany({
        data: [
            {
                merchantId: merchantProfile1.id,
                tenantId: tenant1.id,
                label: 'Home',
                recipientName: 'Ahmed Mohamed',
                recipientPhone: '01012345678',
                address: '123 Tahrir Street, Apartment 5',
                city: 'Cairo',
                isDefault: true,
            },
            {
                merchantId: merchantProfile1.id,
                tenantId: tenant1.id,
                label: 'Office',
                recipientName: 'Mohamed Ali',
                recipientPhone: '01098765432',
                address: '456 Nile Corniche, Floor 3',
                city: 'Cairo',
                isDefault: false,
            },
            {
                merchantId: merchantProfile2.id,
                tenantId: tenant1.id,
                label: 'Warehouse',
                recipientName: 'Sara Hassan',
                recipientPhone: '01123456789',
                address: '789 Port Said Street',
                city: 'Alexandria',
                isDefault: true,
            },
        ],
    });

    console.log(`✅ Created ${3} address book entries`);

    // Create Order Templates
    console.log('📋 Creating order templates...');
    await prisma.orderTemplate.createMany({
        data: [
            {
                merchantId: merchantProfile1.id,
                tenantId: tenant1.id,
                name: 'Standard Electronics Delivery',
                recipientName: 'Ahmed Mohamed',
                recipientPhone: '01012345678',
                address: '123 Tahrir Street',
                city: 'Cairo',
                price: 50.00,
                codAmount: 500.00,
                notes: 'Handle with care - electronics',
            },
            {
                merchantId: merchantProfile2.id,
                tenantId: tenant1.id,
                name: 'Fashion Item - Alexandria',
                recipientName: 'Sara Hassan',
                recipientPhone: '01123456789',
                address: '789 Port Said Street',
                city: 'Alexandria',
                price: 35.00,
                codAmount: 350.00,
                notes: 'Fragile - clothing',
            },
        ],
    });

    console.log(`✅ Created ${2} order templates`);

    // Create Orders
    console.log('📦 Creating orders...');
    const egyptianCities = ['Cairo', 'Alexandria', 'Giza', 'Shubra El Kheima', 'Port Said', 'Suez', 'Luxor', 'Mansoura', 'Tanta', 'Asyut'];
    const statuses = [OrderStatus.CREATED, OrderStatus.ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED];

    const statuses = [OrderStatus.CREATED, OrderStatus.ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED];

    const orders: any[] = [];
    for (let i = 0; i < 50; i++) {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const city = egyptianCities[Math.floor(Math.random() * egyptianCities.length)];
        const merchantProfile = i % 2 === 0 ? merchantProfile1 : merchantProfile2;
        const courierProfile = status !== OrderStatus.CREATED ? (i % 2 === 0 ? courierProfile1 : courierProfile2) : null;

        const order = await prisma.order.create({
            data: {
                trackingNumber: `SHP${Date.now()}${i.toString().padStart(4, '0')}`,
                status,
                tenantId: tenant1.id,
                merchantId: merchantProfile.id,
                courierId: courierProfile?.id,
                recipientName: `Customer ${i + 1}`,
                recipientPhone: `0101234${i.toString().padStart(4, '0')}`,
                address: `${i + 1} Main Street, Building ${i + 1}`,
                city,
                price: 30 + (i * 5),
                codAmount: 200 + (i * 10),
                notes: i % 3 === 0 ? 'Fragile items' : null,
                createdBy: merchantProfile.userId,
            },
        });

        orders.push(order);

        // Create order history
        await prisma.orderHistory.create({
            data: {
                orderId: order.id,
                statusFrom: OrderStatus.CREATED, // Hack: seed data constraint. Or null if nullable? statusFrom is OrderStatus (required).
                // Wait, statusFrom is OrderStatus.CREATED in schema @default? No.
                // In schema: statusFrom OrderStatus.
                // So I must provide a valid enum. 'CREATED'.
                statusTo: OrderStatus.CREATED,
                changedById: merchantProfile.userId,
                tenantId: tenant1.id,
            },
        });

        if (status !== OrderStatus.CREATED) {
            await prisma.orderHistory.create({
                data: {
                    orderId: order.id,
                    statusFrom: OrderStatus.CREATED,
                    statusTo: OrderStatus.ASSIGNED,
                    changedById: admin1.id,
                    tenantId: tenant1.id,
                },
            });
        }

        if (status === OrderStatus.DELIVERED) {
            await prisma.orderHistory.create({
                data: {
                    orderId: order.id,
                    statusFrom: OrderStatus.IN_TRANSIT,
                    statusTo: OrderStatus.DELIVERED,
                    changedById: courierProfile?.userId || courier1.id, // Ensure string
                    tenantId: tenant1.id,
                },
            });

            // Create delivery proof
            await prisma.deliveryProof.create({
                data: {
                    orderId: order.id,
                    recipientName: `Customer ${i + 1}`,
                    notes: 'Delivered to customer',
                    latitude: 30.0444 + (Math.random() * 0.1),
                    longitude: 31.2357 + (Math.random() * 0.1),
                },
            });
        }
    }

    console.log(`✅ Created ${50} orders with history`);

    // Create Order Notes
    console.log('📝 Creating order notes...');
    for (let i = 0; i < 10; i++) {
        await prisma.orderNote.create({
            data: {
                orderId: orders[i].id,
                userId: merchant1.id,
                note: `Internal note for order ${i + 1}`,
                isInternal: true,
            },
        });
    }

    console.log(`✅ Created ${10} order notes`);

    // Create Transactions
    console.log('💰 Creating transactions...');
    await prisma.transaction.createMany({
        data: [
            {
                tenantId: tenant1.id,
                merchantId: merchantProfile1.id,
                amount: 1000.00,
                type: 'CREDIT',
                description: 'Initial deposit',
            },
            {
                tenantId: tenant1.id,
                merchantId: merchantProfile1.id,
                amount: -150.00,
                type: 'DEBIT',
                description: 'Shipping fees',
            },
            {
                tenantId: tenant1.id,
                merchantId: merchantProfile2.id,
                amount: 2000.00,
                type: 'CREDIT',
                description: 'Initial deposit',
            },
        ],
    });

    console.log(`✅ Created ${3} transactions`);

    // Create Audit Logs
    console.log('📊 Creating audit logs...');
    // ... (Existing audit logs seem fine or I skip) ...
    // Wait, replace_file_content requires contiguous block. I'll just replace Transactions block.
    // I need distinct call for Notification.
        ],
});

console.log(`✅ Created ${3} transactions`);

// Create Audit Logs
console.log('📊 Creating audit logs...');
await prisma.auditLog.createMany({
    data: [
        {
            tenantId: tenant1.id,
            userId: merchant1.id,
            action: 'ORDER_CREATED',
            entityType: 'Order',
            entityId: orders[0].id,
            newValue: { status: 'CREATED' },
        },
        {
            tenantId: tenant1.id,
            userId: admin1.id,
            action: 'ORDER_STATUS_UPDATED',
            entityType: 'Order',
            entityId: orders[0].id,
            oldValue: { status: 'CREATED' },
            newValue: { status: 'ASSIGNED' },
        },
        {
            tenantId: tenant1.id,
            userId: superAdmin.id,
            action: 'USER_LOGIN',
            entityType: 'User',
            entityId: superAdmin.id,
            ipAddress: '192.168.1.1',
        },
    ],
});

console.log(`✅ Created ${3} audit logs`);

// Create Notifications
console.log('🔔 Creating notifications...');
await prisma.notification.createMany({
    data: [
        {
            tenantId: tenant1.id,
            recipientId: merchant1.id,
            recipientId: merchant1.id,
            type: 'ORDER_STATUS_CHANGE',
            message: 'Your order has been delivered successfully',
            isRead: false,
        },
        {
            tenantId: tenant1.id,
            recipientId: courier1.id,
            recipientId: courier1.id,
            type: 'ORDER_ASSIGNED',
            message: 'You have been assigned a new delivery',
            isRead: true,
        },
    ],
});

console.log(`✅ Created ${2} notifications`);

console.log('\n🎉 Database seeding completed successfully!\n');
console.log('📋 Summary:');
console.log('  - Tenants: 2');
console.log('  - Users: 6 (1 Super Admin, 2 Merchants, 2 Couriers, 1 Admin)');
console.log('  - Merchant Profiles: 2');
console.log('  - Courier Profiles: 2');
console.log('  - Orders: 50 (with various statuses)');
console.log('  - Address Book: 3 entries');
console.log('  - Order Templates: 2');
console.log('  - Transactions: 3');
console.log('  - Audit Logs: 3');
console.log('  - Notifications: 2');
console.log('\n🔑 Login Credentials:');
console.log('  Super Admin: admin@shipex.com / password123');
console.log('  Merchant 1:  merchant1@fastship.com / password123');
console.log('  Merchant 2:  merchant2@fastship.com / password123');
console.log('  Courier 1:   courier1@fastship.com / password123');
console.log('  Courier 2:   courier2@fastship.com / password123');
console.log('  Admin 1:     admin1@fastship.com / password123');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
