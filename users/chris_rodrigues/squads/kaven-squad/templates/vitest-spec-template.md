# Vitest Test Template — Kaven Framework

> Use this template when writing tests for Kaven API routes, services, or middleware.

---

## File Location

```
apps/api/src/modules/{module-name}/
├── {module-name}.test.ts       # Route integration tests
├── {module-name}.service.test.ts  # Unit tests for service logic
└── __fixtures__/
    └── {module-name}.fixtures.ts  # Test data factories
```

---

## Test File Structure

```typescript
// apps/api/src/modules/items/items.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestApp } from '@/test/helpers/create-test-app';
import { createTestTenant } from '@/test/helpers/create-test-tenant';
import { createTestUser } from '@/test/helpers/create-test-user';
import { authenticateUser } from '@/test/helpers/authenticate-user';
import { cleanupDatabase } from '@/test/helpers/cleanup';
import { prisma } from '@/lib/prisma';
import type { FastifyInstance } from 'fastify';

describe('Items API', () => {
  let app: FastifyInstance;
  let tenantA: { id: string; slug: string };
  let tenantB: { id: string; slug: string };
  let adminToken: string;
  let memberToken: string;
  let tenantBToken: string;

  beforeAll(async () => {
    app = await createTestApp();

    // Create two tenants for isolation tests
    tenantA = await createTestTenant({ name: 'Tenant A' });
    tenantB = await createTestTenant({ name: 'Tenant B' });

    // Create users with different roles
    const admin = await createTestUser({
      tenantId: tenantA.id,
      role: 'ADMIN',
      email: 'admin@tenanta.test',
    });
    const member = await createTestUser({
      tenantId: tenantA.id,
      role: 'MEMBER',
      email: 'member@tenanta.test',
    });
    const tenantBUser = await createTestUser({
      tenantId: tenantB.id,
      role: 'ADMIN',
      email: 'admin@tenantb.test',
    });

    adminToken = await authenticateUser(app, admin);
    memberToken = await authenticateUser(app, member);
    tenantBToken = await authenticateUser(app, tenantBUser);
  });

  afterAll(async () => {
    await cleanupDatabase([tenantA.id, tenantB.id]);
    await app.close();
  });

  // -------------------------------------------------------------------
  // CRUD Tests
  // -------------------------------------------------------------------

  describe('POST /api/v1/items', () => {
    it('should create an item as admin', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/items',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Test Item',
          description: 'A test item',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        name: 'Test Item',
        description: 'A test item',
      });
      expect(body.id).toBeDefined();
    });

    it('should reject creation without auth', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/items',
        payload: { name: 'Unauthorized Item' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject creation with invalid payload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/items',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { name: '' }, // empty name should fail validation
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/items', () => {
    it('should list items for the authenticated tenant', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/items',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeInstanceOf(Array);
      expect(body.meta).toHaveProperty('total');
      expect(body.meta).toHaveProperty('page');
    });

    it('should support pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/items?page=1&limit=5',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.length).toBeLessThanOrEqual(5);
      expect(body.meta.limit).toBe(5);
    });
  });

  describe('GET /api/v1/items/:id', () => {
    let itemId: string;

    beforeEach(async () => {
      const item = await prisma.item.create({
        data: {
          tenantId: tenantA.id,
          name: 'Findable Item',
        },
      });
      itemId = item.id;
    });

    it('should return item by id', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/items/${itemId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.name).toBe('Findable Item');
    });

    it('should return 404 for non-existent item', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/items/clxxxxxxxxxxxxxxxxxxxxxxxxx',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PUT /api/v1/items/:id', () => {
    it('should update an existing item', async () => {
      const item = await prisma.item.create({
        data: { tenantId: tenantA.id, name: 'Before Update' },
      });

      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/items/${item.id}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { name: 'After Update' },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).name).toBe('After Update');
    });
  });

  describe('DELETE /api/v1/items/:id', () => {
    it('should soft-delete an item (sets deletedAt)', async () => {
      const item = await prisma.item.create({
        data: { tenantId: tenantA.id, name: 'To Be Deleted' },
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/items/${item.id}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(204);

      // Verify soft-delete (raw query to bypass soft-delete filter)
      const deleted = await prisma.item.findFirst({
        where: { id: item.id, deletedAt: { not: null } },
      });
      expect(deleted).not.toBeNull();
      expect(deleted?.deletedAt).toBeInstanceOf(Date);
    });
  });

  // -------------------------------------------------------------------
  // IDOR / Cross-Tenant Tests (CRITICAL)
  // -------------------------------------------------------------------

  describe('IDOR Protection', () => {
    let tenantAItem: string;

    beforeAll(async () => {
      const item = await prisma.item.create({
        data: { tenantId: tenantA.id, name: 'Tenant A Secret' },
      });
      tenantAItem = item.id;
    });

    it('should block Tenant B from reading Tenant A item', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/items/${tenantAItem}`,
        headers: { authorization: `Bearer ${tenantBToken}` },
      });

      // Should be 404 (not 403) to avoid leaking existence
      expect(response.statusCode).toBe(404);
    });

    it('should block Tenant B from updating Tenant A item', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/items/${tenantAItem}`,
        headers: { authorization: `Bearer ${tenantBToken}` },
        payload: { name: 'Hacked Name' },
      });

      expect(response.statusCode).toBe(404);

      // Verify no change occurred
      const item = await prisma.item.findUnique({ where: { id: tenantAItem } });
      expect(item?.name).toBe('Tenant A Secret');
    });

    it('should block Tenant B from deleting Tenant A item', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/items/${tenantAItem}`,
        headers: { authorization: `Bearer ${tenantBToken}` },
      });

      expect(response.statusCode).toBe(404);

      // Verify item still exists
      const item = await prisma.item.findUnique({ where: { id: tenantAItem } });
      expect(item?.deletedAt).toBeNull();
    });
  });

  // -------------------------------------------------------------------
  // Multi-Tenant Isolation Tests
  // -------------------------------------------------------------------

  describe('Tenant Isolation', () => {
    beforeAll(async () => {
      await prisma.item.createMany({
        data: [
          { tenantId: tenantA.id, name: 'A-Item-1' },
          { tenantId: tenantA.id, name: 'A-Item-2' },
          { tenantId: tenantB.id, name: 'B-Item-1' },
          { tenantId: tenantB.id, name: 'B-Item-2' },
          { tenantId: tenantB.id, name: 'B-Item-3' },
        ],
      });
    });

    it('should only return items belonging to authenticated tenant', async () => {
      const responseA = await app.inject({
        method: 'GET',
        url: '/api/v1/items',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      const bodyA = JSON.parse(responseA.body);
      const tenantAIds = bodyA.data.map((i: any) => i.tenantId);
      expect(tenantAIds.every((id: string) => id === tenantA.id)).toBe(true);

      const responseB = await app.inject({
        method: 'GET',
        url: '/api/v1/items',
        headers: { authorization: `Bearer ${tenantBToken}` },
      });
      const bodyB = JSON.parse(responseB.body);
      const tenantBIds = bodyB.data.map((i: any) => i.tenantId);
      expect(tenantBIds.every((id: string) => id === tenantB.id)).toBe(true);
    });

    it('should not leak tenant data in search results', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/items?search=Item',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      const body = JSON.parse(response.body);
      const leakedItems = body.data.filter((i: any) => i.tenantId !== tenantA.id);
      expect(leakedItems).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------
  // RBAC Tests
  // -------------------------------------------------------------------

  describe('Role-Based Access', () => {
    it('should allow MEMBER to read items', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/items',
        headers: { authorization: `Bearer ${memberToken}` },
      });
      expect(response.statusCode).toBe(200);
    });

    it('should block MEMBER from creating items (admin-only)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/items',
        headers: { authorization: `Bearer ${memberToken}` },
        payload: { name: 'Member Attempt' },
      });
      expect(response.statusCode).toBe(403);
    });
  });
});
```

---

## Test Fixtures

```typescript
// apps/api/src/modules/items/__fixtures__/items.fixtures.ts
import { prisma } from '@/lib/prisma';

export async function createItemFixtures(tenantId: string) {
  return prisma.item.createMany({
    data: [
      { tenantId, name: 'Fixture Item 1', status: 'ACTIVE' },
      { tenantId, name: 'Fixture Item 2', status: 'ACTIVE' },
      { tenantId, name: 'Fixture Item 3', status: 'INACTIVE' },
      { tenantId, name: 'Archived Fixture', status: 'ARCHIVED' },
    ],
  });
}
```

---

## Notes

- Always test cross-tenant access (IDOR). Return 404, not 403, to avoid leaking resource existence.
- Use `beforeAll` for setup that is shared across tests; use `beforeEach` when tests need isolated state.
- Always call `cleanupDatabase` in `afterAll` to remove test tenants and cascade-delete their data.
- For security-specific tests (CSRF, XSS, SQLi), see the security test suite in `apps/api/src/test/security/`.
