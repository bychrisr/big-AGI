# Kaven Framework — Feature Flags & Capabilities

> Complete list of 40+ feature capabilities with plan-level defaults.
> Enforcement via `requireFeature()` middleware.

---

## Overview

Feature flags in Kaven use the `Capability` model with two types:
- **BOOLEAN**: Feature is enabled or disabled
- **NUMERIC**: Feature has a usage limit per billing period

Each capability has plan-level defaults that can be overridden per-tenant via `Grant` records.

---

## Boolean Capabilities

| # | Code | Description | Starter | Complete | Pro | Enterprise |
|---|------|-------------|:-------:|:--------:|:---:|:----------:|
| 1 | `PROJECTS` | Access to project management | Yes | Yes | Yes | Yes |
| 2 | `INVOICING` | Access to invoicing system | Yes | Yes | Yes | Yes |
| 3 | `ORDERS` | Access to order management | Yes | Yes | Yes | Yes |
| 4 | `TEAM_MEMBERS` | Invite and manage team members | Yes | Yes | Yes | Yes |
| 5 | `SPACES` | Organize projects into spaces | No | Yes | Yes | Yes |
| 6 | `TASKS` | Task management within projects | Yes | Yes | Yes | Yes |
| 7 | `CUSTOM_DOMAIN` | Use custom domain for tenant app | No | Yes | Yes | Yes |
| 8 | `API_ACCESS` | External API access (REST) | No | Yes | Yes | Yes |
| 9 | `WEBHOOKS` | Webhook configuration and delivery | No | Yes | Yes | Yes |
| 10 | `AUDIT_LOGS` | Access to audit log viewer | No | Yes | Yes | Yes |
| 11 | `SECURITY_LOGS` | Access to security audit logs | No | Yes | Yes | Yes |
| 12 | `TWO_FACTOR_AUTH` | Enable 2FA for users | Yes | Yes | Yes | Yes |
| 13 | `SSO_SAML` | SAML SSO integration | No | No | Yes | Yes |
| 14 | `SSO_OIDC` | OpenID Connect SSO | No | No | Yes | Yes |
| 15 | `ADVANCED_ANALYTICS` | Advanced reporting and analytics | No | No | Yes | Yes |
| 16 | `CUSTOM_ROLES` | Create custom roles beyond defaults | No | Yes | Yes | Yes |
| 17 | `IP_WHITELIST` | IP-based access restrictions | No | No | Yes | Yes |
| 18 | `DATA_EXPORT` | Export data (CSV, JSON, PDF) | Yes | Yes | Yes | Yes |
| 19 | `DATA_IMPORT` | Bulk data import | No | Yes | Yes | Yes |
| 20 | `THEME_CUSTOMIZATION` | Customize tenant app theme/branding | No | Yes | Yes | Yes |
| 21 | `WHITE_LABEL` | Remove Kaven branding entirely | No | No | No | Yes |
| 22 | `MARKETPLACE_ACCESS` | Install modules from marketplace | No | No | Yes | Yes |
| 23 | `EMAIL_TEMPLATES` | Custom email templates | No | Yes | Yes | Yes |
| 24 | `NOTIFICATIONS` | In-app notification system | Yes | Yes | Yes | Yes |
| 25 | `FILE_STORAGE` | File upload and storage | Yes | Yes | Yes | Yes |
| 26 | `MULTI_CURRENCY` | Support multiple currencies | No | Yes | Yes | Yes |
| 27 | `TAX_MANAGEMENT` | Tax calculation and management | No | Yes | Yes | Yes |
| 28 | `RECURRING_INVOICES` | Auto-generate recurring invoices | No | Yes | Yes | Yes |
| 29 | `PAYMENT_REMINDERS` | Automated payment reminder emails | No | Yes | Yes | Yes |
| 30 | `PRIORITY_SUPPORT` | Priority support queue | No | No | Yes | Yes |
| 31 | `SANDBOX_MODE` | Test environment per tenant | No | No | Yes | Yes |
| 32 | `ACTIVITY_FEED` | Activity feed / timeline | Yes | Yes | Yes | Yes |
| 33 | `COMMENTS` | Comments on resources | Yes | Yes | Yes | Yes |
| 34 | `MENTIONS` | @mentions in comments | No | Yes | Yes | Yes |
| 35 | `RESALE_LICENSE` | License to resell as own product | No | No | No | Yes |

---

## Numeric Capabilities

| # | Code | Description | Starter | Complete | Pro | Enterprise |
|---|------|-------------|:-------:|:--------:|:---:|:----------:|
| 36 | `MAX_TENANTS` | Maximum tenants per license | 10 | Unlimited | Unlimited | Unlimited |
| 37 | `MAX_PROJECTS` | Projects per tenant | 5 | 50 | Unlimited | Unlimited |
| 38 | `MAX_TEAM_MEMBERS` | Team members per tenant | 5 | 25 | 100 | Unlimited |
| 39 | `MAX_STORAGE_GB` | Storage in GB per tenant | 5 | 50 | 500 | Custom |
| 40 | `MAX_API_CALLS_MONTH` | API calls per month per tenant | 10,000 | 100,000 | 1,000,000 | Unlimited |
| 41 | `MAX_WEBHOOKS` | Active webhook endpoints | 0 | 5 | 25 | Unlimited |
| 42 | `MAX_CUSTOM_ROLES` | Custom roles per tenant | 0 | 5 | 20 | Unlimited |
| 43 | `MAX_FILE_SIZE_MB` | Max single file upload size | 10 | 50 | 200 | 500 |
| 44 | `MAX_INVOICES_MONTH` | Invoices generated per month | 50 | 500 | Unlimited | Unlimited |
| 45 | `MAX_ORDERS_MONTH` | Orders processed per month | 50 | 500 | Unlimited | Unlimited |
| 46 | `MAX_EMAIL_TEMPLATES` | Custom email templates | 0 | 10 | 50 | Unlimited |
| 47 | `MAX_SPACES` | Spaces per tenant | 0 | 10 | Unlimited | Unlimited |
| 48 | `MAX_TASKS_PER_PROJECT` | Tasks per project | 100 | 1,000 | Unlimited | Unlimited |

> "Unlimited" is implemented as `Number.MAX_SAFE_INTEGER` (9,007,199,254,740,991)

---

## Enforcement Examples

### Boolean Feature Check
```typescript
// Route-level: Block entire endpoint
app.get('/api/audit-logs', {
  preHandler: [authMiddleware, requireFeature('AUDIT_LOGS')]
}, auditLogController.list);

// Response: 403
{
  "error": "Feature not available",
  "message": "AUDIT_LOGS is not available on your current plan (STARTER). Upgrade to COMPLETE or higher.",
  "code": "FEATURE_NOT_AVAILABLE",
  "requiredPlan": "COMPLETE"
}
```

### Numeric Limit Check
```typescript
// Route-level: Check and increment usage
app.post('/api/projects', {
  preHandler: [authMiddleware, requireFeature('MAX_PROJECTS')]
}, projectController.create);

// When within limit: passes through, usage incremented
// When at limit: 429
{
  "error": "Usage limit exceeded",
  "message": "You have reached the maximum number of projects (5) for your plan (STARTER). Upgrade to COMPLETE for up to 50 projects.",
  "code": "USAGE_LIMIT_EXCEEDED",
  "current": 5,
  "limit": 5,
  "requiredPlan": "COMPLETE"
}
```

### Usage Tracking
```typescript
// Automatic tracking via middleware
// Manual tracking for non-route operations
await usageTrackingService.increment(tenantId, 'MAX_API_CALLS_MONTH');
await usageTrackingService.decrement(tenantId, 'MAX_PROJECTS'); // On project deletion

// Check usage without incrementing
const usage = await usageTrackingService.getUsage(tenantId, 'MAX_PROJECTS');
// { current: 3, limit: 5, percentage: 60 }
```

### Per-Tenant Override via Grants
```typescript
// Grant a specific tenant extra projects (override plan default)
await prisma.grant.create({
  data: {
    tenantId: 'tenant-123',
    userId: 'admin-user-id', // tenant admin who receives the grant
    capabilityId: 'cap-max-projects',
    value: 100, // Override: 100 instead of plan default (5)
    grantedBy: 'super-admin-id',
  },
});
```

### Approaching Limit Warning
```typescript
// UsageTracking service emits event at 80% threshold
usageTrackingService.on('usage.limit.approaching', (data) => {
  // data: { tenantId, feature, current, limit, percentage: 80 }
  notificationService.send(tenantId, {
    type: 'WARNING',
    title: 'Usage limit approaching',
    body: `You have used ${data.current} of ${data.limit} ${data.feature}.`,
  });
});
```

---

## Plan Comparison Matrix

| Category | Starter ($149) | Complete ($399) | Pro ($799) | Enterprise |
|----------|:-:|:-:|:-:|:-:|
| **Core Features** | 17/35 | 30/35 | 33/35 | 35/35 |
| **Boolean Features** | Basic | Full | Full + SSO | All + White-label |
| **Numeric Limits** | Constrained | Generous | High | Unlimited/Custom |
| **Support** | Community | Email | Priority | Dedicated |
| **Projects** | 5 | 50 | Unlimited | Unlimited |
| **Team** | 5 | 25 | 100 | Unlimited |
| **Storage** | 5 GB | 50 GB | 500 GB | Custom |
| **API Calls** | 10k/mo | 100k/mo | 1M/mo | Unlimited |

---

## Implementation Notes

### Capability Seeding
Capabilities are seeded in `packages/database/prisma/seed.ts` with default values per plan. The seed script creates all 48 capabilities on first run.

### Cache Strategy
- Capabilities are cached in Redis with 5-minute TTL
- Cache key: `capability:${tenantId}:${code}`
- Cache invalidated on Grant create/update/delete
- Plan change invalidates all tenant capabilities

### Migration Path
When a tenant upgrades/downgrades:
1. Update `Tenant.plan` field
2. Invalidate capability cache
3. UsageTracking limits updated automatically (read from plan defaults)
4. Existing grants are preserved (they override plan defaults)
5. If downgrading, existing usage above new limit is grandfathered until period reset
