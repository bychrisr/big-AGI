---
task: addTest()
responsavel: "@kaven-qa"
responsavel_type: agent
atomic_layer: task
Entrada:
  - test_type: string # "unit" | "security" | "gdpr" | "multi-tenant" | "integration"
  - target_module: string
  - target_function: string # optional: specific function/endpoint to test
Saida:
  - test_file: file
  - test_helpers: file # if new helpers needed
Checklist:
  - [ ] Create test file in correct directory
  - [ ] Follow existing test patterns in the codebase
  - [ ] Include proper setup and teardown
  - [ ] Test happy path (success case)
  - [ ] Test error cases (invalid input, not found, unauthorized)
  - [ ] Test multi-tenant isolation if applicable
  - [ ] Test edge cases (empty data, boundary values, concurrent access)
  - [ ] Use descriptive test names
  - [ ] Mock external dependencies appropriately
---

# addTest()

Create a new Vitest test file following Kaven's testing patterns, with proper setup/teardown, multi-tenant awareness, and comprehensive case coverage.

## Usage

```
@kaven-qa *task addTest --type "unit" --module "billing" --function "InvoiceService.create"
@kaven-qa *task addTest --type "security" --module "billing"
@kaven-qa *task addTest --type "multi-tenant" --module "billing"
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `test_type` | string | yes | "unit", "security", "gdpr", "multi-tenant", "integration" |
| `target_module` | string | yes | Module being tested |
| `target_function` | string | no | Specific function or endpoint |

## Output Format

```
# Test file location by type:
apps/api/src/__tests__/
  ├── unit/{module}/              # Unit tests
  ├── security/{category}/        # Security tests
  ├── gdpr/{category}/            # GDPR compliance tests
  ├── multi-tenant/               # Multi-tenant isolation tests
  └── integration/{module}/       # Integration tests
```

## Implementation Steps

### Step 1: Determine Test Location and Naming

| Type | Directory | Naming Pattern |
|------|-----------|---------------|
| unit | `__tests__/unit/{module}/` | `{module}.service.test.ts` |
| security | `__tests__/security/{category}/` | `{module}-{category}.test.ts` |
| gdpr | `__tests__/gdpr/{category}/` | `{category}-{module}.test.ts` |
| multi-tenant | `__tests__/multi-tenant/` | `{module}-isolation.test.ts` |
| integration | `__tests__/integration/{module}/` | `{module}.integration.test.ts` |

### Step 2: Setup Test Structure (Unit Test)

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { InvoiceService } from '@/modules/billing/billing.service';
import { createTestTenant, createTestUser, cleanupTestData } from '@/__tests__/helpers';

describe('InvoiceService', () => {
  let prisma: PrismaClient;
  let service: InvoiceService;
  let tenantA: { id: string };
  let tenantB: { id: string };
  let userA: { id: string; tenantId: string };

  beforeAll(async () => {
    prisma = new PrismaClient();
    service = new InvoiceService(prisma);

    // Create isolated test tenants
    tenantA = await createTestTenant(prisma, 'Tenant A');
    tenantB = await createTestTenant(prisma, 'Tenant B');
    userA = await createTestUser(prisma, { tenantId: tenantA.id });
  });

  afterAll(async () => {
    await cleanupTestData(prisma, [tenantA.id, tenantB.id]);
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up module-specific data between tests
    await prisma.invoice.deleteMany({
      where: { tenantId: { in: [tenantA.id, tenantB.id] } },
    });
  });

  // Tests go here...
});
```

### Step 3: Write Happy Path Tests

```typescript
describe('create()', () => {
  it('should create an invoice for the tenant', async () => {
    const input = {
      amount: 100.50,
      currency: 'USD',
      description: 'Test Invoice',
      dueDate: new Date('2026-03-15'),
      tenantId: tenantA.id,
    };

    const invoice = await service.create(input);

    expect(invoice).toBeDefined();
    expect(invoice.id).toBeDefined();
    expect(invoice.amount).toBe(100.50);
    expect(invoice.currency).toBe('USD');
    expect(invoice.status).toBe('DRAFT');
    expect(invoice.tenantId).toBe(tenantA.id);
    expect(invoice.deletedAt).toBeNull();
  });
});
```

### Step 4: Write Error Case Tests

```typescript
describe('findById()', () => {
  it('should throw 404 when invoice does not exist', async () => {
    await expect(
      service.findById('non-existent-uuid', tenantA.id)
    ).rejects.toThrow('Invoice not found');
  });

  it('should throw 404 when invoice belongs to different tenant', async () => {
    // Create invoice for Tenant A
    const invoice = await service.create({
      amount: 50,
      currency: 'USD',
      description: 'Tenant A Invoice',
      dueDate: new Date(),
      tenantId: tenantA.id,
    });

    // Try to access from Tenant B (should fail — IDOR protection)
    await expect(
      service.findById(invoice.id, tenantB.id)
    ).rejects.toThrow('Invoice not found');
  });
});
```

### Step 5: Write Multi-Tenant Isolation Tests

```typescript
describe('multi-tenant isolation', () => {
  it('should not return invoices from other tenants in list', async () => {
    // Create invoices for both tenants
    await service.create({ amount: 100, tenantId: tenantA.id, /* ... */ });
    await service.create({ amount: 200, tenantId: tenantB.id, /* ... */ });

    // List for Tenant A should only show Tenant A's invoices
    const result = await service.findMany(tenantA.id, {});
    expect(result.items).toHaveLength(1);
    expect(result.items[0].amount).toBe(100);
    expect(result.items.every(i => i.tenantId === tenantA.id)).toBe(true);
  });

  it('should not allow updating invoices from other tenants', async () => {
    const invoice = await service.create({ amount: 100, tenantId: tenantA.id, /* ... */ });

    await expect(
      service.update(invoice.id, tenantB.id, { amount: 999 })
    ).rejects.toThrow();
  });
});
```

### Step 6: Write Edge Case Tests

```typescript
describe('edge cases', () => {
  it('should handle zero amount', async () => {
    const invoice = await service.create({ amount: 0, tenantId: tenantA.id, /* ... */ });
    expect(invoice.amount).toBe(0);
  });

  it('should handle very large amounts', async () => {
    const invoice = await service.create({ amount: 999999999.99, tenantId: tenantA.id, /* ... */ });
    expect(invoice.amount).toBe(999999999.99);
  });

  it('should handle pagination with no results', async () => {
    const result = await service.findMany(tenantA.id, { page: 999 });
    expect(result.items).toHaveLength(0);
    expect(result.pagination.total).toBe(0);
  });

  it('should respect soft-delete', async () => {
    const invoice = await service.create({ amount: 50, tenantId: tenantA.id, /* ... */ });
    await service.delete(invoice.id, tenantA.id);

    const result = await service.findMany(tenantA.id, {});
    expect(result.items.find(i => i.id === invoice.id)).toBeUndefined();
  });
});
```

### Step 7: Test Naming Conventions

Use descriptive names that explain the scenario:

```typescript
// GOOD: Descriptive, explains intent
it('should return 404 when accessing invoice belonging to another tenant')
it('should create invoice with default status DRAFT when status not provided')
it('should not include soft-deleted invoices in list results')

// BAD: Vague, does not explain intent
it('should work')
it('test create')
it('handles error')
```

### Step 8: Run and Verify

```bash
# Run the specific test file
pnpm vitest run apps/api/src/__tests__/unit/billing/billing.service.test.ts

# Run with coverage
pnpm vitest run --coverage apps/api/src/__tests__/unit/billing/

# Run in watch mode during development
pnpm vitest watch apps/api/src/__tests__/unit/billing/
```
