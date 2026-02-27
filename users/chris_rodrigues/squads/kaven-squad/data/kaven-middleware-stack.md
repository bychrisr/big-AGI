# Kaven Framework — 10-Layer Middleware Stack

> Detailed documentation of each security middleware layer.
> Every HTTP request passes through these layers in order (top to bottom).

---

## Layer 1: CORS

| Property | Value |
|----------|-------|
| **Purpose** | Validate request origins, prevent cross-origin attacks |
| **Library** | `@fastify/cors` |
| **File** | `apps/api/src/plugins/cors.ts` |
| **Config** | Whitelist of allowed origins from `CORS_ORIGINS` env var |
| **Bypass** | None — all requests pass through CORS |
| **Error** | HTTP 403 `Origin not allowed` |
| **Testing** | Verify blocked origins return 403; allowed origins pass; preflight OPTIONS works |

### Configuration
```typescript
app.register(cors, {
  origin: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
});
```

---

## Layer 2: Helmet

| Property | Value |
|----------|-------|
| **Purpose** | Set security HTTP headers (CSP, HSTS, X-Frame-Options, etc.) |
| **Library** | `@fastify/helmet` |
| **File** | `apps/api/src/plugins/helmet.ts` |
| **Config** | Strict CSP, HSTS 1 year, X-Frame DENY, noSniff, referrerPolicy |
| **Bypass** | None — all responses get security headers |
| **Error** | N/A (response headers only) |
| **Testing** | Verify all security headers present in responses |

### Headers Set
```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 0
Referrer-Policy: strict-origin-when-cross-origin
```

---

## Layer 3: CSRF Protection

| Property | Value |
|----------|-------|
| **Purpose** | Prevent Cross-Site Request Forgery attacks |
| **Library** | Custom implementation |
| **File** | `apps/api/src/middleware/csrf.middleware.ts` |
| **Config** | Validates Origin and Referer headers against allowed origins |
| **Bypass** | GET/HEAD/OPTIONS requests; webhook routes (`/webhooks/*`) |
| **Error** | HTTP 403 `CSRF validation failed` |
| **Testing** | Send POST with mismatched Origin; verify 403 response |

### Logic
```typescript
// For state-changing methods (POST, PUT, PATCH, DELETE):
// 1. Check Origin header matches allowed origins
// 2. If no Origin, check Referer header
// 3. If neither present or mismatch, reject with 403
```

---

## Layer 4: Rate Limiting

| Property | Value |
|----------|-------|
| **Purpose** | Prevent abuse, DDoS mitigation, brute force protection |
| **Library** | `@fastify/rate-limit` |
| **File** | `apps/api/src/plugins/rate-limit.ts` |
| **Config** | 100 requests/minute per IP (default), customizable per route |
| **Bypass** | Trusted IPs in `RATE_LIMIT_WHITELIST` |
| **Error** | HTTP 429 `Too Many Requests` with `Retry-After` header |
| **Testing** | Send 101 requests in 1 minute; verify 429 on request 101 |

### Per-Route Overrides
```typescript
// Auth routes — stricter limits
'/auth/login':    { max: 10, timeWindow: '1 minute' }
'/auth/register': { max: 5, timeWindow: '1 minute' }
'/auth/reset':    { max: 3, timeWindow: '1 minute' }

// API routes — standard limits
'/api/*':         { max: 100, timeWindow: '1 minute' }

// Webhook routes — higher limits
'/webhooks/*':    { max: 500, timeWindow: '1 minute' }
```

---

## Layer 5: Authentication

| Property | Value |
|----------|-------|
| **Purpose** | Validate JWT access tokens, extract user identity |
| **Library** | `jose` (JSON Object Signing and Encryption) |
| **File** | `apps/api/src/middleware/auth.middleware.ts` |
| **Config** | JWT_SECRET, token expiry (15-60min configurable) |
| **Bypass** | Public routes: `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/health`, `/ready`, `/webhooks/*` |
| **Error** | HTTP 401 `Unauthorized` or `Token expired` |
| **Testing** | Send request without token (401); with expired token (401); with valid token (passes) |

### Token Extraction
```typescript
// Priority order:
// 1. Authorization: Bearer <token>
// 2. Cookie: access_token=<token>
// 3. Query param: ?token=<token> (dev only, NODE_ENV=development)
```

### Token Payload
```typescript
interface JwtPayload {
  sub: string;       // userId
  tenantId: string;
  role: UserRole;
  email: string;
  iat: number;
  exp: number;
}
```

---

## Layer 6: Tenant Context

| Property | Value |
|----------|-------|
| **Purpose** | Inject tenantId into request context for downstream use |
| **Library** | Custom implementation |
| **File** | `apps/api/src/middleware/tenant.middleware.ts` |
| **Config** | SINGLE_TENANT mode flag, DEFAULT_TENANT_ID |
| **Bypass** | Platform-level routes (SUPER_ADMIN only), public routes |
| **Error** | HTTP 400 `Tenant not found` or HTTP 403 `Tenant access denied` |
| **Testing** | Verify correct tenant resolved from subdomain/header/token |

### Resolution Order
```typescript
// 1. JWT token payload (tenantId from auth)
// 2. X-Tenant-ID header
// 3. Subdomain extraction (acme.app.kaven.dev → acme)
// 4. Custom domain lookup (billing.acme.com → tenant)
// 5. SINGLE_TENANT mode → DEFAULT_TENANT_ID
```

---

## Layer 7: RBAC (Role-Based Access Control)

| Property | Value |
|----------|-------|
| **Purpose** | Enforce role-based permissions on routes |
| **Library** | Custom implementation |
| **File** | `apps/api/src/middleware/rbac.middleware.ts` |
| **Config** | Role requirements declared per route |
| **Bypass** | Routes without `requireRole()` decorator |
| **Error** | HTTP 403 `Insufficient permissions` |
| **Testing** | USER accessing TENANT_ADMIN route (403); TENANT_ADMIN accessing USER route (passes) |

### Usage
```typescript
// Route-level declaration
app.get('/admin/settings', {
  preHandler: [authMiddleware, requireRole('TENANT_ADMIN')]
}, settingsController.get);

// Role hierarchy: SUPER_ADMIN > TENANT_ADMIN > USER
// Higher roles automatically have lower role access
```

---

## Layer 8: Capability Guard (Feature Flags)

| Property | Value |
|----------|-------|
| **Purpose** | Enforce feature flags and usage limits per tenant plan |
| **Library** | Custom implementation |
| **File** | `apps/api/src/middleware/feature-guard.middleware.ts` |
| **Config** | Capability definitions in DB, plan-based defaults |
| **Bypass** | SUPER_ADMIN has all capabilities; routes without `requireFeature()` |
| **Error** | HTTP 403 `Feature not available` or HTTP 429 `Usage limit exceeded` |
| **Testing** | Starter plan accessing Pro feature (403); within limit (passes); at limit (429) |

### Usage
```typescript
// Boolean capability check
app.post('/api/webhooks', {
  preHandler: [authMiddleware, requireFeature('WEBHOOKS')]
}, webhookController.create);

// Numeric limit check (auto-increments usage)
app.post('/api/projects', {
  preHandler: [authMiddleware, requireFeature('MAX_PROJECTS')]
}, projectController.create);
```

---

## Layer 9: IDOR Protection

| Property | Value |
|----------|-------|
| **Purpose** | Verify resource ownership, prevent unauthorized access to other users/tenants resources |
| **Library** | Custom implementation |
| **File** | `apps/api/src/middleware/idor.middleware.ts` |
| **Config** | Resource ownership rules per model |
| **Bypass** | SUPER_ADMIN can access any resource; list endpoints (filtered by RLS) |
| **Error** | HTTP 404 `Resource not found` (intentionally not 403 to prevent enumeration) |
| **Testing** | User A accessing User B resource (404); User A accessing own resource (passes) |

### Logic
```typescript
// For single-resource endpoints (GET/PUT/DELETE /:id):
// 1. Load resource by ID
// 2. Check resource.tenantId === request.tenantId
// 3. For user-scoped resources: check resource.userId === request.userId
// 4. If mismatch, return 404 (not 403)
```

---

## Layer 10: Business Logic

| Property | Value |
|----------|-------|
| **Purpose** | Execute actual route handler (controllers/services) |
| **Library** | N/A — application code |
| **File** | `apps/api/src/controllers/`, `apps/api/src/services/` |
| **Config** | N/A |
| **Bypass** | N/A |
| **Error** | Varies by endpoint (400, 404, 409, 422, 500) |
| **Testing** | Unit tests for services, integration tests for controllers |

---

## Middleware Registration Order

```typescript
// apps/api/src/index.ts (simplified)

// 1-2. Security plugins (registered as Fastify plugins)
await app.register(corsPlugin);
await app.register(helmetPlugin);
await app.register(rateLimitPlugin);

// 3-9. Route-level middleware (applied via preHandler)
app.addHook('onRequest', csrfMiddleware);

// Per-route middleware stack
const protectedRoute = {
  preHandler: [
    authMiddleware,       // Layer 5
    tenantMiddleware,     // Layer 6
    requireRole('USER'),  // Layer 7
    requireFeature('X'),  // Layer 8 (optional)
    idorCheck('model'),   // Layer 9 (optional)
  ]
};
```

---

## Complete Request Flow Example

```
Client Request: POST /api/projects
  │
  ├─ [1] CORS → Origin: https://app.kaven.dev ✓
  ├─ [2] Helmet → Security headers added to response
  ├─ [3] CSRF → Origin matches allowed origins ✓
  ├─ [4] Rate Limit → 42/100 requests this minute ✓
  ├─ [5] Auth → JWT valid, userId + tenantId extracted ✓
  ├─ [6] Tenant → tenantId verified against token ✓
  ├─ [7] RBAC → USER role sufficient for this route ✓
  ├─ [8] Capability → MAX_PROJECTS: 3/5 used, within limit ✓
  ├─ [9] IDOR → N/A for create operations
  └─ [10] Business → projectService.create(data) → 201 Created
```
