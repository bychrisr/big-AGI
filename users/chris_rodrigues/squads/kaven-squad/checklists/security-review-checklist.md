# Security Review Checklist — Kaven Framework

> Use this checklist when reviewing any PR or feature for security compliance.
> Every item must be verified before merging code that touches API routes, middleware, or data access.

---

## Authentication

- [ ] JWT validation active on all protected routes (via `authMiddleware`)
- [ ] No routes accidentally left unprotected (check route registration)
- [ ] Token expiration is short-lived (15-60 minutes for access tokens)
- [ ] Refresh tokens stored in database (not only in cookies/localStorage)
- [ ] Refresh token rotation implemented (old token invalidated on use)
- [ ] Logout invalidates refresh token server-side

## Authorization (RBAC)

- [ ] `requireRole` middleware applied with correct roles per endpoint
- [ ] Role hierarchy respected (SUPER_ADMIN > ADMIN > MEMBER > VIEWER)
- [ ] Admin-only operations (create, update, delete) blocked for MEMBER/VIEWER
- [ ] Feature guards (`requireFeature`) applied for plan-gated endpoints
- [ ] No role escalation possible through API manipulation

## IDOR Protection (Critical)

- [ ] All endpoints verify resource ownership via `tenantId` from JWT
- [ ] `checkOwnership` middleware active on single-resource endpoints (GET :id, PUT :id, DELETE :id)
- [ ] Cross-tenant access returns 404 (not 403) to prevent resource enumeration
- [ ] List queries automatically scoped by tenantId via RLS middleware
- [ ] Batch operations validate all IDs belong to the requesting tenant
- [ ] No endpoint accepts tenantId from request body/params (always from JWT)

## Input Validation

- [ ] All request bodies validated via Zod schemas
- [ ] All query parameters validated via Zod schemas
- [ ] All URL parameters validated via Zod schemas (e.g., `:id` is `.cuid()`)
- [ ] String inputs trimmed and length-limited
- [ ] No raw user input passed to database queries
- [ ] File uploads validated for type, size, and content

## SQL Injection Prevention

- [ ] All database queries use Prisma ORM (parameterized by default)
- [ ] No `prisma.$queryRaw` or `prisma.$executeRaw` with string concatenation
- [ ] If raw SQL is necessary, uses `Prisma.sql` tagged template (parameterized)
- [ ] Search/filter inputs sanitized before use in `contains`/`startsWith` queries

## XSS Prevention

- [ ] All user-generated content sanitized with DOMPurify before database storage
- [ ] HTML rendering uses React's built-in escaping (no `dangerouslySetInnerHTML` without sanitization)
- [ ] Markdown content rendered through a safe parser
- [ ] User-provided URLs validated before use in `href` or `src` attributes

## CSRF Protection

- [ ] Origin/Referer headers validated on all mutation endpoints (POST, PUT, DELETE)
- [ ] SameSite cookie attribute set to `Strict` or `Lax`
- [ ] CORS allowed origins properly configured (no wildcard `*` in production)

## Rate Limiting

- [ ] Login endpoint rate-limited (e.g., 5 attempts per minute per IP)
- [ ] Registration endpoint rate-limited
- [ ] Password reset endpoint rate-limited
- [ ] API endpoints have general rate limiting per tenant
- [ ] File upload endpoints have stricter rate limits

## Data Protection

- [ ] Passwords hashed with bcrypt (salt rounds >= 12)
- [ ] Sensitive data not logged (passwords, tokens, PII)
- [ ] API responses do not leak internal IDs, stack traces, or system info
- [ ] Error messages are generic for unauthorized/forbidden (no information leakage)
- [ ] Soft delete used by default (hard delete only for GDPR erasure)

## Headers & Transport

- [ ] Helmet security headers active (X-Frame-Options, X-Content-Type-Options, etc.)
- [ ] HSTS enabled in production
- [ ] Content-Security-Policy configured
- [ ] CORS allowed origins match production domains only

## Audit & Logging

- [ ] Critical actions logged to `AuditLog` (create, update, delete, role changes)
- [ ] Security events logged to `SecurityAuditLog` (login, failed auth, permission denied)
- [ ] Logs include tenantId, userId, action, and timestamp
- [ ] No sensitive data in log entries (passwords, tokens, credit card numbers)
- [ ] Log retention policy configured

## Tenant Isolation

- [ ] RLS middleware (`prisma-rls.ts`) intercepts all queries for this model
- [ ] No direct Prisma client usage without tenant context
- [ ] Soft-delete filter respects tenant boundary
- [ ] Aggregate queries (count, sum, etc.) scoped to tenant
- [ ] Background jobs/cron tasks include tenant context
