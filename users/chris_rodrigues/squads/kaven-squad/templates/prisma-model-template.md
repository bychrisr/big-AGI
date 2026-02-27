# Prisma Model Template — Kaven Framework

> Use this template when adding a new model to the Kaven database schema.

---

## File Location

All custom models go in `schema.extended.prisma`, which is merged with `schema.base.prisma` at build time.

```
packages/database/
├── schema.base.prisma       # Core models (User, Tenant, etc.) — DO NOT EDIT
├── schema.extended.prisma   # Your custom models — ADD HERE
├── prisma/
│   └── migrations/          # Auto-generated migrations
└── scripts/
    └── merge-schema.ts      # Merges base + extended into schema.prisma
```

---

## Base Model Pattern (Required Fields)

Every Kaven model MUST include these fields:

```prisma
model Item {
  id        String    @id @default(cuid())
  tenantId  String
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime? // Soft delete — NEVER use hard delete

  // --- Business fields ---
  name        String
  description String?
  status      ItemStatus @default(ACTIVE)

  // --- Relations ---
  tenant    Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdBy User?  @relation("ItemCreatedBy", fields: [createdById], references: [id])
  createdById String?

  // --- Indexes ---
  @@index([tenantId])
  @@index([tenantId, status])
  @@index([tenantId, createdAt])
  @@index([deletedAt]) // For soft-delete filter performance

  @@map("items") // Table name in PostgreSQL (lowercase plural)
}
```

---

## Enum Definition

```prisma
enum ItemStatus {
  ACTIVE
  INACTIVE
  ARCHIVED
}
```

Place enums at the top of `schema.extended.prisma`, before models.

---

## Relation Patterns

### One-to-Many (Parent has many children)

```prisma
model Project {
  id        String   @id @default(cuid())
  tenantId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?

  name  String
  tasks Task[]

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@map("projects")
}

model Task {
  id        String   @id @default(cuid())
  tenantId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?

  title     String
  projectId String
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([tenantId, projectId])
  @@map("tasks")
}
```

### Many-to-Many (Explicit join table)

```prisma
model Tag {
  id        String   @id @default(cuid())
  tenantId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?

  name  String
  items ItemTag[]

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, name]) // Unique tag name per tenant
  @@index([tenantId])
  @@map("tags")
}

model ItemTag {
  id        String   @id @default(cuid())
  tenantId  String
  createdAt DateTime @default(now())

  itemId String
  tagId  String
  item   Item @relation(fields: [itemId], references: [id], onDelete: Cascade)
  tag    Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([itemId, tagId]) // Prevent duplicate tag assignments
  @@index([tenantId])
  @@map("item_tags")
}
```

### Self-Referencing (Tree/Hierarchy)

```prisma
model Category {
  id        String   @id @default(cuid())
  tenantId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?

  name     String
  parentId String?
  parent   Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children Category[] @relation("CategoryTree")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([tenantId, parentId])
  @@map("categories")
}
```

---

## Registering the Relation in Tenant

After adding a new model, you MUST add the relation array to the Tenant model in `schema.base.prisma` (or via the merge script):

```prisma
model Tenant {
  // ... existing fields ...
  items      Item[]
  projects   Project[]
  tasks      Task[]
  tags       Tag[]
  categories Category[]
}
```

---

## Schema Merge and Migration

After modifying `schema.extended.prisma`, run:

```bash
# 1. Merge schemas
pnpm --filter @kaven/database merge-schema

# 2. Generate migration
pnpm --filter @kaven/database prisma migrate dev --name add_items_model

# 3. Generate Prisma Client
pnpm --filter @kaven/database prisma generate

# 4. Verify
pnpm --filter @kaven/database prisma validate
```

---

## Common Field Patterns

```prisma
// Money fields — use Int (cents) to avoid floating point
priceInCents  Int     @default(0)

// Slug for URL-friendly identifiers
slug          String
@@unique([tenantId, slug])

// JSON metadata
metadata      Json?   @default("{}")

// File reference
avatarUrl     String?
fileSize      Int?

// Ordering
sortOrder     Int     @default(0)

// Boolean flags
isPublished   Boolean @default(false)
isDefault     Boolean @default(false)
```

---

## Checklist Before Committing

- [ ] Model has `id`, `tenantId`, `createdAt`, `updatedAt`, `deletedAt`
- [ ] Relation to `Tenant` defined with `onDelete: Cascade`
- [ ] `@@index([tenantId])` exists
- [ ] `@@map("table_name")` uses lowercase plural
- [ ] Tenant model updated with new relation array
- [ ] Schema merges without errors
- [ ] Migration generated and tested
- [ ] Prisma Client regenerated
