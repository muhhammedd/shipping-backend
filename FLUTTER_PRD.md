# Flutter UI Development: PRD & Recommendations | وثيقة متطلبات واجهة المستخدم ونظام الشحن

This document outlines the Product Requirements Document (PRD) and strategic advice for building the Flutter application for the Shipex platform.

تهدف هذه الوثيقة إلى تحديد متطلبات واجهة المستخدم (PRD) وتقديم نصائح استراتيجية لبناء تطبيق Flutter الخاص بمنصة شيبكس.

---

## 🎯 Project Goals | أهداف المشروع
Create a unified mobile experience for three distinct user types:
1.  **Super Admin (Platform Owner):** To manage the entire SaaS ecosystem, tenants (shipping companies), and system-wide settings.
2.  **Admin (Shipping Company Owner):** To manage their specific company, couriers, merchants, and orders.
3.  **Merchants (Traders):** To create orders, track shipments, and manage their financial balance.
4.  **Couriers (Delegates):** To receive assignments, update order statuses, and manage their wallets.

---

## 📱 User Roles & Features | الأدوار والمميزات

### 1. Merchant App (تطبيق التاجر)
*   **Dashboard:** Summary of active orders, total balance, and recent notifications.
*   **Order Management:**
    *   Create new orders (Recipient details, COD amount, city).
    *   Bulk order upload (via Excel/CSV).
    *   Track order status in real-time.
*   **Financials:** View transaction history, current balance, and withdrawal requests.
*   **Notifications:** Alerts for status changes (e.g., "Picked up", "Delivered").

### 2. Courier App (تطبيق المندوب)
*   **Task List:** View assigned orders with navigation/map integration.
*   **Status Updates:** Quick actions to change status (Picked up -> In Transit -> Delivered/Returned).
*   **Proof of Delivery:** Upload images (signatures or package photos) using the camera.
*   **Wallet:** Track earnings per delivery and total collected COD.
*   **Real-time Alerts:** Push notifications for new assignments.

### 3. Super Admin App (تطبيق مالك المنصة)
*   **Tenant Management:** Create, suspend, or delete shipping companies (Tenants).
*   **Subscription Tracking:** Monitor active plans and revenue from tenants.
*   **System Health:** Overview of total orders and users across the entire platform.

### 4. Admin App (تطبيق مدير شركة الشحن)
*   **User Management:** Create and manage Merchants and Couriers within their company.
*   **Order Oversight:** Monitor all company orders, manually assign couriers.
*   **Company Analytics:** Reports on delivery performance and revenue for their specific tenant.

---

## 🛠 Technical Recommendations | نصائح تقنية

### 1. State Management
*   **Recommendation:** Use **Provider** or **Riverpod**.
*   **Why:** They are robust, well-documented, and handle complex states (like multi-role logic) efficiently.

### 2. Architecture
*   **Clean Architecture:** Separate your code into layers:
    *   **Data Layer:** API providers (using `dio`), Repositories.
    *   **Domain Layer:** Entities and Use Cases.
    *   **Presentation Layer:** Widgets and State Notifiers.

### 3. Networking & Real-time
*   **HTTP Client:** Use `dio` for its powerful interceptors (perfect for injecting JWT tokens).
*   **WebSockets:** Use `socket_io_client` to connect to the NestJS backend for real-time notifications.

### 4. UI/UX Tips
*   **Shared Components:** Create a shared UI library for buttons, inputs, and cards to maintain consistency across the three roles.
*   **Offline Support:** Use `hive` or `sqflite` to cache order data so couriers can view their tasks even with poor internet.
*   **Localization:** Use `flutter_localizations` to support both Arabic (RTL) and English (LTR).

---

## 🚀 Next Steps | الخطوات القادمة

1.  **Authentication Flow:** Implement a unified login screen that redirects users to their specific dashboard based on the `role` returned in the JWT.
2.  **Tenant Context:** Ensure every API call includes the `tenantId` (handled by the backend, but the frontend must manage the login session correctly).
3.  **Map Integration:** For couriers, integrate `google_maps_flutter` or `flutter_map` for delivery routing.
4.  **Theming:** Define a professional color palette (e.g., Deep Blue for trust, Green for success/delivered).

---

## 💡 Potential Improvements | تحسينات مقترحة للباك إند

*   **Push Notifications:** Integrate Firebase Cloud Messaging (FCM) in the backend to send native mobile notifications when the app is closed.
*   **Advanced Analytics:** Add an endpoint for generating PDF/Excel reports for merchants' monthly settlements.
*   **Geofencing:** (Future) Add coordinates to order history to verify where the courier was when they marked an order as "Delivered".

---

**Prepared for:** Shipex Shipping Management System
**Status:** Ready for UI Implementation
