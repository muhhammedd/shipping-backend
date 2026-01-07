# Prisma Schema Updates for Phase 3

## New Models to Add to schema.prisma

### 1. UploadedFile Model
```prisma
model UploadedFile {
  id            String   @id @default(uuid())
  fileName      String
  fileType      String
  fileSize      Int
  fileCategory  String   // e.g., 'shipment_photo', 'identity_document'
  filePath      String   @unique
  
  // Multi-tenancy
  tenantId      String
  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  
  // Optional: Link to order
  orderId       String?
  order         Order?   @relation(fields: [orderId], references: [id])
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([tenantId])
  @@index([orderId])
  @@map("uploaded_files")
}
```

### 2. Notification Model
```prisma
model Notification {
  id          String      @id @default(uuid())
  type        String      // e.g., 'ORDER_STATUS_CHANGE', 'ORDER_ASSIGNED'
  orderId     String
  order       Order       @relation(fields: [orderId], references: [id])
  status      OrderStatus
  message     String
  isRead      Boolean     @default(false)
  
  // Recipient
  recipientId String?
  recipient   User?       @relation(fields: [recipientId], references: [id])
  
  // Multi-tenancy
  tenantId    String
  tenant      Tenant      @relation(fields: [tenantId], references: [id])
  
  createdAt   DateTime    @default(now())
  
  @@index([tenantId])
  @@index([orderId])
  @@index([recipientId])
  @@map("notifications")
}
```

## Updates to Existing Models

### Tenant Model
Add relationships:
```prisma
uploadedFiles  UploadedFile[]
notifications  Notification[]
```

### Order Model
Add relationship:
```prisma
uploadedFiles  UploadedFile[]
notifications  Notification[]
```

### User Model
Add relationship:
```prisma
notificationsReceived Notification[] @relation("NotificationRecipient")
```

## Migration Steps

1. Update `prisma/schema.prisma` with the new models
2. Run migration:
```bash
npx prisma migrate dev --name add_files_and_notifications
```

3. Update Prisma client:
```bash
npx prisma generate
```

## Environment Variables

Add to `.env`:
```env
# File Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880  # 5MB in bytes
```
