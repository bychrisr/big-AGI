# Zod Schema Template — Kaven Framework

> Use this template when creating Zod validation schemas for API routes and shared types.

---

## File Location

```
# API-specific schemas (route validation)
apps/api/src/modules/{module-name}/{module-name}.schema.ts

# Shared schemas (used by both API and frontend)
packages/shared/src/schemas/{module-name}.schema.ts
```

---

## Complete Schema File

```typescript
// apps/api/src/modules/items/items.schema.ts
import { z } from 'zod';

// ─────────────────────────────────────────────────────────
// Shared / Reusable Schemas
// ─────────────────────────────────────────────────────────

/** Standard pagination query parameters */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** Standard sort parameters */
export const sortSchema = z.object({
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/** Standard search parameter */
export const searchSchema = z.object({
  search: z.string().max(255).optional(),
});

/** Date range filter */
export const dateRangeSchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
}).refine(
  (data) => {
    if (data.dateFrom && data.dateTo) {
      return data.dateFrom <= data.dateTo;
    }
    return true;
  },
  { message: 'dateFrom must be before or equal to dateTo' }
);

/** Standard ID parameter */
export const idParamSchema = z.object({
  id: z.string().cuid(),
});

/** Tenant-scoped ID (used internally, not exposed to routes) */
export const tenantIdSchema = z.object({
  tenantId: z.string().cuid(),
});

// ─────────────────────────────────────────────────────────
// Create Schema (POST body)
// ─────────────────────────────────────────────────────────

export const createItemSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be 255 characters or less')
    .trim(),
  description: z
    .string()
    .max(2000, 'Description must be 2000 characters or less')
    .trim()
    .optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  email: z.string().email('Invalid email address').toLowerCase().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string().cuid()).max(20, 'Maximum 20 tags allowed').optional(),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;

// ─────────────────────────────────────────────────────────
// Update Schema (PUT body — partial of Create)
// ─────────────────────────────────────────────────────────

export const updateItemSchema = createItemSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

export type UpdateItemInput = z.infer<typeof updateItemSchema>;

// ─────────────────────────────────────────────────────────
// Query / Filter Schema (GET querystring)
// ─────────────────────────────────────────────────────────

export const listItemsQuerySchema = paginationSchema
  .merge(sortSchema)
  .merge(searchSchema)
  .extend({
    status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
    createdById: z.string().cuid().optional(),
  });

export type ListItemsQuery = z.infer<typeof listItemsQuerySchema>;

// ─────────────────────────────────────────────────────────
// Params Schema (URL parameters)
// ─────────────────────────────────────────────────────────

export const getItemParamsSchema = idParamSchema;

export type GetItemParams = z.infer<typeof getItemParamsSchema>;

// ─────────────────────────────────────────────────────────
// Response Schemas (for Swagger documentation)
// ─────────────────────────────────────────────────────────

export const itemResponseSchema = z.object({
  id: z.string().cuid(),
  tenantId: z.string().cuid(),
  name: z.string(),
  description: z.string().nullable(),
  slug: z.string().nullable(),
  email: z.string().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']),
  metadata: z.record(z.unknown()).nullable(),
  createdById: z.string().cuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ItemResponse = z.infer<typeof itemResponseSchema>;

export const paginationMetaSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export const itemListResponseSchema = z.object({
  data: z.array(itemResponseSchema),
  meta: paginationMetaSchema,
});

export type ItemListResponse = z.infer<typeof itemListResponseSchema>;

// ─────────────────────────────────────────────────────────
// Batch Operations Schema
// ─────────────────────────────────────────────────────────

export const batchDeleteSchema = z.object({
  ids: z
    .array(z.string().cuid())
    .min(1, 'At least one ID required')
    .max(100, 'Maximum 100 items per batch'),
});

export const batchUpdateSchema = z.object({
  ids: z
    .array(z.string().cuid())
    .min(1, 'At least one ID required')
    .max(100, 'Maximum 100 items per batch'),
  data: updateItemSchema,
});
```

---

## Fastify Schema Integration

```typescript
// In route definition — schemas map directly to Fastify's schema object
app.post(
  '/',
  {
    schema: {
      tags: ['Items'],
      summary: 'Create a new item',
      body: createItemSchema,          // Zod schema for request body
      response: {
        201: itemResponseSchema,       // Zod schema for success response
      },
      security: [{ bearerAuth: [] }],
    },
  },
  controller.createItem
);
```

The `fastify-type-provider-zod` plugin automatically:
1. Validates request body/querystring/params against the Zod schema.
2. Returns 400 with structured errors if validation fails.
3. Generates OpenAPI/Swagger documentation from the schema.

---

## Shared Schemas Pattern (@kaven/shared)

```typescript
// packages/shared/src/schemas/items.schema.ts
// Schemas used by BOTH API and frontend (form validation)
import { z } from 'zod';

export const itemFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(2000).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export type ItemFormValues = z.infer<typeof itemFormSchema>;
```

```typescript
// Frontend usage (react-hook-form)
import { itemFormSchema, type ItemFormValues } from '@kaven/shared/schemas/items';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const form = useForm<ItemFormValues>({
  resolver: zodResolver(itemFormSchema),
});
```

---

## Common Zod Patterns

```typescript
// Email (lowercase, trimmed)
z.string().email().toLowerCase().trim()

// Slug
z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)

// CUID ID
z.string().cuid()

// UUID
z.string().uuid()

// Money in cents
z.number().int().min(0)

// URL
z.string().url()

// Phone (basic)
z.string().regex(/^\+?[1-9]\d{1,14}$/)

// Boolean from query string
z.coerce.boolean()

// Number from query string
z.coerce.number().int().min(0)

// Date from string
z.coerce.date()

// Optional with default
z.string().default('default-value')

// Enum from Prisma
z.nativeEnum(ItemStatus)

// JSON object
z.record(z.unknown())

// File upload metadata
z.object({
  filename: z.string(),
  mimetype: z.string().regex(/^image\/(png|jpeg|gif|webp)$/),
  size: z.number().max(5 * 1024 * 1024, 'Max file size is 5MB'),
})

// Conditional validation
z.object({
  type: z.enum(['email', 'sms']),
  email: z.string().email().optional(),
  phone: z.string().optional(),
}).refine(
  (data) => {
    if (data.type === 'email') return !!data.email;
    if (data.type === 'sms') return !!data.phone;
    return true;
  },
  { message: 'Provide email for email type or phone for sms type' }
)
```

---

## Notes

- Always use `z.coerce` for querystring parameters (they arrive as strings from HTTP).
- Shared schemas in `@kaven/shared` ensure frontend and backend validate identically.
- Response schemas drive Swagger docs; keep them accurate and up-to-date.
- Use `.trim()` on string inputs to prevent whitespace-only values.
- Prefer `.cuid()` over `.uuid()` to match Prisma's default ID generation.
- Use `z.nativeEnum()` when you need to validate against a Prisma-generated TypeScript enum.
