---
task: runGDPRTests()
responsavel: "@kaven-qa"
responsavel_type: agent
atomic_layer: task
Entrada:
  - scope: string # "all" | "erasure" | "access" | "portability" | "consent"
  - module: string # optional: specific module to test
Saida:
  - compliance_report: markdown
  - pass_count: number
  - fail_count: number
  - compliance_status: string # "COMPLIANT" | "NON-COMPLIANT" | "PARTIAL"
Checklist:
  - [ ] Run right-to-erasure tests
  - [ ] Run right-to-access tests
  - [ ] Run data-portability tests
  - [ ] Run consent-management tests
  - [ ] Verify all tests pass
  - [ ] Generate compliance summary
  - [ ] Document any compliance gaps
  - [ ] Verify data anonymization works correctly
---

# runGDPRTests()

Execute the Kaven GDPR compliance test suite covering the four core data subject rights: erasure, access, portability, and consent management.

## Usage

```
@kaven-qa *task runGDPRTests --scope "all"
@kaven-qa *task runGDPRTests --scope "erasure" --module "users"
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `scope` | string | yes | Test scope: "all", "erasure", "access", "portability", "consent" |
| `module` | string | no | Specific module to test. Default: all modules |

## Output Format

```markdown
# GDPR Compliance Test Report
## Date: YYYY-MM-DD
## Scope: {scope}

## Compliance Status: COMPLIANT / NON-COMPLIANT / PARTIAL

## Results Summary
| Suite | Pass | Fail | Skip | Duration |
|-------|------|------|------|----------|
| Right to Erasure | 8 | 0 | 0 | 3.2s |
| Right to Access | 6 | 0 | 0 | 2.1s |
| Data Portability | 5 | 0 | 0 | 1.8s |
| Consent Mgmt | 7 | 0 | 0 | 1.5s |
| Total | 26 | 0 | 0 | 8.6s |

## Compliance Gaps (if any)
## Remediation Timeline
```

## Implementation Steps

### Step 1: Understand GDPR Test Structure

```
apps/api/src/__tests__/gdpr/
  ├── right-to-erasure/
  │   ├── user-deletion.test.ts
  │   ├── data-anonymization.test.ts
  │   └── cascade-deletion.test.ts
  ├── right-to-access/
  │   ├── data-export.test.ts
  │   └── data-inventory.test.ts
  ├── data-portability/
  │   ├── export-format.test.ts
  │   └── machine-readable.test.ts
  └── consent-management/
      ├── consent-tracking.test.ts
      └── consent-withdrawal.test.ts
```

### Step 2: Run Tests by Scope

```bash
# Run all GDPR tests
pnpm test:gdpr

# Run specific scope
pnpm vitest run --config vitest.config.ts apps/api/src/__tests__/gdpr/right-to-erasure/
pnpm vitest run --config vitest.config.ts apps/api/src/__tests__/gdpr/right-to-access/
pnpm vitest run --config vitest.config.ts apps/api/src/__tests__/gdpr/data-portability/
pnpm vitest run --config vitest.config.ts apps/api/src/__tests__/gdpr/consent-management/
```

### Step 3: What Each Suite Validates

#### Right to Erasure (Article 17)
- User deletion request triggers soft-delete on user record.
- Personal data is anonymized within the configured retention period.
- Cascade deletion removes or anonymizes related records (orders, invoices, comments).
- Anonymized data cannot be used to re-identify the user.
- Deletion is logged for audit trail (without personal data).
- Backups are scheduled for purge within retention window.

#### Right to Access (Article 15)
- Users can request a complete export of their personal data.
- Export includes all data categories: profile, orders, invoices, activity logs.
- Export is delivered within the configured timeframe.
- Export does not include other users' data (tenant-scoped).
- Data inventory accurately lists all fields containing personal data.

#### Data Portability (Article 20)
- Export format is machine-readable (JSON or CSV).
- Export follows a standard structure that can be imported elsewhere.
- Export includes all user-provided data (not derived/computed data).
- Large exports are handled via async job with download link.

#### Consent Management (Article 7)
- Consent is recorded with timestamp, scope, and method.
- Users can view their active consents.
- Users can withdraw consent at any time.
- Withdrawal of consent stops related data processing.
- Consent records are immutable (append-only log).
- Pre-checked consent boxes are not used (opt-in only).

### Step 4: Handle Failures

GDPR test failures are compliance issues that must be prioritized:

1. **Erasure failure** — P0 CRITICAL. Personal data may be retained illegally.
2. **Access failure** — P1 HIGH. Users cannot exercise their rights.
3. **Portability failure** — P1 HIGH. Data lock-in concerns.
4. **Consent failure** — P1 HIGH. Processing without valid consent.

For each failure:
1. Document the exact compliance gap.
2. Create a story with the appropriate priority.
3. Set a remediation deadline (72 hours for CRITICAL).
4. Notify `@kaven-architect` and project lead.

### Step 5: Verify Data Anonymization

Test that anonymization correctly replaces personal data:

```typescript
// Example anonymization check
const deletedUser = await prisma.user.findUnique({ where: { id: userId } });
expect(deletedUser.email).toMatch(/^anonymized-[a-f0-9]+@deleted\.kaven\.io$/);
expect(deletedUser.name).toBe('Deleted User');
expect(deletedUser.phone).toBeNull();
expect(deletedUser.deletedAt).toBeDefined();
```

### Step 6: Generate Compliance Report

1. Compile test results into the GDPR Compliance Report format.
2. Set overall status: COMPLIANT (0 failures), PARTIAL (non-critical failures), NON-COMPLIANT (critical failures).
3. List any compliance gaps with remediation timeline.
4. Save report to `docs/compliance/gdpr/GDPR-REPORT-{date}.md`.

### Step 7: Regulatory Context

This test suite validates compliance with:
- **GDPR** (EU General Data Protection Regulation)
- **LGPD** (Brazil Lei Geral de Protecao de Dados) — largely aligned with GDPR
- **CCPA** (California Consumer Privacy Act) — delete/access rights

The same test suite covers requirements for all three regulations where they overlap.
