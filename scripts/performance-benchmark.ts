import axios from 'axios';
import { performance } from 'perf_hooks';

const BASE_URL = 'http://localhost:5000/api/v1';

async function benchmark() {
    console.log('🚀 Starting Performance Benchmark...');

    // 1. Login to get token
    let token = '';
    try {
        const loginRes = await axios.post(`${BASE_URL}/iam/sign-in`, {
            email: 'admin@test.com',
            password: 'password',
        });
        token = (loginRes.data as any).access_token;
        console.log('✅ Logged in successfully.');
    } catch (err: any) {
        console.error('❌ Login failed:', err.message);
        return;
    }

    const endpoints = [
        { name: 'Root Health Check', url: '/' },
        { name: 'Admin Summary (Analytics)', url: '/analytics/admin/summary' },
        { name: 'Merchant Summary (me)', url: '/analytics/merchant/me' },
        { name: 'Orders List', url: '/orders?page=1&limit=10' },
    ];

    for (const endpoint of endpoints) {
        console.log(`\n📊 Testing: ${endpoint.name}`);
        const times: number[] = [];

        for (let i = 0; i < 5; i++) {
            const start = performance.now();
            try {
                await axios.get(`${BASE_URL}${endpoint.url}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const end = performance.now();
                times.push(end - start);
            } catch (err: any) {
                console.error(`  [Run ${i + 1}] ❌ Error: ${err.response?.status || err.message}`);
                if (err.response?.data) {
                    console.error(`     Response Details:`, JSON.stringify(err.response.data));
                }
            }
        }

        if (times.length > 0) {
            const avg = times.reduce((a, b) => a + b, 0) / times.length;
            const min = Math.min(...times);
            const max = Math.max(...times);
            console.log(`  Average: ${avg.toFixed(2)}ms`);
            console.log(`  Min: ${min.toFixed(2)}ms`);
            console.log(`  Max: ${max.toFixed(2)}ms`);
        }
    }

    console.log('\n✅ Benchmark complete.');
}

benchmark();
