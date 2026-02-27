---
task: auditSchema()
responsavel: "@kaven-db-engineer"
responsavel_type: agent
atomic_layer: task
Entrada:
  - scope: string # "full" | "model:{ModelName}" | "module:{moduleName}"
Saida:
  - audit_report: markdown
  - violations: list
  - recommendations: list
Checklist:
  - [ ] Verify all models have tenantId field
  - [ ] Verify all models have deletedAt field (soft-delete)
  - [ ] Verify all models have createdAt and updatedAt
  - [ ] Check composite indexes include tenantId first
  - [ ] Validate relations have proper onDelete behavior
  - [ ] Check enum usage and naming conventions
  - [ ] Verify schema.base vs schema.extended split is correct
  - [ ] Check for missing @@map directives
  - [ ] Validate no MySQL-specific syntax
  - [ ] Verify unique constraints are per-tenant where applicable
---

# auditSchema()

Audit the Kaven Prisma schema for compliance with multi-tenant patterns, soft-delete requirements, indexing strategy, and PostgreSQL compatibility.

## Usage

```
@kaven-db-engineer *task auditSchema --scope "full"
@kaven-db-engineer *task auditSchema --scope "model:Invoice"
@kaven-db-engineer *task auditSchema --scope "module:billing"
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `scope` | string | yes | "full", "model:{Name}", or "module:{name}" |

## Output Format

```markdown
# Schema Audit Report
## Audit Date: YYYY-MM-DD
## Scope: {scope}

## Summary
- Models audited: N
- Violations found: N
- Recommendations: N

## Findings
### CRITICAL
### HIGH
### MEDIUM
### LOW

## Model-by-Model Analysis
### {ModelName}
- tenantId: PASS/FAIL
- deletedAt: PASS/FAIL
- indexes: PASS/FAIL
- relations: PASS/FAIL
```

## Implementation Steps

### Step 1: Load the Schema

Read both schema files:

```
prisma/schema.base.prisma    # Core models
prisma/schema.extended.prisma # Feature models
prisma/schema.prisma          # Merged (generated)
```

Use the merged `schema.prisma` as the source of truth for the audit.

### Step 2: Audit Each Model for Required Fields

For every model in the schema, check:

| Field | Required | Rule | Severity if Missing |
|-------|----------|------|---------------------|
| `id` | YES | `@id @default(uuid())` | CRITICAL |
| `createdAt` | YES | `DateTime @default(now())` | HIGH |
| `updatedAt` | YES | `DateTime @updatedAt` | HIGH |
| `deletedAt` | YES | `DateTime?` (nullable) | CRITICAL |
| `tenantId` | YES* | `String` with relation to Tenant | CRITICAL |

*Exception: The `Tenant` model itself and truly global models (e.g., `SystemConfig`) do not need `tenantId`.

### Step 3: Audit Indexes

For every model with `tenantId`:

1. **Must have** `@@index([tenantId])` — base index for RLS queries.
2. **Should have** composite indexes for common query patterns: `@@index([tenantId, status])`, `@@index([tenantId, createdAt])`.
3. **Unique per-tenant** — If a field is unique per tenant, use `@@unique([tenantId, field])` not just `@unique`.

Violation examples:
```prisma
// VIOLATION: Index without tenantId
@@index([status])  // Should be @@index([tenantId, status])

// VIOLATION: Unique constraint not scoped to tenant
email String @unique  // Should be @@unique([tenantId, email]) if per-tenant
```

### Step 4: Audit Relations

Check every relation for:

1. **onDelete behavior** — Cascade for parent-child, SetNull for optional references.
2. **Bidirectional declaration** — Both sides of the relation are declared.
3. **Tenant consistency** — Related models should belong to the same tenant (no cross-tenant FK).

```prisma
// CORRECT: Explicit onDelete
tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

// VIOLATION: Missing onDelete (defaults to Restrict)
tenant Tenant @relation(fields: [tenantId], references: [id])
```

### Step 5: Audit Enums

1. Check enum naming: PascalCase (e.g., `InvoiceStatus`, not `invoice_status`).
2. Check enum values: UPPER_SNAKE_CASE (e.g., `DRAFT`, `IN_PROGRESS`).
3. Verify enums are used (no orphan enums).
4. Check for duplicate enum values across different enums.

### Step 6: Audit @@map Directives

Every model should have a `@@map` directive for PostgreSQL table naming:

```prisma
// CORRECT
model Invoice {
  // ...
  @@map("invoices") // lowercase plural
}

// VIOLATION: Missing @@map (Prisma uses PascalCase table name)
model Invoice {
  // ... no @@map
}
```

### Step 7: Check schema.base vs schema.extended Split

Rules for the split:
- `schema.base.prisma`: User, Tenant, Role, Permission, Session, Grant — core auth/multi-tenant models.
- `schema.extended.prisma`: Everything else (billing, spaces, content, etc.).
- No model should appear in both files.
- Relations between base and extended models are declared in extended.

### Step 8: PostgreSQL Compatibility Check

Scan for MySQL-specific syntax that may have leaked in:

| MySQL Syntax | PostgreSQL Equivalent | Severity |
|---|---|---|
| `@db.UnsignedInt` | Not needed | MEDIUM |
| `AUTO_INCREMENT` | `@default(autoincrement())` | HIGH |
| `ENGINE=InnoDB` | Not applicable | LOW |
| `TINYINT(1)` | `Boolean` | MEDIUM |
| `LONGTEXT` | `Text` | LOW |

### Step 9: Generate Report

Compile all findings into the report format. Categorize by severity:

- **CRITICAL**: Missing tenantId, missing soft-delete, cross-tenant data leak risk.
- **HIGH**: Missing indexes, missing onDelete, missing timestamps.
- **MEDIUM**: Naming convention violations, missing @@map, enum issues.
- **LOW**: Documentation gaps, optimization opportunities.

### Step 10: Save and Notify

1. Save report to `docs/database/audits/SCHEMA-AUDIT-{date}.md`.
2. Create stories for CRITICAL and HIGH findings.
3. Notify `@kaven-architect` of architectural concerns.
