import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding fresh test accounts...');
    const pwHash = await bcrypt.hash('password', 10);

    // 1. Create Main Tenant
    const tenant = await prisma.tenant.upsert({
        where: { slug: 'shipex-test' },
        update: {},
        create: {
            name: 'Shipex Test Network',
            slug: 'shipex-test',
        },
    });

    const users = [
        {
            email: 'superadmin@test.com',
            role: UserRole.SUPER_ADMIN,
            name: 'Super Admin User'
        },
        {
            email: 'admin@test.com',
            role: UserRole.ADMIN,
            name: 'Admin User'
        },
        {
            email: 'merchant@test.com',
            role: UserRole.MERCHANT,
            name: 'Merchant User',
            profile: {
                merchantProfile: {
                    create: {
                        tenantId: tenant.id,
                        companyName: 'Test Merchant Co',
                    }
                }
            }
        },
        {
            email: 'courier@test.com',
            role: UserRole.COURIER,
            name: 'Courier User',
            profile: {
                courierProfile: {
                    create: {
                        tenantId: tenant.id,
                        vehicleInfo: 'Test Bike',
                    }
                }
            }
        }
    ];

    for (const userData of users) {
        const { email, role, profile } = userData;
        await prisma.user.upsert({
            where: { email },
            update: { role, tenantId: tenant.id },
            create: {
                email,
                passwordHash: pwHash,
                role,
                tenantId: tenant.id,
                ...(profile || {})
            },
        });
        console.log(`✅ Created ${role}: ${email}`);
    }

    console.log('\n🚀 All test accounts ready. Password for all: password');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
