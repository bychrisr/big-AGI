---
task: auditSecurity()
responsavel: "@kaven-architect"
responsavel_type: agent
atomic_layer: task
Entrada:
  - module_name: string
  - scope: string # "full" | "idor" | "csrf" | "auth" | "rls" | "input"
Saida:
  - security_audit_report: markdown
  - vulnerabilities_found: list
  - severity_ratings: object
  - remediation_steps: list
Checklist:
  - [ ] Verify IDOR protection on all endpoints
  - [ ] Check CSRF middleware on state-changing routes
  - [ ] Validate input sanitization (Zod schemas)
  - [ ] Check rate limiting configuration
  - [ ] Verify tenant isolation (RLS middleware)
  - [ ] Review auth chain completeness
  - [ ] Check for SQL injection vectors
  - [ ] Verify XSS prevention in responses
  - [ ] Review secret/credential exposure
  - [ ] Validate error message information leakage
---

# auditSecurity()

Perform a security audit on a specific module or feature within the Kaven framework, targeting the 10-layer middleware stack and multi-tenant isolation.

## Usage

```
@kaven-architect *task auditSecurity --module "billing" --scope "full"
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `module_name` | string | yes | Name of the module or feature to audit |
| `scope` | string | no | Audit scope: "full", "idor", "csrf", "auth", "rls", "input". Default: "full" |

## Output Format

```markdown
# Security Audit Report: {module_name}
## Audit Metadata
## Executive Summary
## Findings by Category
### 1. IDOR Protection
### 2. CSRF Middleware
### 3. Input Sanitization
### 4. Rate Limiting
### 5. Tenant Isolation
### 6. Auth Chain
### 7. SQL Injection
### 8. XSS Prevention
## Severity Summary Table
## Remediation Priority List
```

Severity levels: CRITICAL / HIGH / MEDIUM / LOW / INFO

## Implementation Steps

### Step 1: Inventory the Module's Attack Surface

1. List all endpoints (routes) in the module.
2. Identify which HTTP methods each endpoint uses.
3. Map which endpoints are public vs. authenticated.
4. Identify which endpoints accept user input (body, query, params).
5. Note which endpoints return sensitive data.

```bash
# Find all route files for the module
find apps/api/src/modules/{module_name} -name "*.route.ts" -o -name "*.controller.ts"
```

### Step 2: Audit IDOR Protection

For every endpoint that accepts a resource ID:

1. Verify the route uses `verifyResourceOwnership()` or equivalent middleware.
2. Check that queries include `tenantId` in WHERE clauses (via RLS).
3. Test that User A cannot access User B's resources by changing the ID.
4. Verify that list endpoints filter by the authenticated user's tenant.
5. Check for indirect IDOR via related resources (e.g., fetching invoices via orderId).

**Red flags:**
- `findUnique({ where: { id } })` without tenantId
- Route params used directly in queries without ownership check
- Batch endpoints that don't validate each ID belongs to the tenant

### Step 3: Audit CSRF Middleware

1. Verify all state-changing routes (POST, PUT, PATCH, DELETE) have CSRF protection.
2. Check that CSRF tokens are validated in the middleware chain.
3. Verify SameSite cookie attributes are set correctly.
4. Check that GET endpoints do not perform state changes.

### Step 4: Audit Input Sanitization

1. Verify every endpoint has a Zod validation schema.
2. Check that Zod schemas use `.trim()`, `.max()`, and appropriate types.
3. Look for raw `request.body` usage without validation.
4. Check for path traversal in file upload endpoints.
5. Verify enum values are validated against allowed lists.

### Step 5: Audit Rate Limiting

1. Check that sensitive endpoints have rate limiting configured.
2. Verify rate limits are appropriate (login: strict, read: lenient).
3. Check that rate limiting is per-tenant, not just per-IP.
4. Verify brute-force protection on auth endpoints.

### Step 6: Audit Tenant Isolation (RLS)

1. Verify the module uses the RLS-enhanced Prisma client.
2. Check that `prisma-rls.ts` middleware is active for all queries.
3. Verify no raw SQL queries bypass RLS.
4. Check that `prisma-soft-delete.ts` correctly filters deleted records.
5. Test cross-tenant data leakage scenarios.

### Step 7: Audit Auth Chain

1. Verify JWT validation is present on protected routes.
2. Check token expiration handling.
3. Verify RBAC roles are checked (`requireRole()`).
4. Check feature guard enforcement (`requireFeature()`).
5. Verify refresh token rotation is implemented.

### Step 8: Check SQL Injection Vectors

1. Look for raw SQL queries (`$queryRaw`, `$executeRaw`).
2. Verify parameterized queries are used exclusively.
3. Check for string interpolation in query building.
4. Verify Prisma's built-in protection is not bypassed.

### Step 9: Check XSS Prevention

1. Verify API responses do not reflect unsanitized user input.
2. Check Content-Type headers are set correctly.
3. Verify frontend sanitizes data before rendering.
4. Check for stored XSS in database fields.

### Step 10: Compile Report and Prioritize

1. Assign severity to each finding (CRITICAL > HIGH > MEDIUM > LOW > INFO).
2. Create remediation steps ordered by severity.
3. Estimate effort for each remediation.
4. Save report to `docs/security/audits/AUDIT-{module_name}-{date}.md`.
5. Create stories for CRITICAL and HIGH findings.
