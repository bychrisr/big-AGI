# New Feature Checklist — Kaven Framework

> Complete this checklist when adding any new feature to the Kaven framework.
> Copy this file to your story/PR description and check items as you go.

---

## Architecture & Planning

- [ ] Story/ticket exists with clear acceptance criteria
- [ ] Architecture review completed (schema impact, middleware needs, feature flag requirements)
- [ ] Identified which apps are affected (API, Admin Panel, Tenant App, or combination)
- [ ] Checked existing components in `squads/` and `packages/ui/` before creating new ones
- [ ] Determined if feature is plan-gated (Starter/Complete/Pro) and which capabilities apply

## Database Schema

- [ ] Prisma model created in `schema.extended.prisma`
- [ ] Model includes required fields: `id`, `tenantId`, `createdAt`, `updatedAt`, `deletedAt`
- [ ] Relation to `Tenant` defined with `onDelete: Cascade`
- [ ] Composite index `@@index([tenantId, ...])` added
- [ ] `@@map("table_name")` uses lowercase plural convention
- [ ] Tenant model updated with new relation array
- [ ] Schema merges without errors (`pnpm merge-schema`)
- [ ] Migration generated and tested (`prisma migrate dev`)
- [ ] Prisma Client regenerated (`prisma generate`)
- [ ] Seed data added if needed for development/demo

## API Endpoints

- [ ] Route file created following Fastify plugin pattern
- [ ] Controller file with request handlers
- [ ] Service file with business logic using `withTenantContext(tenantId)`
- [ ] Zod schemas for input validation (create, update, query, params)
- [ ] Zod schemas for response (for Swagger documentation)
- [ ] Routes registered in `app.ts` with correct prefix

## Middleware Chain

- [ ] `authMiddleware` applied (all protected routes)
- [ ] `requireRole` configured with correct roles per endpoint
- [ ] `requireFeature` guard added for plan-gated endpoints
- [ ] `checkOwnership` middleware for resource-specific endpoints
- [ ] Rate limiting configured for sensitive endpoints (login, create, etc.)

## Frontend — Pages

- [ ] Server Component page with metadata and translations
- [ ] Client Component for interactive elements (data table, forms)
- [ ] `loading.tsx` with Skeleton components
- [ ] `error.tsx` with error boundary and retry button
- [ ] Layout with Breadcrumb navigation
- [ ] Responsive design verified (mobile, tablet, desktop)

## Frontend — Components & Hooks

- [ ] Components use `@kaven/ui` primitives (no direct shadcn or MUI imports)
- [ ] TanStack Query hooks for all data fetching (query + mutations)
- [ ] Query invalidation configured correctly after mutations
- [ ] Forms use `react-hook-form` + `zodResolver` with shared Zod schemas
- [ ] Dark mode works correctly (CSS variables, no hardcoded colors)

## Internationalization (i18n)

- [ ] All user-facing strings use `next-intl` translation keys
- [ ] EN translation file updated
- [ ] PT-BR translation file updated
- [ ] No hardcoded strings in components or pages

## Testing

- [ ] Unit tests for service business logic
- [ ] Integration tests for API routes (CRUD operations)
- [ ] IDOR protection tests (cross-tenant access returns 404)
- [ ] Multi-tenant isolation tests (list queries scoped to tenant)
- [ ] RBAC tests (role-based access control per endpoint)
- [ ] Validation tests (invalid payloads return 400)
- [ ] Edge case tests (empty results, max pagination, etc.)

## Security

- [ ] IDOR: All endpoints verify resource ownership via tenantId
- [ ] XSS: User-generated content sanitized before storage
- [ ] CSRF: Origin validation active on mutation endpoints
- [ ] SQL Injection: All inputs go through Zod + Prisma parameterized queries
- [ ] No raw SQL queries without tenant filter
- [ ] Audit logging for critical operations

## GDPR Compliance

- [ ] Soft delete used (no hard deletes except explicit GDPR erasure)
- [ ] Personal data identified and documented
- [ ] Data export endpoint available if feature handles PII
- [ ] Retention policy documented

## Documentation & Quality

- [ ] API documentation auto-generated via Swagger schemas
- [ ] Feature flag registered in capabilities system (if gated)
- [ ] No `console.log` in production code (use Winston logger)
- [ ] Lint passes with zero warnings (`pnpm lint`)
- [ ] TypeScript strict mode passes (`pnpm typecheck`)
- [ ] All tests pass (`pnpm test`)
- [ ] Conventional commit message follows format

## PR & Review

- [ ] PR created with description and evidence
- [ ] CI pipeline passes (lint, typecheck, tests)
- [ ] Code review completed
- [ ] No secrets or credentials in committed files
- [ ] Branch will be deleted after merge
