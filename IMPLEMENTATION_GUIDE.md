# Shipex Shipping Management Platform - Implementation Guide

## Phase 1.5: Integration Readiness ✅ COMPLETED

### Features Implemented

#### 1. Pagination & Filtering
- **PaginationDto**: Base DTO for handling `page` and `limit` parameters
- **FilterOrderDto**: Extends PaginationDto with `status` and date range filters
- **FilterTenantDto**: Extends PaginationDto with `status` filter
- **PaginatedResponseDto**: Standard response structure with metadata

**Usage Examples:**
```bash
# Get orders with pagination
GET /api/v1/orders?page=1&limit=10

# Filter orders by status
GET /api/v1/orders?page=1&limit=10&status=DELIVERED

# Filter orders by date range
GET /api/v1/orders?page=1&limit=10&startDate=2026-01-01&endDate=2026-01-08

# Filter tenants by status
GET /api/v1/tenants?page=1&limit=10&status=ACTIVE
```

#### 2. CORS Configuration
- Enabled CORS with configurable origin list via `CORS_ORIGIN` environment variable
- Default allowed origins: `http://localhost:3000`, `http://localhost:3001`
- Supports credentials and standard HTTP methods (GET, POST, PUT, PATCH, DELETE, OPTIONS)
- Authorization header support for JWT tokens

#### 3. Global Guards & Interceptors
- **AccessTokenGuard**: Validates JWT tokens globally
- **RolesGuard**: Enforces role-based access control
- **TenantInterceptor**: Automatically injects `tenantId` from JWT
- **TransformInterceptor**: Standardizes API responses

#### 4. Enhanced Swagger Documentation
- Integrated Swagger UI with persistent authorization
- Bearer token support for API testing
- Server configuration for development environment

---

## Phase 2: Financials & Operations 🚀 IN PROGRESS

### Features Implemented

#### 1. Order Assignment
**Endpoint:** `PATCH /api/v1/orders/:id/assign`

**Request Body:**
```json
{
  "courierId": "uuid-of-courier"
}
```

**Features:**
- Only ADMIN role can assign orders
- Validates courier belongs to the same tenant
- Updates order status to `ASSIGNED`
- Records assignment in order history
- Automatic transaction handling

**Response:**
```json
{
  "success": true,
  "message": "Order assigned successfully",
  "data": {
    "id": "order-id",
    "trackingNumber": "SHP-123456-789",
    "status": "ASSIGNED",
    "courierId": "courier-id",
    "merchantId": "merchant-id",
    "createdAt": "2026-01-08T10:00:00Z"
  }
}
```

#### 2. Financial Module
**Service:** `FinanceService`

**Key Methods:**

##### Calculate Merchant Balance
```typescript
calculateMerchantBalance(merchantId: string, tenantId: string): Promise<Decimal>
```
Calculates: Total COD Collected - Shipping Fees = Merchant Payout

##### Update Merchant Balance on Delivery
```typescript
updateMerchantBalanceOnDelivery(orderId: string, tenantId: string): Promise<MerchantProfile>
```
Automatically updates merchant balance when order status changes to `DELIVERED`

##### Update Courier Wallet on Delivery
```typescript
updateCourierWalletOnDelivery(courierId: string, codAmount: number): Promise<CourierProfile>
```
Automatically credits courier wallet with COD amount upon delivery

##### Get Merchant Balance
```typescript
getMerchantBalance(merchantId: string): Promise<Decimal>
```

##### Get Courier Wallet
```typescript
getCourierWallet(courierId: string): Promise<Decimal>
```

#### 3. Automatic Financial Updates
When an order status is updated to `DELIVERED`:
1. **Merchant Balance** is incremented by: `COD Amount - Shipping Fee`
2. **Courier Wallet** is incremented by: `COD Amount`
3. Both updates happen within a single database transaction

**Example Calculation:**
- Order COD Amount: 100 USD
- Shipping Fee: 10 USD
- Merchant Balance Change: +90 USD
- Courier Wallet Change: +100 USD

#### 4. Enhanced Order Management
- **Merchant-specific visibility**: Merchants can only see their own orders
- **Admin visibility**: Admins can see all orders in their tenant
- **Courier visibility**: Couriers can see assigned orders
- **Detailed order information**: Includes merchant balance and courier wallet in responses

---

## Phase 3: Enhancements (Upcoming)

### Planned Features
1. **File Upload**: Support for shipment photos and identity documents
2. **Notification System**: Real-time updates via WebSockets
3. **PDF Invoice Generation**: Automated invoice creation for merchants
4. **Advanced Dispatching**: Automated order-to-courier assignment

---

## Environment Configuration

Create a `.env` file based on `.env.example`:

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/shipex

# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=3600

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# API Configuration
API_URL=http://localhost:3000
```

---

## API Response Format

All API responses follow a consistent structure:

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE",
  "statusCode": 400
}
```

---

## Role-Based Access Control (RBAC)

| Role | Permissions |
|------|-------------|
| **SUPER_ADMIN** | Manage tenants, view all platform data |
| **ADMIN** | Manage company staff, assign orders, view financial reports |
| **MERCHANT** | Create orders, view own balance, track shipments |
| **COURIER** | Update order status, view assigned orders, manage wallet |

---

## Database Schema Highlights

### Key Tables
- **tenants**: Shipping company information
- **users**: User accounts with roles
- **merchant_profiles**: Merchant-specific data with balance tracking
- **courier_profiles**: Courier-specific data with wallet tracking
- **orders**: Shipment records with financial data
- **order_histories**: Audit trail for all order changes

### Multi-Tenancy
- Every query is scoped by `tenantId`
- Row-level security ensures data isolation
- Zero-tolerance policy for data leakage

---

## Testing the API

### 1. Register a New Tenant
```bash
POST /api/v1/auth/sign-up
{
  "email": "admin@shipex.com",
  "password": "secure-password",
  "companyName": "Shipex Company",
  "companySlug": "shipex-company"
}
```

### 2. Login
```bash
POST /api/v1/auth/sign-in
{
  "email": "admin@shipex.com",
  "password": "secure-password"
}
```

### 3. Create an Order
```bash
POST /api/v1/orders
Authorization: Bearer {accessToken}
{
  "recipientName": "John Doe",
  "recipientPhone": "+1234567890",
  "address": "123 Main St",
  "city": "New York",
  "price": 10,
  "codAmount": 100
}
```

### 4. Assign Order to Courier
```bash
PATCH /api/v1/orders/{orderId}/assign
Authorization: Bearer {accessToken}
{
  "courierId": "courier-uuid"
}
```

### 5. Update Order Status to Delivered
```bash
PATCH /api/v1/orders/{orderId}/status
Authorization: Bearer {accessToken}
{
  "status": "DELIVERED"
}
```

---

## Next Steps

1. **Implement Phase 3 Features**:
   - File upload service
   - WebSocket notifications
   - PDF invoice generation

2. **Add Comprehensive Tests**:
   - Unit tests for services
   - E2E tests for API endpoints
   - Integration tests for financial logic

3. **Performance Optimization**:
   - Database indexing review
   - Caching strategy
   - Query optimization

4. **Security Enhancements**:
   - Rate limiting
   - Input validation improvements
   - Audit logging

5. **Deployment Preparation**:
   - Docker containerization
   - CI/CD pipeline setup
   - Production environment configuration

---

## Support & Documentation

For detailed API documentation, visit:
```
http://localhost:3000/api/docs
```

This Swagger UI provides interactive API testing and full endpoint documentation.
