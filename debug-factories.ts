import { TestFactories } from './test/factories';
console.log('TestFactories imported successfully');
const tenant = TestFactories.createTenant();
console.log('Created tenant:', tenant.name);
