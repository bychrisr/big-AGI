---
task: addEndpoint()
responsavel: "@kaven-api-dev"
responsavel_type: agent
atomic_layer: task
Entrada:
  - endpoint_path: string
  - http_method: string # GET | POST | PUT | PATCH | DELETE
  - module_name: string
  - auth_requirements: object # { authenticated: bool, roles: list, feature_flag: string? }
Saida:
  - route_file: file
  - controller_file: file
  - service_methods: file
  - zod_schema: file
  - swagger_docs: object
Checklist:
  - [ ] Create Zod validation schema
  - [ ] Implement controller function
  - [ ] Implement service method
  - [ ] Register route with auth middleware
  - [ ] Add RBAC check (requireRole)
  - [ ] Add feature guard if needed (requireFeature)
  - [ ] Add IDOR protection
  - [ ] Add to Swagger/OpenAPI docs
  - [ ] Add error handling with proper HTTP codes
  - [ ] Add request/response logging
---

# addEndpoint()

Add a new Fastify endpoint to the Kaven API following the established patterns: Fastify plugin registration, 10-layer middleware chain, Zod validation, and Prisma with RLS.

## Usage

```
@kaven-api-dev *task addEndpoint --path "/api/v1/invoices/:id/export" --method "GET" --module "billing" --auth '{"authenticated": true, "roles": ["admin", "member"], "feature_flag": "invoice_export"}'
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `endpoint_path` | string | yes | Full API path (e.g., `/api/v1/invoices/:id`) |
| `http_method` | string | yes | HTTP method: GET, POST, PUT, PATCH, DELETE |
| `module_name` | string | yes | Module this endpoint belongs to |
| `auth_requirements` | object | yes | Auth config: authenticated, roles, feature_flag |

## Output Format

Files created:
```
apps/api/src/modules/{module}/
  ├── {module}.route.ts      # Route registration (updated)
  ├── {module}.controller.ts # Controller function (updated)
  ├── {module}.service.ts    # Service method (updated)
  └── {module}.schema.ts     # Zod schemas (updated)
```

## Implementation Steps

### Step 1: Define the Zod Validation Schema

Create or update `{module}.schema.ts`:

```typescript
import { z } from 'zod';

// Request params schema
export const exportInvoiceParamsSchema = z.object({
  id: z.string().uuid('Invalid invoice ID format'),
});

// Request query schema (if needed)
export const exportInvoiceQuerySchema = z.object({
  format: z.enum(['pdf', 'csv']).default('pdf'),
});

// Request body schema (for POST/PUT/PATCH)
export const createInvoiceBodySchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3),
  description: z.string().trim().min(1).max(500),
  dueDate: z.string().datetime(),
});

// Response schema (for Swagger docs)
export const invoiceResponseSchema = z.object({
  id: z.string().uuid(),
  amount: z.number(),
  status: z.enum(['draft', 'sent', 'paid', 'overdue']),
  createdAt: z.string().datetime(),
});
```

### Step 2: Implement the Controller

Update `{module}.controller.ts`:

```typescript
import type { FastifyRequest, FastifyReply } from 'fastify';
import { ExportInvoiceParams, ExportInvoiceQuery } from './{module}.schema';
import { invoiceService } from './{module}.service';

export async function exportInvoiceController(
  request: FastifyRequest<{
    Params: ExportInvoiceParams;
    Querystring: ExportInvoiceQuery;
  }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const { format } = request.query;
  const tenantId = request.tenantId; // Injected by tenant resolution middleware

  try {
    const result = await invoiceService.exportInvoice(id, tenantId, format);
    return reply.code(200).send(result);
  } catch (error) {
    request.log.error({ err: error, invoiceId: id }, 'Failed to export invoice');
    throw error; // Let Fastify error handler process it
  }
}
```

### Step 3: Implement the Service Method

Update `{module}.service.ts`:

```typescript
import { prisma } from '@/lib/prisma'; // RLS-enabled client

export class InvoiceService {
  async exportInvoice(id: string, tenantId: string, format: 'pdf' | 'csv') {
    // RLS middleware automatically scopes to tenantId
    const invoice = await prisma.invoice.findUniqueOrThrow({
      where: { id, tenantId },
      include: { items: true, tenant: true },
    });

    if (format === 'pdf') {
      return this.generatePDF(invoice);
    }
    return this.generateCSV(invoice);
  }
}

export const invoiceService = new InvoiceService();
```

### Step 4: Register the Route

Update `{module}.route.ts` as a Fastify plugin:

```typescript
import type { FastifyInstance } from 'fastify';
import { exportInvoiceController } from './{module}.controller';
import { exportInvoiceParamsSchema, exportInvoiceQuerySchema } from './{module}.schema';
import { requireAuth } from '@/middleware/auth';
import { requireRole } from '@/middleware/rbac';
import { requireFeature } from '@/middleware/feature-guard';
import { verifyResourceOwnership } from '@/middleware/idor-protection';

export async function invoiceRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/invoices/:id/export',
    {
      preHandler: [
        requireAuth(),
        requireRole(['admin', 'member']),
        requireFeature('invoice_export'),
        verifyResourceOwnership('invoice'),
      ],
      schema: {
        params: exportInvoiceParamsSchema,
        querystring: exportInvoiceQuerySchema,
        tags: ['Invoices'],
        summary: 'Export an invoice as PDF or CSV',
        response: {
          200: { description: 'Invoice exported successfully' },
          404: { description: 'Invoice not found' },
        },
      },
    },
    exportInvoiceController
  );
}
```

### Step 5: Apply the Full Middleware Chain

Ensure the route is protected by all 10 layers:

1. **Rate Limiting** — Applied globally or per-route via `fastify-rate-limit`.
2. **CORS** — Configured in `app.ts` for allowed origins.
3. **Authentication** — `requireAuth()` validates JWT token.
4. **Tenant Resolution** — Extracts `tenantId` from token and injects into request.
5. **RBAC** — `requireRole(['admin', 'member'])` checks role permissions.
6. **Feature Guard** — `requireFeature('invoice_export')` checks plan tier.
7. **IDOR Protection** — `verifyResourceOwnership('invoice')` prevents cross-tenant access.
8. **Input Validation** — Zod schemas in `schema` option validate params/body/query.
9. **Audit Logging** — Hook in `onResponse` logs the action.
10. **CSRF Protection** — Applied on state-changing methods (POST/PUT/PATCH/DELETE).

### Step 6: Register the Module Plugin

In the module's index or in `app.ts`, register the route plugin:

```typescript
fastify.register(invoiceRoutes, { prefix: '/api/v1' });
```

### Step 7: Add Swagger Documentation

The Zod schemas are auto-converted to OpenAPI schemas by `fastify-zod`. Verify by visiting `/documentation` in dev mode.

### Step 8: Test the Endpoint

1. Write a basic request test using Vitest + Supertest.
2. Test with valid auth token and correct tenant.
3. Test with missing auth (expect 401).
4. Test with wrong role (expect 403).
5. Test with another tenant's resource ID (expect 404 — IDOR protection).
6. Test with invalid params (expect 400 — Zod validation).
