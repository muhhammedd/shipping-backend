# Shipex Shipping Management Platform

## Overview

Shipex is a Multi-Tenant B2B SaaS platform for managing shipping operations. It connects Merchants, Couriers, and Admins in a unified system, handling the complete lifecycle of shipping orders from creation to delivery. The platform provides role-based access control, financial tracking, file management, and real-time notifications.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Framework & Language
- **NestJS** with **TypeScript** - Modular monolith architecture
- ES2023 target with Node.js v22+
- Uses pnpm as package manager

### Database & ORM
- **PostgreSQL** as the primary database
- **Prisma ORM** for type-safe database operations
- Multi-tenant data isolation using `tenantId` at row level

### Authentication & Authorization
- **JWT-based stateless authentication** via Passport.js
- Token payload includes: `sub` (userId), `email`, `role`, `tenantId`
- Four user roles: `SUPER_ADMIN`, `ADMIN`, `MERCHANT`, `COURIER`
- Global guards: `AccessTokenGuard` (JWT validation) and `RolesGuard` (RBAC enforcement)
- `@Public()` decorator exempts endpoints from authentication
- `@Roles()` decorator restricts endpoints by role

### Multi-Tenancy
- Logical tenant isolation via `tenantId` field on all data
- `TenantInterceptor` auto-injects `tenantId` from JWT into request body
- Every query must be scoped by tenant

### API Design
- RESTful API with `/api/v1` prefix
- Global `ValidationPipe` with whitelist and type transformation
- Standardized responses via `TransformInterceptor`
- Global exception handling with `AllExceptionsFilter`
- Swagger/OpenAPI documentation

### Module Structure
```
src/modules/
├── core/           # PrismaService (global database access)
├── iam/            # Authentication, authorization, password hashing
├── tenants/        # Tenant management (Super Admin only)
├── orders/         # Order CRUD, status updates, courier assignment
├── finance/        # Merchant balance calculations, COD handling
├── files/          # File upload/download (base64, local storage)
├── notifications/  # WebSocket real-time notifications
```

### Real-Time Features
- WebSocket gateway using Socket.io for notifications
- JWT authentication on socket connections
- User connection tracking for targeted notifications

### Key Design Patterns
- DTOs with class-validator for input validation
- Pagination via `PaginationDto` base class with `page`, `limit`, `skip`
- Filter DTOs extend pagination for status/date filtering
- Decimal.js for precise financial calculations

## External Dependencies

### Core Framework
- `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express` - NestJS framework
- `@nestjs/config` - Environment configuration
- `@nestjs/swagger` + `swagger-ui-express` - API documentation

### Database
- `@prisma/client` - PostgreSQL ORM client
- Requires `DATABASE_URL` environment variable

### Authentication
- `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt` - JWT authentication
- `bcrypt` - Password hashing
- Requires `JWT_SECRET` environment variable

### Real-Time
- `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io` - WebSocket support

### Validation & Utilities
- `class-validator`, `class-transformer` - DTO validation
- `decimal.js` - Precise decimal arithmetic
- `uuid` - UUID generation

### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT signing
- `JWT_EXPIRATION` - Token expiration (default: 3600s)
- `CORS_ORIGIN` - Allowed origins (comma-separated or `*`)
- `UPLOAD_DIR` - File upload directory (default: `./uploads`)