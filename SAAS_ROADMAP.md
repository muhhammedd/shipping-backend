# SaaS Roadmap: Subscription & Platform Management | خارطة طريق نظام الـ SaaS

This document provides a technical roadmap for implementing the **Super Admin** features and **Subscription Management** to turn Shipex into a fully commercial SaaS product.

توفر هذه الوثيقة خارطة طريق تقنية لتنفيذ ميزات **المدير العام (Super Admin)** وإدارة **الاشتراكات** لتحويل شيبكس إلى منتج SaaS تجاري متكامل.

---

## 🏗 1. Database Enhancements | تحسينات قاعدة البيانات

To support subscriptions, the `Tenant` model should be expanded:

```prisma
// Suggested additions to schema.prisma
model Tenant {
  // ... existing fields
  plan          SubscriptionPlan @default(FREE)
  expiresAt     DateTime?
  maxOrders     Int              @default(100)
  maxUsers      Int              @default(5)
}

enum SubscriptionPlan {
  FREE
  BASIC
  PREMIUM
  ENTERPRISE
}
```

---

## 🔐 2. Super Admin Logic | منطق المدير العام

### Global Access (Cross-Tenant)
Currently, the `TenantInterceptor` and `OrdersService` enforce strict tenant isolation. For the **Super Admin**, we need to allow "Global View" access.

**Recommendation:**
Modify `TenantInterceptor` to skip `tenantId` injection if the user is a `SUPER_ADMIN`.

```typescript
// src/common/interceptors/tenant.interceptor.ts
if (user.role === UserRole.SUPER_ADMIN) {
  return next.handle(); // Super Admin can see everything
}
```

---

## 💳 3. Subscription Management | إدارة الاشتراكات

### Implementation Steps:
1.  **Plan Definition:** Create a module to manage subscription plans and pricing.
2.  **Payment Integration:** Integrate a payment gateway (e.g., Stripe, Moyasar, or Tap) to handle automated renewals.
3.  **Usage Limits:** Implement guards that check if a tenant has reached their order limit before allowing `OrdersService.create()`.

---

## 📊 4. Super Admin Dashboard Features | ميزات لوحة تحكم المالك

- **Tenant Onboarding:** A dedicated UI to approve or create new shipping company accounts.
- **Revenue Analytics:** A chart showing monthly recurring revenue (MRR) from all tenants.
- **System Logs:** Audit logs to see which Admin performed what action across the entire platform.
- **Global Notifications:** Ability to send a system-wide announcement to all Admins, Merchants, and Couriers.

---

## 🚀 5. Next Technical Steps | الخطوات التقنية القادمة

1.  **Refine `RolesGuard`:** Ensure it handles the hierarchy correctly (Super Admin > Admin > Merchant/Courier).
2.  **Tenant Creation API:** Move tenant creation from `AuthenticationService.signUp` to a dedicated `TenantsService` accessible only by Super Admin (or a public "Register Business" endpoint with approval flow).
3.  **Multi-Language Support:** Ensure the backend error messages and notifications support both Arabic and English for different tenants.

---

**Note:** The current backend is already "Multi-Tenant Ready". These steps will move it from a "Single-Company" system to a "Platform" system.
**ملاحظة:** النظام الحالي جاهز تقنياً لتعدد المستأجرين. هذه الخطوات ستنقله من نظام "لشركة واحدة" إلى "منصة" تخدم شركات متعددة.
