# PR Review Checklist — Kaven Framework

> Use this checklist when reviewing any pull request for the Kaven framework.
> Reviewer should verify each applicable item before approving.

---

## Code Quality

- [ ] Code follows Kaven coding standards (TypeScript strict mode, consistent naming)
- [ ] Functions are focused and testable (single responsibility)
- [ ] No commented-out code left in the PR
- [ ] No `console.log` or `console.error` in production code (use Winston logger)
- [ ] Error handling follows the project pattern (try/catch with descriptive messages)
- [ ] No `any` type usage (use proper TypeScript types or `unknown` with type guards)
- [ ] No magic numbers or hardcoded strings (use constants or i18n keys)

## Architecture Compliance

- [ ] No raw SQL queries (use Prisma ORM with RLS context)
- [ ] No direct `prisma` client usage without `withTenantContext(tenantId)`
- [ ] No Material-UI or third-party UI imports (use `@kaven/ui` only)
- [ ] No hardcoded user-facing strings (use `next-intl` translation keys)
- [ ] Follows Fastify plugin pattern for new routes
- [ ] Follows Atomic Design pattern for new components (atom/molecule/organism)

## Multi-Tenant Safety

- [ ] All new models have `tenantId` field (NOT NULL)
- [ ] All new models have `deletedAt` field (soft-delete)
- [ ] All new models have `@@index([tenantId, ...])` composite index
- [ ] All new endpoints extract tenantId from JWT (not request body/params)
- [ ] All new endpoints have complete middleware chain (auth, role, feature guard)
- [ ] No endpoint leaks data from other tenants
- [ ] `checkOwnership` middleware applied on resource-specific endpoints

## Validation & Security

- [ ] All inputs validated with Zod schemas
- [ ] User-generated content sanitized (DOMPurify) before storage
- [ ] No sensitive data in API responses (passwords, internal IDs, stack traces)
- [ ] Rate limiting configured for sensitive endpoints
- [ ] Audit logging added for critical operations

## Testing

- [ ] Tests added for new functionality
- [ ] IDOR tests exist (cross-tenant access returns 404)
- [ ] RBAC tests verify role-based access
- [ ] Validation tests verify bad input is rejected
- [ ] Security test suite passes (`pnpm test:security`)
- [ ] GDPR test suite passes (`pnpm test:gdpr`)
- [ ] All existing tests still pass

## Frontend (if applicable)

- [ ] Components use `@kaven/ui` primitives
- [ ] Dark mode works correctly (no hardcoded colors)
- [ ] Responsive design verified (mobile-first approach)
- [ ] Loading states implemented (Skeleton components)
- [ ] Error states implemented (error boundary with retry)
- [ ] Accessibility basics checked (labels, alt text, keyboard navigation)
- [ ] TanStack Query used for data fetching (with proper cache invalidation)

## Build & CI

- [ ] Lint passes with zero warnings (`pnpm lint`)
- [ ] TypeScript strict mode passes (`pnpm typecheck`)
- [ ] All tests pass (`pnpm test`)
- [ ] No new dependencies added without justification
- [ ] No secrets or credentials in committed files
- [ ] `.env.example` updated if new environment variables added

## Commit & PR Standards

- [ ] Conventional commit messages used (`feat:`, `fix:`, `chore:`, etc.)
- [ ] PR description includes summary of changes
- [ ] PR description includes evidence (screenshots, test output, etc.)
- [ ] Breaking changes documented prominently
- [ ] Related story/ticket referenced in PR description
- [ ] Branch will be deleted after merge
