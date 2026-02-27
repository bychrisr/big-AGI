# Fastify Route Template — Kaven Framework

> Use this template when creating new API routes in the Kaven backend (Fastify).

---

## File Location

```
apps/api/src/modules/{module-name}/
├── {module-name}.routes.ts    # Route definitions (this template)
├── {module-name}.controller.ts # Request handlers
├── {module-name}.service.ts    # Business logic
├── {module-name}.schema.ts     # Zod validation schemas
└── {module-name}.test.ts       # Route tests
```

---

## Route Plugin Pattern

```typescript
// apps/api/src/modules/{module-name}/{module-name}.routes.ts
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { authMiddleware } from '@/middleware/auth';
import { requireRole } from '@/middleware/require-role';
import { requireFeature } from '@/middleware/require-feature';
import { checkOwnership } from '@/middleware/check-ownership';
import {
  createItemSchema,
  updateItemSchema,
  getItemParamsSchema,
  listItemsQuerySchema,
  itemResponseSchema,
  itemListResponseSchema,
} from './{module-name}.schema';
import * as controller from './{module-name}.controller';

const itemRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // All routes in this plugin require authentication
  app.addHook('onRequest', authMiddleware);

  // GET /items — List with pagination, filtering, sorting
  app.get(
    '/',
    {
      schema: {
        tags: ['{ModuleName}'],
        summary: 'List items for current tenant',
        querystring: listItemsQuerySchema,
        response: { 200: itemListResponseSchema },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireRole(['ADMIN', 'MEMBER'])],
    },
    controller.listItems
  );

  // GET /items/:id — Get single item
  app.get(
    '/:id',
    {
      schema: {
        tags: ['{ModuleName}'],
        summary: 'Get item by ID',
        params: getItemParamsSchema,
        response: { 200: itemResponseSchema },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        requireRole(['ADMIN', 'MEMBER']),
        checkOwnership('Item', 'id'),
      ],
    },
    controller.getItem
  );

  // POST /items — Create new item
  app.post(
    '/',
    {
      schema: {
        tags: ['{ModuleName}'],
        summary: 'Create a new item',
        body: createItemSchema,
        response: { 201: itemResponseSchema },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        requireRole(['ADMIN']),
        requireFeature('items.create'),
      ],
    },
    controller.createItem
  );

  // PUT /items/:id — Update item
  app.put(
    '/:id',
    {
      schema: {
        tags: ['{ModuleName}'],
        summary: 'Update an existing item',
        params: getItemParamsSchema,
        body: updateItemSchema,
        response: { 200: itemResponseSchema },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        requireRole(['ADMIN']),
        checkOwnership('Item', 'id'),
      ],
    },
    controller.updateItem
  );

  // DELETE /items/:id — Soft delete
  app.delete(
    '/:id',
    {
      schema: {
        tags: ['{ModuleName}'],
        summary: 'Soft-delete an item',
        params: getItemParamsSchema,
        response: { 204: { type: 'null' } },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [
        requireRole(['ADMIN']),
        checkOwnership('Item', 'id'),
      ],
    },
    controller.deleteItem
  );
};

export default itemRoutes;
```

---

## Controller Pattern

```typescript
// apps/api/src/modules/{module-name}/{module-name}.controller.ts
import { FastifyReply, FastifyRequest } from 'fastify';
import * as service from './{module-name}.service';
import {
  CreateItemInput,
  UpdateItemInput,
  GetItemParams,
  ListItemsQuery,
} from './{module-name}.schema';

export async function listItems(
  request: FastifyRequest<{ Querystring: ListItemsQuery }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user;
  const result = await service.listItems(tenantId, request.query);
  return reply.status(200).send(result);
}

export async function getItem(
  request: FastifyRequest<{ Params: GetItemParams }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user;
  const item = await service.getItemById(tenantId, request.params.id);
  if (!item) {
    return reply.status(404).send({ message: 'Item not found' });
  }
  return reply.status(200).send(item);
}

export async function createItem(
  request: FastifyRequest<{ Body: CreateItemInput }>,
  reply: FastifyReply
) {
  const { tenantId, id: userId } = request.user;
  const item = await service.createItem(tenantId, userId, request.body);
  return reply.status(201).send(item);
}

export async function updateItem(
  request: FastifyRequest<{ Params: GetItemParams; Body: UpdateItemInput }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user;
  const item = await service.updateItem(tenantId, request.params.id, request.body);
  return reply.status(200).send(item);
}

export async function deleteItem(
  request: FastifyRequest<{ Params: GetItemParams }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user;
  await service.softDeleteItem(tenantId, request.params.id);
  return reply.status(204).send();
}
```

---

## Service Pattern (with RLS Context)

```typescript
// apps/api/src/modules/{module-name}/{module-name}.service.ts
import { withTenantContext } from '@/lib/prisma-rls';
import { ListItemsQuery, CreateItemInput, UpdateItemInput } from './{module-name}.schema';

export async function listItems(tenantId: string, query: ListItemsQuery) {
  const prisma = withTenantContext(tenantId);
  const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;

  const where = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.item.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.item.count({ where }),
  ]);

  return {
    data: items,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function getItemById(tenantId: string, id: string) {
  const prisma = withTenantContext(tenantId);
  return prisma.item.findUnique({ where: { id } });
}

export async function createItem(tenantId: string, userId: string, data: CreateItemInput) {
  const prisma = withTenantContext(tenantId);
  return prisma.item.create({
    data: { ...data, createdById: userId },
  });
}

export async function updateItem(tenantId: string, id: string, data: UpdateItemInput) {
  const prisma = withTenantContext(tenantId);
  return prisma.item.update({ where: { id }, data });
}

export async function softDeleteItem(tenantId: string, id: string) {
  const prisma = withTenantContext(tenantId);
  return prisma.item.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
```

---

## Error Handling Pattern

```typescript
import { FastifyReply } from 'fastify';
import { logger } from '@/lib/logger';

export function handleServiceError(error: unknown, reply: FastifyReply, operation: string) {
  logger.error(`Error in ${operation}:`, error);

  if (error instanceof PrismaClientKnownRequestError) {
    if (error.code === 'P2025') {
      return reply.status(404).send({ message: 'Resource not found' });
    }
    if (error.code === 'P2002') {
      return reply.status(409).send({ message: 'Resource already exists' });
    }
  }

  return reply.status(500).send({ message: `Failed to ${operation}` });
}
```

---

## Route Registration

```typescript
// apps/api/src/app.ts — Register the plugin
import itemRoutes from './modules/{module-name}/{module-name}.routes';

app.register(itemRoutes, { prefix: '/api/v1/items' });
```

---

## Notes

- Always use `withTenantContext(tenantId)` — never raw `prisma` in services.
- The `checkOwnership` middleware verifies the resource belongs to the user's tenant before the handler runs.
- Soft-delete sets `deletedAt`; the prisma-soft-delete middleware automatically filters these from queries.
- Swagger docs are auto-generated from the Zod schemas via `fastify-type-provider-zod`.
