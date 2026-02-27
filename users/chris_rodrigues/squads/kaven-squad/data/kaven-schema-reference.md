# Kaven Framework — Prisma Schema Reference

> 54 Models, 28 Enums — Complete field reference grouped by domain.
> Source: `packages/database/prisma/schema.base.prisma` + `schema.extended.prisma`

---

## Core Domain

### Tenant
```prisma
model Tenant {
  id            String    @id @default(uuid())
  name          String
  slug          String    @unique
  customDomain  String?   @unique
  plan          PlanType  @default(STARTER)
  status        TenantStatus @default(ACTIVE)
  settings      Json?     @default("{}")
  logoUrl       String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?

  // Relations
  users         User[]
  roles         Role[]
  grants        Grant[]
  policies      Policy[]
  invoices      Invoice[]
  orders        Order[]
  subscriptions Subscription[]
  spaces        Space[]
  projects      Project[]
  tasks         Task[]
  auditLogs     AuditLog[]
  features      Feature[]
  usageTracking UsageTracking[]
}
```

### User
```prisma
model User {
  id              String    @id @default(uuid())
  tenantId        String
  email           String
  name            String
  passwordHash    String
  role            UserRole  @default(USER)
  avatarUrl       String?
  twoFactorSecret String?
  emailVerified   Boolean   @default(false)
  lastLoginAt     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?

  tenant          Tenant    @relation(fields: [tenantId], references: [id])
  refreshTokens   RefreshToken[]
  passwordResets  PasswordReset[]
  grants          Grant[]
  preferences     UserPreference[]
  tasks           Task[]    @relation("TaskAssignee")
  notifications   Notification[]
  securityLogs    SecurityAuditLog[]
  auditLogs       AuditLog[]

  @@unique([tenantId, email])
  @@index([tenantId, email])
  @@index([tenantId, role])
}
```

### Role
```prisma
model Role {
  id          String   @id @default(uuid())
  tenantId    String
  name        String
  description String?
  permissions Json     @default("[]")
  isSystem    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant      Tenant   @relation(fields: [tenantId], references: [id])

  @@unique([tenantId, name])
  @@index([tenantId])
}
```

### Grant
```prisma
model Grant {
  id           String   @id @default(uuid())
  tenantId     String
  userId       String
  capabilityId String
  value        Json
  grantedBy    String?
  grantedAt    DateTime @default(now())
  expiresAt    DateTime?

  tenant       Tenant     @relation(fields: [tenantId], references: [id])
  user         User       @relation(fields: [userId], references: [id])
  capability   Capability @relation(fields: [capabilityId], references: [id])

  @@unique([tenantId, userId, capabilityId])
  @@index([tenantId, userId])
}
```

### Capability
```prisma
model Capability {
  id           String         @id @default(uuid())
  code         String         @unique
  description  String
  type         CapabilityType @default(BOOLEAN)
  defaultValue Json

  grants       Grant[]
}
```

### Policy
```prisma
model Policy {
  id        String     @id @default(uuid())
  tenantId  String
  type      PolicyType
  config    Json
  enabled   Boolean    @default(true)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  tenant    Tenant     @relation(fields: [tenantId], references: [id])

  @@unique([tenantId, type])
  @@index([tenantId])
}
```

---

## Auth Domain

### RefreshToken
```prisma
model RefreshToken {
  id        String    @id @default(uuid())
  tenantId  String
  userId    String
  token     String    @unique
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())
  ipAddress String?
  userAgent String?

  user      User      @relation(fields: [userId], references: [id])

  @@index([tenantId, userId])
  @@index([token])
}
```

### PasswordReset
```prisma
model PasswordReset {
  id        String    @id @default(uuid())
  tenantId  String
  userId    String
  token     String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  user      User      @relation(fields: [userId], references: [id])

  @@index([tenantId])
  @@index([token])
}
```

### SecurityAuditLog
```prisma
model SecurityAuditLog {
  id        String   @id @default(uuid())
  tenantId  String
  userId    String?
  action    String
  ipAddress String?
  userAgent String?
  metadata  Json?
  severity  SecuritySeverity @default(INFO)
  createdAt DateTime @default(now())

  user      User?    @relation(fields: [userId], references: [id])

  @@index([tenantId, action])
  @@index([tenantId, userId])
  @@index([createdAt])
}
```

---

## Billing Domain

### Invoice
```prisma
model Invoice {
  id          String        @id @default(uuid())
  tenantId    String
  number      String
  status      InvoiceStatus @default(DRAFT)
  amount      Decimal       @db.Decimal(10, 2)
  currency    String        @default("USD")
  taxAmount   Decimal?      @db.Decimal(10, 2)
  dueDate     DateTime
  paidAt      DateTime?
  description String?
  metadata    Json?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  deletedAt   DateTime?

  tenant      Tenant        @relation(fields: [tenantId], references: [id])
  payments    Payment[]
  items       InvoiceItem[]

  @@unique([tenantId, number])
  @@index([tenantId, status])
  @@index([tenantId, dueDate])
}
```

### InvoiceItem
```prisma
model InvoiceItem {
  id          String  @id @default(uuid())
  invoiceId   String
  description String
  quantity    Int     @default(1)
  unitPrice   Decimal @db.Decimal(10, 2)
  totalPrice  Decimal @db.Decimal(10, 2)

  invoice     Invoice @relation(fields: [invoiceId], references: [id])

  @@index([invoiceId])
}
```

### Order
```prisma
model Order {
  id        String      @id @default(uuid())
  tenantId  String
  number    String
  status    OrderStatus @default(PENDING)
  total     Decimal     @db.Decimal(10, 2)
  currency  String      @default("USD")
  items     Json
  metadata  Json?
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
  deletedAt DateTime?

  tenant    Tenant      @relation(fields: [tenantId], references: [id])

  @@unique([tenantId, number])
  @@index([tenantId, status])
}
```

### Subscription
```prisma
model Subscription {
  id                 String             @id @default(uuid())
  tenantId           String
  planId             String
  status             SubscriptionStatus @default(ACTIVE)
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  canceledAt         DateTime?
  externalId         String?            @unique
  gateway            PaymentGateway?
  metadata           Json?
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt
  deletedAt          DateTime?

  tenant             Tenant             @relation(fields: [tenantId], references: [id])
  plan               Plan               @relation(fields: [planId], references: [id])

  @@index([tenantId])
  @@index([externalId])
}
```

### Plan
```prisma
model Plan {
  id            String   @id @default(uuid())
  name          String   @unique
  displayName   String
  price         Decimal  @db.Decimal(10, 2)
  currency      String   @default("USD")
  interval      PlanInterval @default(MONTHLY)
  features      Json
  limits        Json
  isActive      Boolean  @default(true)
  sortOrder     Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  subscriptions Subscription[]
}
```

### Product
```prisma
model Product {
  id          String   @id @default(uuid())
  tenantId    String
  name        String
  description String?
  price       Decimal  @db.Decimal(10, 2)
  currency    String   @default("USD")
  sku         String?
  imageUrl    String?
  isActive    Boolean  @default(true)
  metadata    Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant      Tenant   @relation(fields: [tenantId], references: [id])

  @@unique([tenantId, sku])
  @@index([tenantId])
}
```

### Payment
```prisma
model Payment {
  id          String         @id @default(uuid())
  tenantId    String
  invoiceId   String?
  amount      Decimal        @db.Decimal(10, 2)
  currency    String         @default("USD")
  method      PaymentMethod
  status      PaymentStatus  @default(PENDING)
  gateway     PaymentGateway
  externalId  String?
  metadata    Json?
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  invoice     Invoice?       @relation(fields: [invoiceId], references: [id])

  @@index([tenantId])
  @@index([externalId])
}
```

---

## Features Domain

### Space
```prisma
model Space {
  id          String   @id @default(uuid())
  tenantId    String
  name        String
  description String?
  settings    Json?    @default("{}")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  projects    Project[]

  @@index([tenantId])
}
```

### Project
```prisma
model Project {
  id          String        @id @default(uuid())
  tenantId    String
  spaceId     String?
  name        String
  description String?
  status      ProjectStatus @default(ACTIVE)
  settings    Json?         @default("{}")
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  tenant      Tenant        @relation(fields: [tenantId], references: [id])
  space       Space?        @relation(fields: [spaceId], references: [id])
  tasks       Task[]

  @@index([tenantId])
  @@index([tenantId, spaceId])
}
```

### Task
```prisma
model Task {
  id          String     @id @default(uuid())
  tenantId    String
  projectId   String
  title       String
  description String?
  status      TaskStatus @default(TODO)
  priority    TaskPriority @default(MEDIUM)
  assigneeId  String?
  dueDate     DateTime?
  completedAt DateTime?
  metadata    Json?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  tenant      Tenant     @relation(fields: [tenantId], references: [id])
  project     Project    @relation(fields: [projectId], references: [id])
  assignee    User?      @relation("TaskAssignee", fields: [assigneeId], references: [id])

  @@index([tenantId, projectId])
  @@index([tenantId, assigneeId])
  @@index([tenantId, status])
}
```

### Feature
```prisma
model Feature {
  id          String   @id @default(uuid())
  tenantId    String?
  code        String
  name        String
  description String?
  enabled     Boolean  @default(true)
  config      Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant      Tenant?  @relation(fields: [tenantId], references: [id])

  @@unique([tenantId, code])
  @@index([code])
}
```

### UsageTracking
```prisma
model UsageTracking {
  id           String   @id @default(uuid())
  tenantId     String
  feature      String
  currentUsage Int      @default(0)
  limit        Int
  period       String
  periodStart  DateTime
  periodEnd    DateTime
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  tenant       Tenant   @relation(fields: [tenantId], references: [id])

  @@unique([tenantId, feature, period])
  @@index([tenantId, feature])
}
```

---

## System Domain

### AuditLog
```prisma
model AuditLog {
  id        String   @id @default(uuid())
  tenantId  String
  userId    String?
  entity    String
  entityId  String
  action    AuditAction
  before    Json?
  after     Json?
  metadata  Json?
  ipAddress String?
  timestamp DateTime @default(now())

  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  user      User?    @relation(fields: [userId], references: [id])

  @@index([tenantId, entity, entityId])
  @@index([tenantId, userId])
  @@index([timestamp])
}
```

### UserPreference
```prisma
model UserPreference {
  id       String @id @default(uuid())
  tenantId String
  userId   String
  key      String
  value    Json

  user     User   @relation(fields: [userId], references: [id])

  @@unique([tenantId, userId, key])
  @@index([tenantId, userId])
}
```

### Notification
```prisma
model Notification {
  id        String           @id @default(uuid())
  tenantId  String
  userId    String
  type      NotificationType
  title     String
  body      String?
  data      Json?
  readAt    DateTime?
  createdAt DateTime         @default(now())

  user      User             @relation(fields: [userId], references: [id])

  @@index([tenantId, userId])
  @@index([tenantId, userId, readAt])
}
```

---

## Enums (28 total)

```prisma
enum PlanType { STARTER, COMPLETE, PRO, ENTERPRISE }
enum TenantStatus { ACTIVE, SUSPENDED, TRIAL, CANCELLED }
enum UserRole { SUPER_ADMIN, TENANT_ADMIN, USER }
enum CapabilityType { BOOLEAN, NUMERIC }
enum PolicyType { MFA_ENFORCEMENT, IP_WHITELIST, TIME_RESTRICTION, PASSWORD_POLICY, SESSION_POLICY }
enum InvoiceStatus { DRAFT, SENT, PAID, OVERDUE, CANCELLED, REFUNDED }
enum OrderStatus { PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED, REFUNDED }
enum SubscriptionStatus { ACTIVE, PAST_DUE, CANCELLED, PAUSED, TRIALING, EXPIRED }
enum PlanInterval { MONTHLY, YEARLY, LIFETIME }
enum PaymentMethod { CREDIT_CARD, DEBIT_CARD, PIX, BANK_TRANSFER, CRYPTO, PAYPAL }
enum PaymentStatus { PENDING, PROCESSING, COMPLETED, FAILED, REFUNDED, CANCELLED }
enum PaymentGateway { STRIPE, PADDLE, PAGUEBIT }
enum ProjectStatus { ACTIVE, ARCHIVED, COMPLETED }
enum TaskStatus { TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELLED }
enum TaskPriority { LOW, MEDIUM, HIGH, URGENT }
enum AuditAction { CREATE, UPDATE, DELETE, RESTORE, LOGIN, LOGOUT, EXPORT, IMPORT }
enum NotificationType { INFO, WARNING, ERROR, SUCCESS, SYSTEM }
enum SecuritySeverity { INFO, WARNING, CRITICAL }
```

> Note: Additional enums may exist in `schema.extended.prisma` for module-specific features.
