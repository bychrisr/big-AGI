---
task: addModel()
responsavel: "@kaven-db-engineer"
responsavel_type: agent
atomic_layer: task
Entrada:
  - model_name: string
  - fields: list # [{ name: string, type: string, optional: bool, default?: any }]
  - relations: list # [{ model: string, type: "1:1" | "1:N" | "N:N", field: string }]
Saida:
  - prisma_model: code_block
  - migration_file: file
  - updated_prisma_client: generated
Checklist:
  - [ ] Add model to schema.extended.prisma
  - [ ] Include tenantId field (String, required)
  - [ ] Include deletedAt field (DateTime?, nullable)
  - [ ] Include createdAt and updatedAt timestamps
  - [ ] Add composite indexes with tenantId (@@index)
  - [ ] Define relations with proper onDelete behavior
  - [ ] Run schema merge (base + extended)
  - [ ] Generate Prisma client
  - [ ] Create migration file
  - [ ] Verify migration is PostgreSQL-compatible
---

# addModel()

Add a new Prisma model to the Kaven database schema with mandatory multi-tenant isolation (tenantId), soft-delete support (deletedAt), and proper indexing.

## Usage

```
@kaven-db-engineer *task addModel --name "Invoice" --fields '[{"name": "amount", "type": "Float"}, {"name": "currency", "type": "String", "default": "USD"}, {"name": "status", "type": "InvoiceStatus"}, {"name": "dueDate", "type": "DateTime"}]' --relations '[{"model": "Tenant", "type": "1:N", "field": "tenantId"}, {"model": "Order", "type": "1:1", "field": "orderId"}]'
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model_name` | string | yes | PascalCase model name |
| `fields` | list | yes | Array of field definitions |
| `relations` | list | yes | Array of relation definitions |

## Output Format

```
prisma/
  ├── schema.extended.prisma  # Updated with new model
  └── migrations/
      └── YYYYMMDDHHMMSS_{description}/
          └── migration.sql
```

## Implementation Steps

### Step 1: Understand the Schema Split

Kaven splits Prisma schemas into two files:

- `prisma/schema.base.prisma` — Core models (User, Tenant, Role, Permission). **DO NOT EDIT.**
- `prisma/schema.extended.prisma` — Feature models added by modules. **EDIT THIS.**

A merge script combines them into `prisma/schema.prisma` for generation.

### Step 2: Define the Model

Add to `prisma/schema.extended.prisma`:

```prisma
// ============================================
// Invoice Model
// Module: billing
// Added: 2026-02-15
// ============================================

enum InvoiceStatus {
  DRAFT
  SENT
  PAID
  OVERDUE
  CANCELLED
}

model Invoice {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime? // Soft-delete support

  // Business fields
  amount      Float
  currency    String    @default("USD")
  status      InvoiceStatus @default(DRAFT)
  description String?
  dueDate     DateTime

  // Multi-tenant isolation (MANDATORY)
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  // Relations
  orderId String?  @unique
  order   Order?   @relation(fields: [orderId], references: [id], onDelete: SetNull)
  items   InvoiceItem[]

  // Indexes — always include tenantId first for RLS performance
  @@index([tenantId])
  @@index([tenantId, status])
  @@index([tenantId, createdAt])
  @@index([tenantId, dueDate])

  @@map("invoices") // PostgreSQL table name convention: lowercase plural
}
```

### Step 3: Mandatory Fields Checklist

Every Kaven model MUST include:

| Field | Type | Required | Purpose |
|-------|------|----------|---------|
| `id` | String @id @default(uuid()) | YES | Primary key |
| `createdAt` | DateTime @default(now()) | YES | Creation timestamp |
| `updatedAt` | DateTime @updatedAt | YES | Last update timestamp |
| `deletedAt` | DateTime? | YES | Soft-delete marker |
| `tenantId` | String | YES | Multi-tenant isolation |
| `tenant` | Relation to Tenant | YES | Foreign key to Tenant |

### Step 4: Indexing Strategy

1. **Always index `tenantId`** — Every query goes through RLS which filters by tenantId.
2. **Composite indexes** — Put `tenantId` first, then the filter/sort field.
3. **Unique constraints** — If a field is unique per-tenant, use `@@unique([tenantId, field])`.
4. **Performance** — Add indexes for fields used in WHERE, ORDER BY, and JOIN clauses.

```prisma
// Per-tenant unique constraint
@@unique([tenantId, invoiceNumber])

// Composite index for common queries
@@index([tenantId, status, createdAt])
```

### Step 5: Relation Guidelines

| Relation Type | Prisma Pattern | onDelete |
|---------------|---------------|----------|
| Required parent | `@relation(fields: [...], references: [id], onDelete: Cascade)` | Cascade |
| Optional parent | `@relation(fields: [...], references: [id], onDelete: SetNull)` | SetNull |
| Tenant relation | Always `onDelete: Cascade` | Cascade |
| Child collection | No explicit onDelete needed on the child side | — |

### Step 6: Run Schema Merge

```bash
# Merge base + extended schemas
pnpm run schema:merge

# This produces prisma/schema.prisma (the combined file)
```

### Step 7: Generate Prisma Client

```bash
# Generate TypeScript types
pnpm prisma generate
```

### Step 8: Create Migration

```bash
# Create migration (PostgreSQL)
pnpm prisma migrate dev --name add_invoice_model

# This creates:
# prisma/migrations/YYYYMMDDHHMMSS_add_invoice_model/migration.sql
```

### Step 9: Verify Migration SQL

Open the generated migration and verify:

1. Table name is lowercase plural (`invoices`, not `Invoice`).
2. `uuid_generate_v4()` or `gen_random_uuid()` for UUIDs (PostgreSQL, NOT MySQL).
3. No MySQL-specific syntax (no `UNSIGNED`, no `AUTO_INCREMENT`, no `ENGINE=InnoDB`).
4. Indexes use PostgreSQL syntax (`CREATE INDEX` not `KEY`).
5. Enums are created as PostgreSQL types (`CREATE TYPE "InvoiceStatus" AS ENUM`).

### Step 10: Update Tenant Model

If this is a new relation to Tenant, add the reverse relation in `schema.base.prisma` or `schema.extended.prisma`:

```prisma
// In the Tenant model
invoices Invoice[]
```

### Step 11: Test

1. Run `pnpm prisma migrate deploy` to apply.
2. Verify tables exist in PostgreSQL.
3. Test that RLS middleware correctly filters by tenantId.
4. Test that soft-delete middleware excludes deletedAt records.
