---
task: createModule()
responsavel: "@kaven-module-creator"
responsavel_type: agent
atomic_layer: task
Entrada:
  - module_name: string
  - features: list # list of features the module provides
  - dependencies: list # other modules this depends on
Saida:
  - module_directory: directory
  - module_json: file
  - backend_routes: list
  - frontend_pages: list
  - prisma_schema: file
  - test_files: list
Checklist:
  - [ ] Create module directory structure
  - [ ] Create backend routes and services
  - [ ] Create frontend pages and components
  - [ ] Create Prisma schema extension
  - [ ] Create module.json with injections and anchors
  - [ ] Add markers for idempotent install/uninstall
  - [ ] Create unit tests
  - [ ] Create security tests
  - [ ] Validate with kaven module doctor
  - [ ] Document module in README
---

# createModule()

Create a complete Kaven module from scratch, including backend API, frontend pages, database schema, CLI markers, and tests — ready for installation via `kaven module add`.

## Usage

```
@kaven-module-creator *task createModule --name "analytics" --features '["dashboard", "events", "reports"]' --dependencies '["auth", "billing"]'
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `module_name` | string | yes | kebab-case module name |
| `features` | list | yes | Features this module provides |
| `dependencies` | list | no | Required modules |

## Output Format

```
modules/{module_name}/
  ├── module.json                    # Module manifest
  ├── README.md                      # Module documentation
  ├── backend/
  │   ├── routes/
  │   │   └── {module}.route.ts
  │   ├── controllers/
  │   │   └── {module}.controller.ts
  │   ├── services/
  │   │   └── {module}.service.ts
  │   └── schemas/
  │       └── {module}.schema.ts
  ├── frontend/
  │   ├── pages/
  │   │   └── {feature}/page.tsx
  │   ├── components/
  │   │   └── {component}.tsx
  │   └── hooks/
  │       └── use-{module}.ts
  ├── prisma/
  │   └── schema.{module}.prisma
  └── tests/
      ├── {module}.service.test.ts
      └── {module}.security.test.ts
```

## Implementation Steps

### Step 1: Create the Module Directory

```bash
mkdir -p modules/{module_name}/{backend/routes,backend/controllers,backend/services,backend/schemas}
mkdir -p modules/{module_name}/{frontend/pages,frontend/components,frontend/hooks}
mkdir -p modules/{module_name}/{prisma,tests}
```

### Step 2: Create module.json

The module manifest describes how `kaven-cli` installs and removes the module:

```json
{
  "name": "analytics",
  "version": "1.0.0",
  "description": "Analytics module with dashboard, events, and reports",
  "author": "Kaven",
  "license": "MIT",
  "dependencies": ["auth", "billing"],
  "features": ["dashboard", "events", "reports"],
  "featureFlags": {
    "analytics_dashboard": { "plans": ["complete", "pro", "enterprise"] },
    "analytics_events": { "plans": ["complete", "pro", "enterprise"] },
    "analytics_reports": { "plans": ["pro", "enterprise"], "limit": 50 }
  },
  "injections": [
    {
      "target": "apps/api/src/app.ts",
      "anchor": "// [KAVEN_MODULE_ROUTES]",
      "content": "fastify.register(import('./modules/analytics/analytics.route'), { prefix: '/api/v1' });"
    },
    {
      "target": "apps/tenant/src/config/navigation.ts",
      "anchor": "// [KAVEN_MODULE_NAV]",
      "content": "{ title: 'Analytics', href: '/analytics', icon: BarChart3 },"
    }
  ],
  "files": {
    "backend": [
      { "src": "backend/routes/{module}.route.ts", "dest": "apps/api/src/modules/analytics/" },
      { "src": "backend/controllers/{module}.controller.ts", "dest": "apps/api/src/modules/analytics/" },
      { "src": "backend/services/{module}.service.ts", "dest": "apps/api/src/modules/analytics/" },
      { "src": "backend/schemas/{module}.schema.ts", "dest": "apps/api/src/modules/analytics/" }
    ],
    "frontend": [
      { "src": "frontend/pages/", "dest": "apps/tenant/src/app/(dashboard)/analytics/" },
      { "src": "frontend/components/", "dest": "apps/tenant/src/components/analytics/" },
      { "src": "frontend/hooks/", "dest": "apps/tenant/src/hooks/" }
    ],
    "prisma": [
      { "src": "prisma/schema.analytics.prisma", "dest": "prisma/extensions/" }
    ]
  }
}
```

### Step 3: Create Backend (API)

Follow the patterns from `addEndpoint()`, `addService()`, and `addMiddleware()` tasks.

**Route file** — Register endpoints with full middleware chain:
```typescript
// [KAVEN_MODULE:analytics BEGIN]
import type { FastifyInstance } from 'fastify';
import { analyticsController } from './analytics.controller';
import { requireAuth } from '@/middleware/auth';
import { requireFeature } from '@/middleware/feature-guard';

export async function analyticsRoutes(fastify: FastifyInstance) {
  fastify.get('/analytics/dashboard', {
    preHandler: [requireAuth(), requireFeature('analytics_dashboard')],
  }, analyticsController.getDashboard);

  fastify.get('/analytics/events', {
    preHandler: [requireAuth(), requireFeature('analytics_events')],
  }, analyticsController.getEvents);

  fastify.get('/analytics/reports', {
    preHandler: [requireAuth(), requireFeature('analytics_reports')],
  }, analyticsController.getReports);
}
// [KAVEN_MODULE:analytics END]
```

Note the `[KAVEN_MODULE:analytics BEGIN/END]` markers — these enable idempotent install/uninstall by the CLI.

### Step 4: Create Frontend Pages

For each feature, create a Next.js page following `addPage()` task patterns:

```tsx
// frontend/pages/dashboard/page.tsx
import { AnalyticsDashboard } from '../../components/analytics-dashboard';

export default function AnalyticsDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
      <AnalyticsDashboard />
    </div>
  );
}
```

### Step 5: Create Prisma Schema Extension

```prisma
// prisma/schema.analytics.prisma

model AnalyticsEvent {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?

  eventName  String
  eventData  Json?
  userId     String?
  sessionId  String?

  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([tenantId, eventName])
  @@index([tenantId, createdAt])
  @@map("analytics_events")
}
```

### Step 6: Add Markers for Idempotent Operations

Every code injection uses markers:

```typescript
// In the target file (e.g., app.ts), the anchor comment exists:
// [KAVEN_MODULE_ROUTES]

// After installation, the module code is wrapped:
// [KAVEN_MODULE:analytics BEGIN]
fastify.register(analyticsRoutes, { prefix: '/api/v1' });
// [KAVEN_MODULE:analytics END]
```

This allows `kaven module remove analytics` to cleanly remove all injected code.

### Step 7: Create Tests

Create unit tests and security tests following `addTest()` task patterns.

### Step 8: Validate with Module Doctor

```bash
kaven module doctor analytics
```

This checks:
- module.json is valid and complete.
- All referenced files exist.
- Markers are correctly formatted.
- Dependencies are available.
- Prisma schema is valid.
- Feature flags are registered.

### Step 9: Test Install/Uninstall Cycle

```bash
# Install
kaven module add analytics

# Verify
kaven module list  # Should show analytics as installed
pnpm prisma generate  # Should include new models
pnpm test  # Should pass

# Uninstall
kaven module remove analytics

# Verify clean removal
kaven module list  # Should not show analytics
pnpm test  # Should still pass
```
