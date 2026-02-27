---
task: runSecurityTests()
responsavel: "@kaven-qa"
responsavel_type: agent
atomic_layer: task
Entrada:
  - scope: string # "all" | "idor" | "csrf" | "sqli" | "xss" | "multi-tenant"
  - module: string # optional: specific module to test
Saida:
  - test_report: markdown
  - pass_count: number
  - fail_count: number
  - coverage_summary: object
Checklist:
  - [ ] Run IDOR protection tests
  - [ ] Run CSRF middleware tests
  - [ ] Run SQL injection tests
  - [ ] Run XSS prevention tests
  - [ ] Verify multi-tenant isolation
  - [ ] Check all tests pass
  - [ ] Generate coverage report
  - [ ] Document any new vulnerabilities found
---

# runSecurityTests()

Execute the Kaven security test suite covering IDOR, CSRF, SQL injection, XSS, and multi-tenant isolation. Uses Vitest as the test runner.

## Usage

```
@kaven-qa *task runSecurityTests --scope "all"
@kaven-qa *task runSecurityTests --scope "idor" --module "billing"
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `scope` | string | yes | Test scope: "all", "idor", "csrf", "sqli", "xss", "multi-tenant" |
| `module` | string | no | Specific module to test. Default: all modules |

## Output Format

```markdown
# Security Test Report
## Date: YYYY-MM-DD
## Scope: {scope}

## Results Summary
| Suite | Pass | Fail | Skip | Duration |
|-------|------|------|------|----------|
| IDOR  | 12   | 0    | 0    | 2.3s     |
| CSRF  | 8    | 0    | 0    | 1.1s     |
| SQLi  | 10   | 0    | 0    | 1.8s     |
| XSS   | 6    | 0    | 0    | 0.9s     |
| Total | 36   | 0    | 0    | 6.1s     |

## Failed Tests (if any)
## New Vulnerabilities (if any)
```

## Implementation Steps

### Step 1: Understand the Test Structure

Kaven security tests are located in:

```
apps/api/src/__tests__/security/
  ├── idor/
  │   ├── idor-protection.test.ts
  │   └── cross-tenant-access.test.ts
  ├── csrf/
  │   └── csrf-middleware.test.ts
  ├── sqli/
  │   └── sql-injection.test.ts
  ├── xss/
  │   └── xss-prevention.test.ts
  └── multi-tenant/
      ├── tenant-isolation.test.ts
      └── rls-middleware.test.ts
```

### Step 2: Run Tests by Scope

**Run all security tests:**
```bash
pnpm test:security
```

**Run specific scope:**
```bash
# IDOR tests
pnpm vitest run --config vitest.config.ts apps/api/src/__tests__/security/idor/

# CSRF tests
pnpm vitest run --config vitest.config.ts apps/api/src/__tests__/security/csrf/

# SQL Injection tests
pnpm vitest run --config vitest.config.ts apps/api/src/__tests__/security/sqli/

# XSS tests
pnpm vitest run --config vitest.config.ts apps/api/src/__tests__/security/xss/

# Multi-tenant isolation
pnpm vitest run --config vitest.config.ts apps/api/src/__tests__/security/multi-tenant/
```

### Step 3: What Each Suite Validates

#### IDOR Protection Tests
- Tenant A cannot access Tenant B's resources by changing IDs in URL.
- List endpoints only return resources belonging to the authenticated tenant.
- Nested resources respect parent ownership.
- Batch operations validate each ID belongs to the tenant.
- Admin-only endpoints reject non-admin users even with valid IDs.

#### CSRF Middleware Tests
- State-changing requests (POST, PUT, PATCH, DELETE) require CSRF token.
- GET requests do not require CSRF token.
- Invalid CSRF tokens are rejected with 403.
- Expired CSRF tokens are rejected.
- CSRF tokens are bound to user sessions.

#### SQL Injection Tests
- Parameterized queries prevent injection via user input.
- Special characters in search fields are escaped.
- ORDER BY clauses do not allow injection.
- LIMIT/OFFSET values are validated as integers.
- Raw query usage (if any) uses parameterized templates.

#### XSS Prevention Tests
- API responses do not reflect unsanitized user input.
- HTML entities are encoded in string responses.
- Content-Type headers are set correctly (application/json).
- Stored data is sanitized before persistence.

#### Multi-Tenant Isolation Tests
- RLS middleware correctly filters all queries by tenantId.
- Prisma soft-delete middleware excludes deleted records.
- Cross-tenant JOIN queries return only same-tenant data.
- Aggregate queries are scoped to tenant.
- Database-level constraints prevent orphaned tenant data.

### Step 4: Handle Test Failures

If tests fail:

1. Read the failure output carefully — identify the exact assertion that failed.
2. Determine if the failure is a regression (was passing before) or a new test.
3. Check if the failure is in the test setup (mock data, database state) or actual code.
4. Fix the root cause, not the symptom.
5. Re-run the specific failing test to verify the fix.
6. Re-run the full suite to ensure no regressions.

### Step 5: Generate Coverage Report

```bash
pnpm vitest run --coverage apps/api/src/__tests__/security/
```

Review coverage to identify untested endpoints or branches.

### Step 6: Document Results

1. Compile results into the Security Test Report format.
2. If new vulnerabilities are found, create stories with priority P0 (CRITICAL) or P1 (HIGH).
3. Save report to `docs/security/test-reports/SECURITY-{date}.md`.
4. Notify `@kaven-architect` if CRITICAL vulnerabilities are found.
