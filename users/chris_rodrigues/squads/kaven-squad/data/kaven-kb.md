# Kaven Framework Knowledge Base

> Complete reference for all agents working on the Kaven Framework.
> Last updated: 2026-02-15

---

## 1. Architecture Overview

### Monorepo Structure
- **Build system**: Turborepo + pnpm workspaces
- **Package manager**: pnpm 9.x (strict, hoisted node_modules)
- **Node version**: 20.x LTS

### Applications (4 apps)

| App | Stack | Port | Purpose |
|-----|-------|------|---------|
| `apps/api` | Fastify 5.6 | 8000 | REST API, business logic, auth, webhooks |
| `apps/admin` | Next.js 16 (App Router) | 3000 | Admin Panel — platform management |
| `apps/tenant` | Next.js 16 (App Router) | 3001 | Tenant App — end-user SaaS interface |
| `apps/docs` | Nextra | 3002 | Developer documentation site |

### Packages (3 shared)

| Package | Purpose |
|---------|---------|
| `packages/database` | Prisma schema, client, migrations, seeds |
| `packages/ui` | Design System — 76+ components (Radix UI + shadcn/ui) |
| `packages/shared` | Zod schemas, DTOs, type definitions, constants |

### Infrastructure (Docker Compose)
- **13+ containers**: PostgreSQL 17, Redis 7, Mailhog, Prometheus, Grafana, Loki, Promtail, cAdvisor, Node Exporter, Alertmanager, API, Admin, Tenant
- **Volumes**: Persistent for PostgreSQL data, Redis data, Prometheus data, Grafana data
- **Networks**: `kaven-network` (bridge)

---

## 2. Multi-Tenancy System

### Core Principle
Every data model has a `tenantId` field (except `Tenant` itself). All queries are automatically scoped to the current tenant.

### RLS Middleware (`prisma-rls.ts`)
- Intercepts all Prisma operations (findMany, findFirst, create, update, delete)
- Auto-injects `WHERE tenantId = currentTenantId` on reads
- Auto-sets `tenantId` on creates
- Prevents cross-tenant data access at the ORM level

### Tenant Context
```typescript
// Usage pattern
const result = await withTenantContext(prisma, tenantId, async (scopedPrisma) => {
  return scopedPrisma.invoice.findMany(); // automatically filtered by tenantId
});
```

### Tenant Detection (priority order)
1. **Subdomain**: `acme.app.kaven.dev` -> tenantSlug = "acme"
2. **Custom domain**: `billing.acme.com` -> lookup in Tenant.customDomain
3. **Header**: `X-Tenant-ID: uuid` -> direct tenantId
4. **Query param**: `?tenantId=uuid` (dev only)

### Single-Tenant Mode
- `SINGLE_TENANT=true` environment variable
- Skips tenant detection, uses default tenant
- Useful for self-hosted deployments

---

## 3. Security Architecture (10-Layer Middleware Stack)

Each request passes through these layers in order:

| # | Layer | Library | Purpose |
|---|-------|---------|---------|
| 1 | CORS | `@fastify/cors` | Origin whitelist validation |
| 2 | Helmet | `@fastify/helmet` | Security headers (CSP, HSTS, X-Frame) |
| 3 | CSRF | Custom | Origin/Referer header check |
| 4 | Rate Limit | `@fastify/rate-limit` | IP-based throttling (100/min default) |
| 5 | Auth | Custom + `jose` | JWT access token validation |
| 6 | Tenant | Custom | tenantId injection from token/header |
| 7 | RBAC | Custom | Role-based access (SUPER_ADMIN, TENANT_ADMIN, USER) |
| 8 | Capability | Custom | Feature flag enforcement (40+ capabilities) |
| 9 | IDOR | Custom | Resource ownership verification |
| 10 | Business | Controllers | Actual route handler logic |

### Bypass Rules
- Health check (`/health`, `/ready`) bypasses all middleware
- Public routes (`/auth/login`, `/auth/register`) bypass layers 5-9
- Webhook routes (`/webhooks/*`) bypass CSRF, use signature verification instead

---

## 4. Database Schema

### Overview
- **54 Prisma models**, **28 enums**
- **Schema split architecture**: `schema.base.prisma` (core, immutable) + `schema.extended.prisma` (features, customizable)
- **Merge process**: Script merges both files into `schema.prisma` before generate/migrate

### Key Models by Domain

**Core:**
- `Tenant` — id, name, slug, customDomain, plan, status, settings, deletedAt
- `User` — id, tenantId, email, name, passwordHash, role, twoFactorSecret, emailVerified, deletedAt
- `Role` — id, tenantId, name, permissions
- `Grant` — id, tenantId, userId, capability, value
- `Capability` — id, code, description, type (BOOLEAN/NUMERIC), defaultValue
- `Policy` — id, tenantId, type (MFA/IP_WHITELIST/TIME_RESTRICTION), config

**Auth:**
- `RefreshToken` — id, tenantId, userId, token, expiresAt, revokedAt
- `PasswordReset` — id, tenantId, userId, token, expiresAt, usedAt
- `SecurityAuditLog` — id, tenantId, userId, action, ipAddress, userAgent, metadata

**Billing:**
- `Invoice` — id, tenantId, number, status, amount, currency, dueDate, paidAt, deletedAt
- `Order` — id, tenantId, number, status, total, items, deletedAt
- `Subscription` — id, tenantId, planId, status, currentPeriodStart, currentPeriodEnd, deletedAt
- `Plan` — id, name, price, interval, features, limits
- `Product` — id, tenantId, name, price, description, sku
- `Payment` — id, tenantId, invoiceId, amount, method, status, gateway, externalId

**Features:**
- `Space` — id, tenantId, name, description, settings
- `Project` — id, tenantId, spaceId, name, status, settings
- `Task` — id, tenantId, projectId, title, description, status, assigneeId, dueDate
- `Feature` — id, code, name, description, enabled
- `UsageTracking` — id, tenantId, feature, currentUsage, limit, period

**System:**
- `AuditLog` — id, tenantId, userId, entity, entityId, action, before, after, timestamp
- `UserPreference` — id, tenantId, userId, key, value
- `Notification` — id, tenantId, userId, type, title, body, readAt

### Indexes
All tenant-scoped models have composite indexes: `@@index([tenantId, <primary_lookup_field>])`

### Soft Delete
Models with `deletedAt: DateTime?`: User, Tenant, Subscription, Invoice, Order
- `prisma-soft-delete.ts` middleware auto-adds `WHERE deletedAt IS NULL` to reads

---

## 5. Authentication & Authorization

### JWT Flow
1. User logs in with email/password
2. Server validates credentials, returns `accessToken` (15-60min) + `refreshToken` (7-30 days)
3. Access token: Signed with `jose` library, contains userId, tenantId, role
4. Refresh token: Stored in DB (`RefreshToken` model), httpOnly cookie
5. Token refresh: Client sends expired access token + valid refresh token -> new pair

### Two-Factor Authentication (2FA)
- Library: `speakeasy` (TOTP)
- Flow: User enables 2FA -> server generates secret -> user scans QR -> verifies with TOTP code
- Stored: `User.twoFactorSecret` (encrypted)

### Role Hierarchy
```
SUPER_ADMIN (platform-wide)
  └── TENANT_ADMIN (per-tenant)
        └── USER (basic access)
```

### Capabilities (40+ granular permissions)
- Boolean: `PROJECTS`, `INVOICING`, `TEAM_MEMBERS`, `CUSTOM_DOMAIN`, `API_ACCESS`, etc.
- Numeric: `MAX_PROJECTS`, `MAX_TEAM_MEMBERS`, `MAX_STORAGE_GB`, `MAX_API_CALLS_MONTH`, etc.
- Enforcement: `requireFeature('PROJECTS')` middleware on route

### Policies
- `MFA_ENFORCEMENT` — Force 2FA for all users
- `IP_WHITELIST` — Allow access only from listed IPs
- `TIME_RESTRICTION` — Allow access only during business hours

---

## 6. Feature Flags & Plans

### Plan Tiers

| Feature | Starter ($149) | Complete ($399) | Pro ($799) | Enterprise |
|---------|:-:|:-:|:-:|:-:|
| Tenants | 10 | Unlimited | Unlimited | Unlimited |
| Projects per tenant | 5 | 50 | Unlimited | Unlimited |
| Team members | 5 | 25 | 100 | Unlimited |
| Storage (GB) | 5 | 50 | 500 | Custom |
| API calls/month | 10k | 100k | 1M | Unlimited |
| Custom domain | No | Yes | Yes | Yes |
| White-label | No | No | No | Yes |
| Marketplace access | No | No | Yes | Yes |
| Priority support | No | No | Yes | Yes |

### Enforcement
```typescript
// Route-level enforcement
app.get('/projects', {
  preHandler: [authMiddleware, requireFeature('PROJECTS')]
}, projectController.list);

// Numeric limit check
app.post('/projects', {
  preHandler: [authMiddleware, requireFeature('MAX_PROJECTS')]
}, projectController.create);
```

### UsageTracking
- Tracks current usage per tenant per feature per billing period
- Auto-resets at period boundary
- Emits `usage.limit.approaching` event at 80% threshold
- Blocks at 100% with HTTP 429

---

## 7. Payment Integration

### Three Gateways

| Gateway | Purpose | Status |
|---------|---------|--------|
| **Stripe** | International payments, subscriptions | Integrated |
| **Paddle** | Marketplace licensing, tax compliance | Planned (Sprint 3+) |
| **PagueBit** | Brazilian PIX -> crypto conversion | Planned (Sprint 3+) |

### Stripe Integration
- Webhook: `/webhooks/stripe` (signature verification via `stripe.webhooks.constructEvent`)
- Events: `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Sync: Stripe subscription -> local Subscription model

---

## 8. Email Infrastructure

| Provider | Purpose | Environment |
|----------|---------|-------------|
| **Postmark** | Transactional (welcome, reset, invoice) | Production |
| **Resend** | Marketing (newsletters, announcements) | Production |
| **AWS SES** | Bulk (reports, batch notifications) | Production |
| **Nodemailer** | SMTP fallback | All |
| **Mailhog** | Email capture for testing | Development (port 8025) |

### Email Templates
- Located in `apps/api/src/templates/email/`
- MJML-based responsive templates
- Variables: `{{userName}}`, `{{tenantName}}`, `{{actionUrl}}`, etc.

---

## 9. Design System (`@kaven/ui`)

### Component Hierarchy
- **76+ base components** following Atomic Design
- **Foundation**: Radix UI primitives + shadcn/ui patterns
- **Styling**: TailwindCSS 4 + CSS variables for theming

### Component Categories
- **Atoms**: Button, Input, Select, Textarea, Card, Badge, Avatar, Checkbox, Switch, Label, Separator, Skeleton, Tooltip
- **Molecules**: FormField, SearchInput, PaginationControl, DatePicker, ColorPicker, FileUpload
- **Organisms**: DataTable, SidebarNav, AppHeader, CommandPalette, NotificationCenter
- **Templates**: DashboardTemplate, AuthTemplate, SettingsTemplate, OnboardingTemplate

### Theming
- CSS variables: `--primary`, `--secondary`, `--accent`, `--background`, `--foreground`, etc.
- Dark mode: `class="dark"` on `<html>` + `dark:` Tailwind variants
- Glassmorphism: `backdrop-blur` + `bg-opacity` patterns
- Per-tenant theme: Tenant.settings.theme overrides CSS variables

### Internationalization
- Library: `next-intl`
- Languages: English (EN), Portuguese Brazil (PT-BR)
- Files: `messages/en.json`, `messages/pt-BR.json`

---

## 10. Testing Strategy

### Test Suite Overview
- **885+ tests** across **46 files**
- **Framework**: Vitest
- **Coverage targets**: Lines >= 80%, Functions >= 80%, Branches >= 75%

### Test Categories

| Category | Files | Focus |
|----------|-------|-------|
| Unit | `*.test.ts` | Service logic, utilities, validators |
| Integration | `*.integration.test.ts` | API endpoints, DB queries |
| Security | `security/*.test.ts` | IDOR, CSRF, SQLi, XSS |
| GDPR | `gdpr/*.test.ts` | Erasure, access, portability, consent |
| Multi-tenant | `multi-tenant/*.test.ts` | Tenant isolation, cross-tenant prevention |

### Quality Gates (ordered)
1. `pnpm lint` — ESLint + Prettier
2. `pnpm typecheck` — TypeScript strict mode
3. `pnpm test` — Full Vitest suite
4. `pnpm test:security` — Security-specific tests
5. `pnpm test:gdpr` — GDPR compliance tests

---

## 11. CI/CD

### GitHub Actions Pipeline
- **Triggers**: Push/PR to `main` or `staging`
- **Matrix**: Node 20.x
- **Services**: PostgreSQL 17, Redis 7

### Pipeline Steps
1. Checkout code
2. Setup pnpm + Node.js
3. Install dependencies (`pnpm install --frozen-lockfile`)
4. Generate Prisma Client (`pnpm db:generate`)
5. Run migrations (`pnpm db:migrate`)
6. Lint (`pnpm lint`)
7. Policy checks (security headers, etc.)
8. Typecheck (`pnpm typecheck`)
9. Test (`pnpm test`)

### Branch Protection
- `main`: Requires PR, 1 approval, CI green, no force push
- `staging`: Requires CI green

---

## 12. CLI Module System

### Markers (idempotent injection)
```typescript
// [KAVEN_MODULE:payments BEGIN]
import { PaymentService } from './modules/payments';
app.register(paymentRoutes);
// [KAVEN_MODULE:payments END]
```

### Anchors (injection points)
```typescript
// [ANCHOR:ROUTES] — Route registration point
// [ANCHOR:MIDDLEWARE] — Middleware registration point
// [ANCHOR:NAV_ITEMS] — Navigation items injection
// [ANCHOR:PROVIDERS] — React context providers
```

### module.json Structure
```json
{
  "name": "payments",
  "version": "1.0.0",
  "files": ["src/modules/payments/"],
  "injections": [
    { "target": "src/index.ts", "anchor": "ROUTES", "content": "..." }
  ],
  "dependencies": { "stripe": "^14.0.0" },
  "scripts": { "migrate": "prisma migrate dev" },
  "env": { "STRIPE_SECRET_KEY": "" }
}
```

### CLI Commands
```bash
kaven module add payments     # Install module
kaven module remove payments  # Uninstall module
kaven module doctor           # Verify module integrity
kaven module list             # List installed modules
```

### Transactional Operations
- Backup before install/remove
- Rollback on failure
- Verify markers integrity after operation

---

## 13. Key Files Reference

### API (`apps/api/src/`)
| File | Purpose |
|------|---------|
| `index.ts` | App entry point, plugin registration |
| `middleware/auth.middleware.ts` | JWT validation |
| `middleware/tenant.middleware.ts` | Tenant context injection |
| `middleware/prisma-rls.ts` | Row-level security |
| `middleware/prisma-soft-delete.ts` | Soft delete filter |
| `middleware/feature-guard.middleware.ts` | Feature flag enforcement |
| `middleware/rbac.middleware.ts` | Role-based access control |
| `middleware/idor.middleware.ts` | Ownership verification |
| `routes/` | Route definitions per domain |
| `services/` | Business logic services |
| `controllers/` | Request handlers |

### Frontend (`apps/admin/`, `apps/tenant/`)
| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout with providers |
| `app/(dashboard)/` | Authenticated dashboard routes |
| `app/(auth)/` | Login, register, forgot-password |
| `components/` | App-specific components |
| `lib/api.ts` | API client configuration |
| `lib/auth.ts` | Auth utilities |

### Packages
| File | Purpose |
|------|---------|
| `packages/database/prisma/schema.base.prisma` | Core schema (immutable) |
| `packages/database/prisma/schema.extended.prisma` | Feature schema (customizable) |
| `packages/database/prisma/seed.ts` | Database seeding |
| `packages/ui/src/index.ts` | Component exports |
| `packages/shared/src/schemas/` | Zod validation schemas |
| `packages/shared/src/types/` | TypeScript type definitions |

---

## 14. Commands Quick Reference

```bash
# Setup
pnpm setup              # Full project setup (install + generate + migrate + seed)
pnpm install             # Install dependencies only

# Development
pnpm dev                # Start all apps in parallel
pnpm dev --filter api   # Start only API
pnpm dev --filter admin # Start only Admin Panel
pnpm dev --filter tenant # Start only Tenant App

# Database
pnpm db:generate        # Generate Prisma Client from schema
pnpm db:migrate         # Run pending migrations
pnpm db:migrate:reset   # Reset DB and rerun all migrations
pnpm db:seed            # Seed database with test data
pnpm db:studio          # Open Prisma Studio (visual DB browser)

# Quality
pnpm lint               # ESLint + Prettier check
pnpm lint:fix           # Auto-fix lint issues
pnpm typecheck          # TypeScript strict compilation check
pnpm quality            # lint + typecheck + test (full pipeline)

# Testing
pnpm test               # Run all tests
pnpm test:security      # Security test suite only
pnpm test:gdpr          # GDPR compliance tests only
pnpm test:coverage      # Tests with coverage report

# Infrastructure
pnpm docker:up          # Start Docker Compose (all containers)
pnpm docker:down        # Stop Docker Compose
pnpm docker:logs        # Tail container logs

# Build
pnpm build              # Build all apps for production
pnpm build --filter api # Build only API
```

---

## 15. Environment Variables

### Required
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/kaven
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
```

### Optional
```env
# Tenant
SINGLE_TENANT=false
DEFAULT_TENANT_ID=uuid

# Email
POSTMARK_API_KEY=
RESEND_API_KEY=
AWS_SES_REGION=
SMTP_HOST=localhost
SMTP_PORT=1025

# Payments
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
PADDLE_API_KEY=

# Observability
SENTRY_DSN=
PROMETHEUS_ENABLED=true

# Telemetry
KAVEN_TELEMETRY=1

# Dev
NODE_ENV=development
LOG_LEVEL=debug
```

---

## 16. Observability Stack

### Monitoring
- **Prometheus** (port 9090): Metrics collection, alerting rules
- **Grafana** (port 3003): Dashboards, visualization
- **Loki** + **Promtail**: Log aggregation and querying
- **cAdvisor**: Container metrics
- **Node Exporter**: Host metrics

### Application-Level
- **Winston**: Structured JSON logging
- **Sentry**: Error tracking, performance monitoring
- **Custom metrics**: Request duration, active tenants, feature usage, error rates

### Key Metrics
- `http_request_duration_seconds` — Request latency histogram
- `http_requests_total` — Request counter by method/route/status
- `active_tenants_gauge` — Currently active tenants
- `feature_usage_counter` — Feature capability usage
- `auth_failures_total` — Authentication failure counter

---

## 17. Development Workflow

### Branch Naming
- `feat/description` — New features
- `fix/description` — Bug fixes
- `chore/description` — Maintenance, deps, config
- `docs/description` — Documentation only

### Commit Convention
```
feat: implement invoice history page [STORY-008]
fix: correct tenant isolation in orders query
chore: update dependencies to latest versions
docs: add API endpoint documentation
test: add IDOR protection tests for payments
```

### PR Requirements
- Branch from `main`
- CI must be green
- At least 1 approval
- No force push to `main`
- Evidence bundle attached (diffs, test results, quality gates)
