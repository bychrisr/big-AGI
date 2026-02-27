---
task: addMigration()
responsavel: "@kaven-db-engineer"
responsavel_type: agent
atomic_layer: task
Entrada:
  - description: string
  - changes: list # list of SQL changes or schema modifications
Saida:
  - migration_file: file
  - rollback_plan: markdown
Checklist:
  - [ ] Write migration SQL (PostgreSQL syntax)
  - [ ] Validate PostgreSQL compatibility (NOT MySQL)
  - [ ] Test migration up (apply)
  - [ ] Plan migration down (rollback)
  - [ ] Verify no data loss for existing records
  - [ ] Run prisma migrate deploy
  - [ ] Verify schema sync with Prisma client
  - [ ] Test with existing seed data
---

# addMigration()

Create a safe PostgreSQL migration for the Kaven database, ensuring zero data loss, rollback capability, and compatibility with the multi-tenant architecture.

## Usage

```
@kaven-db-engineer *task addMigration --description "add_invoice_number_column" --changes '["ALTER TABLE invoices ADD COLUMN invoice_number VARCHAR(50)", "CREATE UNIQUE INDEX idx_invoices_tenant_number ON invoices(tenant_id, invoice_number)"]'
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `description` | string | yes | Snake_case description for the migration directory |
| `changes` | list | yes | List of SQL statements or schema modifications |

## Output Format

```
prisma/migrations/
  └── YYYYMMDDHHMMSS_{description}/
      └── migration.sql
```

## Implementation Steps

### Step 1: Determine Migration Type

| Type | Example | Risk Level | Approach |
|------|---------|-----------|----------|
| Add column (nullable) | `ADD COLUMN note TEXT` | LOW | Direct ALTER |
| Add column (NOT NULL) | `ADD COLUMN status VARCHAR NOT NULL` | MEDIUM | Add nullable first, backfill, then set NOT NULL |
| Drop column | `DROP COLUMN old_field` | HIGH | Verify no code references, add deprecation period |
| Add index | `CREATE INDEX ...` | LOW | Use `CONCURRENTLY` for large tables |
| Rename column | `RENAME COLUMN old TO new` | HIGH | Coordinate with code changes |
| Change type | `ALTER COLUMN ... TYPE ...` | HIGH | May require data conversion |
| Add table | `CREATE TABLE ...` | LOW | Direct CREATE |
| Drop table | `DROP TABLE ...` | CRITICAL | Backup first, verify no FK references |

### Step 2: Write PostgreSQL Migration

Create the migration SQL. Critical rules for Kaven:

```sql
-- CORRECT: PostgreSQL syntax
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE');

ALTER TABLE "invoices"
  ADD COLUMN "invoice_number" VARCHAR(50);

CREATE UNIQUE INDEX "idx_invoices_tenant_number"
  ON "invoices" ("tenant_id", "invoice_number");

-- WRONG: MySQL syntax (DO NOT USE)
-- ALTER TABLE invoices ADD COLUMN invoice_number VARCHAR(50) AFTER status;
-- CREATE INDEX idx USING BTREE ...
-- ENGINE=InnoDB;
```

### Step 3: Handle NOT NULL Additions Safely

If adding a NOT NULL column to an existing table with data:

```sql
-- Step 1: Add as nullable
ALTER TABLE "invoices" ADD COLUMN "invoice_number" VARCHAR(50);

-- Step 2: Backfill existing rows
UPDATE "invoices"
SET "invoice_number" = CONCAT('INV-', LPAD(CAST(ROW_NUMBER() OVER (PARTITION BY "tenant_id" ORDER BY "created_at") AS TEXT), 6, '0'))
WHERE "invoice_number" IS NULL;

-- Step 3: Set NOT NULL constraint
ALTER TABLE "invoices" ALTER COLUMN "invoice_number" SET NOT NULL;
```

### Step 4: Index Creation for Large Tables

For tables with more than 100k rows, use `CONCURRENTLY`:

```sql
-- Non-blocking index creation
CREATE INDEX CONCURRENTLY "idx_invoices_status"
  ON "invoices" ("tenant_id", "status");
```

Note: `CONCURRENTLY` cannot be used inside a transaction block. Prisma migrations run in transactions by default, so you may need to split this into a separate migration or use `prisma migrate diff`.

### Step 5: Always Include tenantId in Indexes

Every new index on a tenant-scoped table MUST include `tenant_id` as the first column:

```sql
-- CORRECT
CREATE INDEX "idx_invoices_status" ON "invoices" ("tenant_id", "status");

-- WRONG (missing tenant_id, RLS queries will be slow)
CREATE INDEX "idx_invoices_status" ON "invoices" ("status");
```

### Step 6: Create the Migration via Prisma

**Option A: Schema-driven (preferred)**
1. Modify `schema.extended.prisma`.
2. Run `pnpm run schema:merge`.
3. Run `pnpm prisma migrate dev --name {description}`.
4. Prisma auto-generates the SQL.

**Option B: Manual SQL**
1. Create directory: `prisma/migrations/YYYYMMDDHHMMSS_{description}/`.
2. Write `migration.sql` manually.
3. Run `pnpm prisma migrate resolve --applied YYYYMMDDHHMMSS_{description}`.

### Step 7: Test Migration

```bash
# Apply migration to dev database
pnpm prisma migrate dev

# Verify the migration
pnpm prisma db pull  # Should match schema

# Run seeds to test with data
pnpm prisma db seed

# Run the test suite
pnpm test
```

### Step 8: Document Rollback Plan

Every migration must have a documented rollback plan:

```sql
-- ROLLBACK: add_invoice_number_column
-- Run these statements to reverse the migration

DROP INDEX IF EXISTS "idx_invoices_tenant_number";
ALTER TABLE "invoices" DROP COLUMN IF EXISTS "invoice_number";
```

Store rollback plans in `docs/migrations/rollback/` for reference.

### Step 9: Verify Data Integrity

After applying:

1. Check that existing records are not corrupted.
2. Verify foreign key relationships still work.
3. Test that RLS middleware queries still perform correctly.
4. Run security tests to verify tenant isolation.

### Step 10: Migration Naming Convention

```
YYYYMMDDHHMMSS_description
```

Examples:
- `20260215120000_add_invoice_model`
- `20260215130000_add_invoice_number_column`
- `20260215140000_create_invoice_status_enum`
- `20260215150000_add_idx_invoices_tenant_status`
