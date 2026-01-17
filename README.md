# Shipex Shipping Management Platform | منصة شيبكس لإدارة الشحن

Shipex is a comprehensive Multi-Tenant B2B SaaS platform designed to streamline shipping operations. It serves as a central hub connecting Merchants, Couriers, and Administrators, managing the entire lifecycle of shipping orders from creation to final delivery.

شيبكس هي منصة سحابية متكاملة (SaaS) متعددة المستأجرين مصممة لتنظيم عمليات الشحن. تعمل المنصة كمركز رئيسي يربط بين التجار، المناديب، والمديرين، حيث تدير دورة حياة طلبات الشحن بالكامل من الإنشاء وحتى التسليم النهائي.

---

## 🚀 Key Features | المميزات الرئيسية

- **Multi-Tenancy (Row-Level Isolation):** Secure data isolation for different shipping companies using a single database.
- **Role-Based Access Control (RBAC):** Specialized dashboards for Platform Owners (Super Admins), Shipping Company Owners (Admins), Merchants, and Couriers.
- **Order Lifecycle Management:** Complete tracking of orders from "Pending" to "Delivered" or "Returned".
- **Financial Tracking:** Real-time balance calculations for merchants and Cash on Delivery (COD) handling.
- **Real-Time Notifications:** Instant updates via WebSockets for status changes and assignments.
- **File Management:** Secure handling of attachments and documents related to orders.
- **API Documentation:** Fully documented RESTful API using Swagger/OpenAPI.

- **تعدد المستأجرين (عزل البيانات):** عزل آمن للبيانات لكل شركة شحن باستخدام قاعدة بيانات واحدة.
- **نظام صلاحيات متطور (RBAC):** واجهات مخصصة لكل من (مالك المنصة Super Admin، مدير شركة الشحن Admin، التاجر، والمندوب).
- **إدارة دورة حياة الطلبات:** تتبع كامل للطلبات من حالة "قيد الانتظار" إلى "تم التسليم" أو "مرتجع".
- **التتبع المالي:** حسابات فورية لأرصدة التجار ومعالجة مبالغ التحصيل عند الاستلام (COD).
- **تنبيهات فورية:** تحديثات مباشرة عبر WebSockets لتغييرات الحالة والتعيينات.
- **إدارة الملفات:** معالجة آمنة للمرفقات والمستندات المتعلقة بالطلبات.
- **توثيق برمجى (API):** توثيق كامل للواجهات البرمجية باستخدام Swagger/OpenAPI.

---

## 🛠 Tech Stack | التقنيات المستخدمة

- **Backend:** NestJS (Node.js Framework)
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** JWT (JSON Web Tokens)
- **Real-Time:** Socket.io (WebSockets)
- **Documentation:** Swagger UI

---

## 📂 Project Structure | هيكل المشروع

```text
src/modules/
├── core/           # PrismaService (Global database access)
├── iam/            # Identity & Access Management (Auth, RBAC, SaaS Hierarchy)
├── tenants/        # Tenant & Subscription management (Super Admin only)
├── orders/         # Order CRUD & Lifecycle management
├── finance/        # Merchant balance & COD handling
├── files/          # File upload/download management
└── notifications/  # WebSocket real-time notifications
```

---

## ⚙️ Getting Started | البدء في العمل

### Prerequisites | المتطلبات الأساسية
- Node.js (v22+)
- PostgreSQL Database
- pnpm or npm

### Installation | التثبيت

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd shipping-backend
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Environment Variables:**
   Create a `.env` file based on the following template:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/shipex"
   JWT_SECRET="your-super-secret-key"
   JWT_EXPIRATION="3600s"
   CORS_ORIGIN="*"
   PORT=5000
   ```

4. **Database Migration:**
   ```bash
   npx prisma migrate dev
   ```

5. **Run the application:**
   ```bash
   pnpm run start:dev
   ```

---

## 📚 API Documentation | توثيق الواجهات البرمجية

Once the server is running, you can access the interactive Swagger documentation at:
بمجرد تشغيل الخادم، يمكنك الوصول إلى توثيق Swagger التفاعلي عبر الرابط:

`http://localhost:5000/api/docs`

---

## 🛡 Security | الأمان

The platform implements industry-standard security practices:
- Password hashing using **Bcrypt**.
- Stateless authentication via **JWT**.
- Row-level data isolation for multi-tenancy.
- Input validation and sanitization using **class-validator**.

---

## 📄 License | الترخيص

This project is private and confidential.
هذا المشروع خاص وسري.
