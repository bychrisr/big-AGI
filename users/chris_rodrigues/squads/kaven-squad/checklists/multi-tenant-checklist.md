# Multi-Tenant Isolation Checklist — Kaven Framework

> Use this checklist when adding or modifying any model, endpoint, or feature
> that handles tenant-scoped data. Multi-tenant isolation is the most critical
> architectural constraint in Kaven.

---

## Database Layer

- [ ] Model has `tenantId String` field (NOT NULL, no default)
- [ ] Model has `@@index([tenantId])` composite index
- [ ] Model has additional composite indexes for common queries: `@@index([tenantId, status])`, `@@index([tenantId, createdAt])`
- [ ] Relation to `Tenant` defined: `tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)`
- [ ] Tenant model updated with the new relation array field
- [ ] Unique constraints include tenantId where needed: `@@unique([tenantId, slug])`
- [ ] `deletedAt DateTime?` field present for soft-delete
- [ ] `@@map("table_name")` uses lowercase plural convention
- [ ] Migration tested against existing multi-tenant data

## RLS Middleware

- [ ] RLS middleware (`prisma-rls.ts`) intercepts all queries for this model
- [ ] Model added to the RLS middleware's model registry (if not automatic)
- [ ] `findMany` queries automatically filtered by tenantId
- [ ] `findUnique`/`findFirst` queries automatically filtered by tenantId
- [ ] `create` queries automatically inject tenantId
- [ ] `update` queries verify tenantId before modifying
- [ ] `delete` (soft) queries verify tenantId before modifying
- [ ] `count`/`aggregate` queries scoped by tenantId

## API Layer

- [ ] All routes extract tenantId from `request.user.tenantId` (JWT payload)
- [ ] No endpoint accepts tenantId from request body, query, or URL params
- [ ] Service functions receive tenantId as first parameter
- [ ] Service functions use `withTenantContext(tenantId)` for all Prisma operations
- [ ] No raw `prisma` client usage in route handlers or services
- [ ] `checkOwnership` middleware applied on single-resource endpoints
- [ ] List endpoints return only resources belonging to the authenticated tenant

## Cross-Tenant Access Tests (IDOR)

- [ ] Test: Tenant B cannot READ Tenant A's resource (returns 404)
- [ ] Test: Tenant B cannot UPDATE Tenant A's resource (returns 404, data unchanged)
- [ ] Test: Tenant B cannot DELETE Tenant A's resource (returns 404, resource intact)
- [ ] Test: Tenant B cannot list Tenant A's resources (list returns only own data)
- [ ] Test: Tenant B cannot use Tenant A's resource ID in relations (e.g., assign to project)
- [ ] Returns 404 (not 403) to prevent resource ID enumeration

## Data Isolation Tests

- [ ] Test: List query for Tenant A returns zero Tenant B items
- [ ] Test: Search/filter query scoped to tenant (no cross-tenant results)
- [ ] Test: Pagination counts reflect only tenant-scoped data
- [ ] Test: Aggregate queries (count, sum) scoped to tenant
- [ ] Test: Batch operations (bulk update, bulk delete) scoped to tenant

## Edge Cases

- [ ] Import/upload operations scope imported data to current tenant
- [ ] Export/download operations scope exported data to current tenant
- [ ] Background jobs include tenant context when processing
- [ ] Scheduled tasks (cron) iterate per-tenant, not globally
- [ ] Cache keys include tenantId to prevent cross-tenant cache poisoning
- [ ] Webhook payloads include tenantId for proper routing
- [ ] File storage paths include tenantId to isolate uploaded files
- [ ] Audit log entries always include tenantId

## Soft Delete Boundary

- [ ] Soft-deleted records of Tenant A are invisible to Tenant A queries
- [ ] Soft-deleted records of Tenant A are invisible to Tenant B queries
- [ ] Hard delete (GDPR) only removes records for the requesting tenant
- [ ] Restore (un-delete) only works within the same tenant boundary

## Documentation

- [ ] API docs reflect tenant-scoped behavior
- [ ] Any tenant-specific limits documented (e.g., max records per tenant)
- [ ] Migration notes mention tenant isolation requirements
