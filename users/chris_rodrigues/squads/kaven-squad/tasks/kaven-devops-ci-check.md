---
task: ciCheck()
responsavel: "@kaven-devops"
responsavel_type: agent
atomic_layer: task
Entrada:
  - scope: string # "full" | "quick" | "pre-commit" | "pre-push" | "pre-pr"
  - fix: boolean # auto-fix lint/format issues
Saida:
  - ci_report: markdown
  - pass_count: number
  - fail_count: number
  - overall_status: string # "PASS" | "FAIL"
Checklist:
  - [ ] Run ESLint (lint)
  - [ ] Run TypeScript type checking
  - [ ] Run design system policy check
  - [ ] Run UI migration check
  - [ ] Run unit tests
  - [ ] Run security tests
  - [ ] Run GDPR compliance tests
  - [ ] Run build verification
  - [ ] Verify all checks pass
  - [ ] Generate CI status report
---

# ciCheck()

Run the local CI check pipeline that mirrors the GitHub Actions workflow, with configurable scope levels for different stages of development.

## Usage

```
@kaven-devops *task ciCheck --scope "full"
@kaven-devops *task ciCheck --scope "pre-commit" --fix true
@kaven-devops *task ciCheck --scope "quick"
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `scope` | string | yes | "full", "quick", "pre-commit", "pre-push", "pre-pr" |
| `fix` | boolean | no | Auto-fix lint/format issues. Default: false |

## Output Format

```markdown
# CI Check Report
## Date: YYYY-MM-DD
## Scope: {scope}
## Overall Status: PASS / FAIL

## Results
| Check | Status | Duration | Details |
|-------|--------|----------|---------|
| Lint | PASS | 3.2s | 0 errors, 2 warnings |
| TypeCheck | PASS | 8.1s | No errors |
| Unit Tests | PASS | 12.4s | 45/45 passed |
| Security Tests | PASS | 6.2s | 36/36 passed |
| GDPR Tests | PASS | 8.6s | 26/26 passed |
| Build | PASS | 24.1s | All apps built |
```

## Scope Definitions

Kaven uses a progressive CI system with 3 escalation levels:

| Scope | When | What it runs | Expected time |
|-------|------|-------------|---------------|
| `pre-commit` | Before each commit | Lint + TypeCheck | ~15s |
| `pre-push` | Before git push | Lint + TypeCheck + Unit Tests | ~30s |
| `pre-pr` / `full` | Before opening PR | Everything | ~60s |
| `quick` | Manual quick check | Lint + TypeCheck only | ~10s |

## Implementation Steps

### Step 1: pre-commit Scope (fastest)

```bash
echo "=== PRE-COMMIT CI CHECK ==="
PASS=0
FAIL=0

# 1. ESLint
echo "Running lint..."
if pnpm run lint ${FIX:+--fix}; then
  echo "PASS: Lint"
  PASS=$((PASS + 1))
else
  echo "FAIL: Lint"
  FAIL=$((FAIL + 1))
fi

# 2. TypeScript type checking
echo "Running typecheck..."
if pnpm run typecheck; then
  echo "PASS: TypeCheck"
  PASS=$((PASS + 1))
else
  echo "FAIL: TypeCheck"
  FAIL=$((FAIL + 1))
fi

echo "Results: $PASS passed, $FAIL failed"
```

### Step 2: pre-push Scope (adds tests)

Includes everything from pre-commit, plus:

```bash
echo "=== PRE-PUSH CI CHECK ==="

# 1-2. Run pre-commit checks first
# ... (lint + typecheck)

# 3. Design system policy check
echo "Running design system policy..."
if pnpm run check:design-system 2>/dev/null || true; then
  echo "PASS: Design System Policy"
  PASS=$((PASS + 1))
fi

# 4. UI migration check
echo "Running UI migration check..."
if pnpm run check:ui-migration 2>/dev/null || true; then
  echo "PASS: UI Migration Check"
  PASS=$((PASS + 1))
fi

# 5. Unit tests
echo "Running unit tests..."
if pnpm test -- --run; then
  echo "PASS: Unit Tests"
  PASS=$((PASS + 1))
else
  echo "FAIL: Unit Tests"
  FAIL=$((FAIL + 1))
fi
```

### Step 3: full / pre-pr Scope (everything)

Includes everything from pre-push, plus:

```bash
echo "=== FULL CI CHECK ==="

# 1-5. Run pre-push checks first
# ... (lint + typecheck + design system + ui migration + unit tests)

# 6. Security tests
echo "Running security tests..."
if pnpm test:security; then
  echo "PASS: Security Tests"
  PASS=$((PASS + 1))
else
  echo "FAIL: Security Tests"
  FAIL=$((FAIL + 1))
fi

# 7. GDPR compliance tests
echo "Running GDPR tests..."
if pnpm test:gdpr; then
  echo "PASS: GDPR Tests"
  PASS=$((PASS + 1))
else
  echo "FAIL: GDPR Tests"
  FAIL=$((FAIL + 1))
fi

# 8. Build verification
echo "Running build..."
if pnpm run build; then
  echo "PASS: Build"
  PASS=$((PASS + 1))
else
  echo "FAIL: Build"
  FAIL=$((FAIL + 1))
fi
```

### Step 4: Handle the --fix Flag

When `fix` is true:

```bash
# Auto-fix lint issues
pnpm run lint --fix

# Auto-fix formatting
pnpm run format

# Stage fixed files
git add -A
```

### Step 5: Script Locations

The actual scripts are defined in the root `package.json`:

```json
{
  "scripts": {
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "test:security": "vitest run --config vitest.config.ts apps/api/src/__tests__/security/",
    "test:gdpr": "vitest run --config vitest.config.ts apps/api/src/__tests__/gdpr/",
    "build": "turbo run build",
    "check:design-system": "node scripts/check-design-system.js",
    "check:ui-migration": "node scripts/check-ui-migration.js",
    "ci:pre-commit": "pnpm run lint && pnpm run typecheck",
    "ci:pre-push": "pnpm run ci:pre-commit && pnpm test -- --run",
    "ci:full": "pnpm run ci:pre-push && pnpm test:security && pnpm test:gdpr && pnpm run build"
  }
}
```

### Step 6: Mapping to GitHub Actions

The local CI check mirrors the GitHub Actions pipeline:

| Local Command | GitHub Actions Job | Trigger |
|---|---|---|
| `pnpm run lint` | `lint` job | Every PR |
| `pnpm run typecheck` | `typecheck` job | Every PR |
| `pnpm test -- --run` | `test` job | Every PR |
| `pnpm test:security` | `security-tests` job | Every PR |
| `pnpm test:gdpr` | `gdpr-tests` job | Every PR |
| `pnpm run build` | `build` job | Every PR |

### Step 7: Interpret Results

**All PASS** — Safe to proceed with commit/push/PR.

**Lint FAIL** — Run with `--fix` flag. If auto-fix cannot resolve, manually fix the issues.

**TypeCheck FAIL** — TypeScript errors must be fixed. Check for missing types, incorrect imports, or type mismatches.

**Test FAIL** — Read the test output to identify the failing test. Determine if it is a regression or a test that needs updating.

**Build FAIL** — Usually caused by TypeScript errors not caught by typecheck (import resolution, etc.). Check build logs for specific error.

### Step 8: Generate Report

Compile all results into the CI Check Report format with:
- Status of each check (PASS/FAIL).
- Duration of each check.
- Details about failures (error messages, file locations).
- Overall status.
- Recommendations for fixing failures.
