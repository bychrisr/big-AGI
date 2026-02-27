---
task: addService()
responsavel: "@kaven-api-dev"
responsavel_type: agent
atomic_layer: task
Entrada:
  - service_name: string
  - module_name: string
  - methods: list # [{ name: string, params: list, returns: string }]
Saida:
  - service_file: file
  - service_types: file
  - service_tests: file
Checklist:
  - [ ] Create service file in module directory
  - [ ] Inject Prisma with RLS context
  - [ ] Implement CRUD methods with proper typing
  - [ ] Add comprehensive error handling
  - [ ] Add structured logging
  - [ ] Export singleton instance
  - [ ] Add TypeScript types for inputs and outputs
  - [ ] Handle soft-delete in queries
---

# addService()

Create a new service class following Kaven patterns, with Prisma RLS injection, structured error handling, and multi-tenant awareness.

## Usage

```
@kaven-api-dev *task addService --name "InvoiceService" --module "billing" --methods '[{"name": "create", "params": ["data: CreateInvoiceInput"], "returns": "Invoice"}, {"name": "findById", "params": ["id: string", "tenantId: string"], "returns": "Invoice"}]'
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `service_name` | string | yes | PascalCase name for the service class |
| `module_name` | string | yes | Module this service belongs to |
| `methods` | list | yes | Array of method definitions |

## Output Format

```
apps/api/src/modules/{module}/
  ├── {module}.service.ts    # Service implementation
  └── {module}.service.test.ts # Service tests (optional, delegate to @kaven-qa)
```

## Implementation Steps

### Step 1: Create the Service File

Create `apps/api/src/modules/{module}/{module}.service.ts`:

```typescript
import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';

// Type definitions
export interface CreateInvoiceInput {
  amount: number;
  currency: string;
  description: string;
  dueDate: Date;
  tenantId: string;
}

export interface UpdateInvoiceInput {
  amount?: number;
  description?: string;
  dueDate?: Date;
}
```

### Step 2: Implement the Service Class

```typescript
export class InvoiceService {
  private prisma: PrismaClient;
  private logger: typeof logger;

  constructor(prismaClient: PrismaClient = prisma) {
    this.prisma = prismaClient;
    this.logger = logger.child({ service: 'InvoiceService' });
  }

  /**
   * Create a new invoice for a tenant.
   * tenantId is enforced via RLS middleware.
   */
  async create(data: CreateInvoiceInput): Promise<Invoice> {
    this.logger.info({ tenantId: data.tenantId }, 'Creating invoice');

    try {
      const invoice = await this.prisma.invoice.create({
        data: {
          amount: data.amount,
          currency: data.currency,
          description: data.description,
          dueDate: data.dueDate,
          tenantId: data.tenantId,
          status: 'draft',
        },
      });

      this.logger.info({ invoiceId: invoice.id }, 'Invoice created');
      return invoice;
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to create invoice');
      throw new AppError('Failed to create invoice', 500, { cause: error });
    }
  }

  /**
   * Find an invoice by ID, scoped to tenant.
   * RLS ensures tenantId filtering.
   */
  async findById(id: string, tenantId: string): Promise<Invoice> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    return invoice;
  }

  /**
   * List invoices for a tenant with pagination.
   */
  async findMany(
    tenantId: string,
    options: { page?: number; limit?: number; status?: string }
  ) {
    const { page = 1, limit = 20, status } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {
      tenantId,
      ...(status && { status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update an invoice. Only draft invoices can be updated.
   */
  async update(id: string, tenantId: string, data: UpdateInvoiceInput): Promise<Invoice> {
    const existing = await this.findById(id, tenantId);

    if (existing.status !== 'draft') {
      throw new AppError('Only draft invoices can be updated', 422);
    }

    try {
      return await this.prisma.invoice.update({
        where: { id },
        data,
      });
    } catch (error) {
      this.logger.error({ err: error, invoiceId: id }, 'Failed to update invoice');
      throw new AppError('Failed to update invoice', 500, { cause: error });
    }
  }

  /**
   * Soft-delete an invoice.
   * prisma-soft-delete middleware handles setting deletedAt.
   */
  async delete(id: string, tenantId: string): Promise<void> {
    await this.findById(id, tenantId); // Verify ownership

    await this.prisma.invoice.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.logger.info({ invoiceId: id }, 'Invoice soft-deleted');
  }
}

// Singleton export
export const invoiceService = new InvoiceService();
```

### Step 3: Key Patterns to Follow

1. **Constructor injection** — Accept PrismaClient in constructor for testability.
2. **Singleton export** — Export a default instance for production use.
3. **Child logger** — Use `logger.child({ service: 'Name' })` for structured logs.
4. **tenantId everywhere** — Always include tenantId in queries even though RLS exists (defense in depth).
5. **AppError class** — Use the standard AppError with HTTP status codes.
6. **Soft delete** — Use `update({ deletedAt: new Date() })` instead of `delete()`.
7. **Pagination pattern** — Return `{ items, pagination }` for list endpoints.

### Step 4: Error Handling Pattern

```typescript
// Standard error hierarchy
throw new AppError('Not found', 404);              // Client error
throw new AppError('Validation failed', 422, { fields: errors }); // Validation
throw new AppError('Internal error', 500, { cause: originalError }); // Server error
```

### Step 5: Testing Considerations

When handing off to `@kaven-qa` for tests:
- Provide a mockable constructor (PrismaClient injection).
- Document expected behavior for each method.
- List edge cases: empty results, duplicate creation, concurrent updates.
- Note which methods should be tested for tenant isolation.
