---
task: reviewFeature()
responsavel: "@kaven-architect"
responsavel_type: agent
atomic_layer: task
Entrada:
  - feature_name: string
  - feature_description: string
Saida:
  - architecture_review_document: markdown
  - impact_analysis: object
  - schema_changes: list
  - middleware_needs: list
  - frontend_components: list
Checklist:
  - [ ] Analyze multi-tenant impact
  - [ ] Review middleware chain needs
  - [ ] Check feature flag requirements
  - [ ] Identify schema changes
  - [ ] Estimate complexity (hours)
  - [ ] Document API surface changes
  - [ ] Identify cross-module dependencies
---

# reviewFeature()

Review a new feature proposal within the Kaven SaaS framework context, producing a comprehensive architecture review document with impact analysis.

## Usage

```
@kaven-architect *task reviewFeature --feature "Invoice Export" --description "Allow tenants to export invoices as PDF/CSV"
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `feature_name` | string | yes | Name of the feature being proposed |
| `feature_description` | string | yes | Detailed description of the feature's purpose and scope |

## Output Format

The task produces an Architecture Review Document (ARD) in markdown with the following sections:

```markdown
# Architecture Review: {feature_name}
## 1. Executive Summary
## 2. Multi-Tenant Impact Analysis
## 3. Schema Changes Required
## 4. Middleware Chain Assessment
## 5. Feature Flag Configuration
## 6. Frontend Component Map
## 7. API Surface Changes
## 8. Complexity Estimate
## 9. Risk Assessment
## 10. Recommendation
```

## Implementation Steps

### Step 1: Understand the Feature Context

1. Read the feature description thoroughly.
2. Identify which Kaven module(s) this feature belongs to (e.g., billing, auth, spaces, permissions).
3. Check if a similar feature already exists in `squads/` or in the existing codebase.
4. Review related stories in `docs/planning/stories/` for prior context.

### Step 2: Analyze Multi-Tenant Impact

1. Determine if the feature stores tenant-specific data (requires `tenantId` column).
2. Check if the feature needs cross-tenant visibility (admin-only features).
3. Verify that RLS middleware (`prisma-rls.ts`) will correctly scope queries.
4. Assess if tenant isolation could be violated by any proposed data flow.
5. Document findings in the "Multi-Tenant Impact Analysis" section.

### Step 3: Review Middleware Chain Needs

Kaven uses a 10-layer middleware stack. Determine which layers are affected:

1. **Rate Limiting** — Does this feature need custom rate limits?
2. **CORS** — Does this feature expose new origins?
3. **Authentication** — Does this require auth? What type (JWT, API key, public)?
4. **Tenant Resolution** — How is tenantId resolved for this feature?
5. **RBAC** — What roles can access this feature?
6. **Feature Guards** — Should this be behind a feature flag / plan tier?
7. **IDOR Protection** — Does this feature expose resource IDs?
8. **Input Validation** — What Zod schemas are needed?
9. **Audit Logging** — Should actions be audit-logged?
10. **CSRF Protection** — Does this feature have state-changing operations?

### Step 4: Check Feature Flag Requirements

1. Review the 40+ capabilities in the feature flag system.
2. Determine if this feature maps to an existing capability or needs a new one.
3. Define plan-tier access: Starter / Complete / Pro / Enterprise.
4. Specify numeric limits if applicable (e.g., max exports per month).
5. Document the `requireFeature()` middleware configuration.

### Step 5: Identify Schema Changes

1. Review current `schema.base.prisma` and `schema.extended.prisma`.
2. Determine if new models are needed (delegate to `@kaven-db-engineer` if so).
3. Identify new fields on existing models.
4. Define required indexes, especially composite indexes with `tenantId`.
5. Check for new enums or relation changes.
6. Ensure `deletedAt` (soft-delete) is included on any new models.

### Step 6: Map Frontend Components

1. Determine which app is affected: Admin Panel, Tenant App, or both.
2. List new pages needed (route paths).
3. List new components needed (atoms, molecules, organisms).
4. Identify reusable components from `@kaven/ui`.
5. Check i18n translation keys that need to be added.
6. Assess TanStack Query hooks needed for data fetching.

### Step 7: Estimate Complexity

Use the Kaven complexity scale:

| Complexity | Hours | Description |
|------------|-------|-------------|
| XS | 2-4h | Single file change, no schema |
| S | 4-8h | Few files, minor schema change |
| M | 8-16h | Multiple files, schema + API + frontend |
| L | 16-32h | Full feature, multiple modules |
| XL | 32-64h | Epic-level, architectural changes |

### Step 8: Produce the Review Document

Compile all findings into the ARD format. Include:

- Clear recommendation: APPROVE / APPROVE WITH CHANGES / REJECT
- List of blocking concerns (if any)
- Suggested implementation order
- Dependencies on other stories or features
- Risk level: LOW / MEDIUM / HIGH / CRITICAL

### Step 9: Validate and Deliver

1. Cross-reference the review against `03-TRADE-OFFS.md` to ensure alignment with architectural decisions.
2. Verify no conflicts with in-progress sprint work.
3. Save the ARD to `docs/architecture/reviews/ARD-{feature_name}.md`.
4. Notify the requesting agent or developer.
