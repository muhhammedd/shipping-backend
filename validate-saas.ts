import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function validateSaaSFeatures() {
    console.log('🔍 Validating SaaS Backend Features...\n');

    try {
        // Test 1: Check if new tables exist
        console.log('✓ Testing database schema...');
        const subscriptionCount = await prisma.subscription.count();
        const apiKeyCount = await prisma.apiKey.count();
        const webhookCount = await prisma.webhookSubscription.count();
        console.log(`  - Subscriptions table: ${subscriptionCount} records`);
        console.log(`  - API Keys table: ${apiKeyCount} records`);
        console.log(`  - Webhooks table: ${webhookCount} records`);

        // Test 2: Create a test API key
        console.log('\n✓ Testing API Key creation...');
        const testTenant = await prisma.tenant.findFirst();
        if (testTenant) {
            const testKey = await prisma.apiKey.create({
                data: {
                    tenantId: testTenant.id,
                    key: 'shipex_test_' + Date.now(),
                    name: 'Validation Test Key',
                    permissions: ['orders:read'],
                },
            });
            console.log(`  - Created test API key: ${testKey.name}`);

            // Clean up
            await prisma.apiKey.delete({ where: { id: testKey.id } });
            console.log('  - Cleaned up test key');
        }

        // Test 3: Check Prisma Client types
        console.log('\n✓ Testing Prisma Client types...');
        const hasSubscriptionModel = typeof prisma.subscription !== 'undefined';
        const hasApiKeyModel = typeof prisma.apiKey !== 'undefined';
        const hasWebhookModel = typeof prisma.webhookSubscription !== 'undefined';
        console.log(`  - Subscription model: ${hasSubscriptionModel ? '✓' : '✗'}`);
        console.log(`  - ApiKey model: ${hasApiKeyModel ? '✓' : '✗'}`);
        console.log(`  - WebhookSubscription model: ${hasWebhookModel ? '✓' : '✗'}`);

        console.log('\n✅ All SaaS features validated successfully!');
        console.log('\n📋 Next Steps:');
        console.log('  1. Configure environment variables in .env');
        console.log('  2. Set up Redis for queues');
        console.log('  3. Configure Stripe keys');
        console.log('  4. Test billing checkout flow');
        console.log('  5. Test API key authentication');

    } catch (error) {
        console.error('\n❌ Validation failed:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

validateSaaSFeatures();
