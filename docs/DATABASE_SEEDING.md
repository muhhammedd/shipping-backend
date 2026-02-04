# Database Seeding Guide

## Overview

The database seeding script populates your development database with realistic test data, making it easy to develop and test features without manually creating data.

## What Gets Seeded

### Tenants (2)
- **FastShip Egypt** - Professional plan, 10,000 max orders
- **QuickDeliver Co** - Enterprise plan, 50,000 max orders

### Users (6)
- **1 Super Admin** - Full system access
- **2 Merchants** - Can create and manage orders
- **2 Couriers** - Can deliver orders
- **1 Admin** - Tenant administration

### Merchant Profiles (2)
- **Cairo Electronics Store** - Balance: 5,000 EGP
- **Alexandria Fashion Boutique** - Balance: 3,500 EGP

### Courier Profiles (2)
- **Courier 1** - Motorcycle, Wallet: 1,200 EGP
- **Courier 2** - Van, Wallet: 2,500 EGP

### Orders (50)
- Various statuses: CREATED, ASSIGNED, PICKED_UP, IN_TRANSIT, DELIVERED
- Distributed across 10 Egyptian cities
- Complete order history for each
- Delivery proofs for delivered orders

### Additional Data
- **3 Address Book entries** - Saved addresses for merchants
- **2 Order Templates** - Reusable order templates
- **3 Transactions** - Deposits and withdrawals
- **10 Order Notes** - Internal comments
- **3 Audit Logs** - System activity tracking
- **2 Notifications** - User notifications

## Running the Seed

### Method 1: Using npm script
```bash
npm run db:seed
```

### Method 2: Using Prisma
```bash
npx prisma db seed
```

### Method 3: Reset database and seed
```bash
npm run db:reset
```
**⚠️ Warning:** This will delete all existing data!

## Login Credentials

All users have the same password: `password123`

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@shipex.com | password123 |
| Merchant 1 | merchant1@fastship.com | password123 |
| Merchant 2 | merchant2@fastship.com | password123 |
| Courier 1 | courier1@fastship.com | password123 |
| Courier 2 | courier2@fastship.com | password123 |
| Admin 1 | admin1@fastship.com | password123 |

## Testing Scenarios

### As a Merchant
1. Login as `merchant1@fastship.com`
2. View your orders (25 orders)
3. Create new orders
4. Use address book
5. Use order templates
6. Check balance and transactions

### As a Courier
1. Login as `courier1@fastship.com`
2. View assigned orders
3. Update order status
4. Submit delivery proof
5. Check wallet balance

### As an Admin
1. Login as `admin1@fastship.com`
2. View all orders
3. Assign orders to couriers
4. View audit logs
5. Manage users

### As a Super Admin
1. Login as `admin@shipex.com`
2. Full system access
3. Manage tenants
4. View system-wide analytics

## Data Distribution

### Orders by Status
- ~10 CREATED (awaiting assignment)
- ~10 ASSIGNED (assigned to courier)
- ~10 PICKED_UP (courier picked up)
- ~10 IN_TRANSIT (on the way)
- ~10 DELIVERED (completed with proof)

### Orders by City
Distributed across 10 Egyptian cities:
- Cairo
- Alexandria
- Giza
- Shubra El Kheima
- Port Said
- Suez
- Luxor
- Mansoura
- Tanta
- Asyut

## Customization

To modify the seed data, edit `prisma/seed.ts`:

```typescript
// Change number of orders
for (let i = 0; i < 100; i++) { // Change 50 to 100

// Add more cities
const egyptianCities = ['Cairo', 'Alexandria', 'YourCity'];

// Change user credentials
email: 'your-email@example.com',
passwordHash: await bcrypt.hash('your-password', 10),
```

## Troubleshooting

### Error: "Cannot find module 'bcrypt'"
```bash
npm install bcrypt
```

### Error: "Database connection failed"
Check your `.env` file and ensure `DATABASE_URL` is correct.

### Error: "Foreign key constraint failed"
The script clears data in the correct order. If you see this error, try:
```bash
npm run db:reset
```

### Seed runs but no data appears
Check that migrations are up to date:
```bash
npx prisma migrate dev
```

## Best Practices

1. **Development Only** - Never run seed in production
2. **Fresh Start** - Use `npm run db:reset` for a clean slate
3. **Custom Data** - Modify seed.ts for your specific test cases
4. **Version Control** - Commit seed.ts changes
5. **Documentation** - Update this file if you change seed data

## Integration with Development Workflow

### Initial Setup
```bash
# 1. Install dependencies
npm install

# 2. Run migrations
npx prisma migrate dev

# 3. Seed database
npm run db:seed

# 4. Start development server
npm run start:dev
```

### Daily Development
```bash
# Reset and seed when needed
npm run db:reset

# Or just re-seed without reset
npm run db:seed
```

## Prisma Studio

View seeded data visually:
```bash
npm run prisma:studio
```

Opens at: http://localhost:5555

## Next Steps

After seeding:
1. ✅ Login with any test account
2. ✅ Test API endpoints
3. ✅ Develop new features
4. ✅ Run integration tests
5. ✅ Debug with realistic data

---

**Happy Coding! 🚀**
