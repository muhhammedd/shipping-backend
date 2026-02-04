import { v4 as uuidv4 } from 'uuid';
import { UserRole, OrderStatus, TenantStatus, SubscriptionPlan, CourierStatus } from '@prisma/client';

export class TestFactories {
    static createTenant(overrides = {}) {
        return {
            id: uuidv4(),
            name: 'Test Tenant',
            slug: `test-tenant-${uuidv4().substring(0, 8)}`,
            status: TenantStatus.ACTIVE,
            plan: SubscriptionPlan.PREMIUM,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...overrides,
        };
    }

    static createUser(overrides = {}) {
        return {
            id: uuidv4(),
            email: `user-${uuidv4().substring(0, 8)}@example.com`,
            passwordHash: 'hashed-password',
            role: UserRole.MERCHANT,
            firstName: 'John',
            lastName: 'Doe',
            isActive: true,
            tenantId: uuidv4(),
            createdAt: new Date(),
            updatedAt: new Date(),
            ...overrides,
        };
    }

    static createOrder(overrides = {}) {
        return {
            id: uuidv4(),
            trackingNumber: `SHP-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
            status: OrderStatus.CREATED,
            senderName: 'Sender Name',
            senderPhone: '123456789',
            senderAddress: 'Sender Address',
            recipientName: 'Recipient Name',
            recipientPhone: '987654321',
            recipientAddress: 'Recipient Address',
            weight: 1.5,
            shippingCost: 10.0,
            tenantId: uuidv4(),
            merchantId: uuidv4(),
            createdAt: new Date(),
            updatedAt: new Date(),
            ...overrides,
        };
    }

    static createCourierProfile(overrides = {}) {
        return {
            id: uuidv4(),
            userId: uuidv4(),
            tenantId: uuidv4(),
            vehicleInfo: 'Motorcycle - ABC-123',
            wallet: 100.0,
            status: CourierStatus.AVAILABLE,
            isAvailable: true,
            rating: 5.0,
            completedDeliveries: 0,
            failedDeliveries: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...overrides,
        };
    }
}
