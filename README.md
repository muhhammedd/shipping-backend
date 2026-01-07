# Shipex Shipping Management Platform (SSMP)

Shipex is a Multi-Tenant B2B SaaS platform designed to manage the entire lifecycle of shipping operations. It connects Merchants, Couriers, and Admins in a unified, scalable, and secure system.

## 🚀 Features

- **Multi-Tenancy**: Logical isolation using `tenantId` at the database level.
- **RBAC (Role-Based Access Control)**: Secure access management for Super Admins, Admins, Merchants, and Couriers.
- **Modular Monolith Architecture**: Built with NestJS for scalability and maintainability.
- **Prisma ORM**: Type-safe database operations with PostgreSQL.
- **JWT Authentication**: Stateless authentication with secure password hashing using Bcrypt.
- **API-First Design**: Consistent RESTful API responses and global exception handling.

## 🛠️ Tech Stack

- **Framework**: [NestJS](https://nestjs.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Authentication**: [Passport.js](http://www.passportjs.org/) & JWT
- **Validation**: [class-validator](https://github.com/typestack/class-validator)

## 🏗️ Project Structure

```text
src/
├── common/               # Shared decorators, guards, filters, and interfaces
├── modules/
│   ├── core/             # Global services (Prisma, Config)
│   ├── iam/              # Identity & Access Management (Auth, Hashing, RBAC)
│   └── tenants/          # Tenant management
├── app.module.ts         # Main application module
└── main.ts               # Application entry point
```

## 🚦 Getting Started

### Prerequisites

- Node.js (v22+)
- pnpm
- PostgreSQL

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/muhhammedd/shipping-backend.git
   cd shipping-backend
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add your database URL and JWT secret:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/shipex"
   JWT_SECRET="your-super-secret-key"
   ```

4. Generate Prisma Client:
   ```bash
   npx prisma generate
   ```

5. Run the application:
   ```bash
   pnpm run start:dev
   ```

## 📖 API Documentation

The API is prefixed with `/api/v1`.

### Authentication
- `POST /api/v1/iam/sign-up`: Register a new company and admin.
- `POST /api/v1/iam/sign-in`: Login to receive a JWT.
- `GET /api/v1/iam/me`: Get current user profile (Protected).

## 📄 License

This project is licensed under the MIT License.
