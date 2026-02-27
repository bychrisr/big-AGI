# Kaven Framework — Architectural Patterns

> Reference guide for all patterns used across the Kaven codebase.
> Each pattern includes purpose, implementation, and code examples.

---

## 1. RLS Pattern (Row-Level Security)

### Purpose
Automatically scope all database queries to the current tenant, preventing cross-tenant data access at the ORM level.

### Implementation
- File: `apps/api/src/middleware/prisma-rls.ts`
- Applied as Prisma middleware on all operations

### Code Example
```typescript
// prisma-rls.ts — Simplified
import { Prisma } from '@prisma/client';

export function applyRLS(prisma: PrismaClient) {
  prisma.$use(async (params, next) => {
    const tenantId = getAsyncLocalStorage().getStore()?.tenantId;
    if (!tenantId || TENANT_FREE_MODELS.includes(params.model)) {
      return next(params);
    }

    // Inject tenantId filter on reads
    if (['findMany', 'findFirst', 'findUnique', 'count', 'aggregate'].includes(params.action)) {
      params.args.where = { ...params.args.where, tenantId };
    }

    // Set tenantId on creates
    if (['create', 'createMany'].includes(params.action)) {
      if (Array.isArray(params.args.data)) {
        params.args.data = params.args.data.map(d => ({ ...d, tenantId }));
      } else {
        params.args.data = { ...params.args.data, tenantId };
      }
    }

    return next(params);
  });
}

// Usage in routes
export async function withTenantContext<T>(
  prisma: PrismaClient,
  tenantId: string,
  fn: (scopedPrisma: PrismaClient) => Promise<T>
): Promise<T> {
  return asyncLocalStorage.run({ tenantId }, () => fn(prisma));
}
```

### Models Exempt from RLS
- `Tenant` — the tenant itself
- `Capability` — global capability definitions
- `Plan` — global plan definitions

---

## 2. Soft Delete Pattern

### Purpose
Never permanently delete records that may be needed for audit, compliance, or recovery. Mark records with `deletedAt` timestamp instead.

### Implementation
- File: `apps/api/src/middleware/prisma-soft-delete.ts`
- Applied as Prisma middleware on read and delete operations

### Code Example
```typescript
// prisma-soft-delete.ts — Simplified
export function applySoftDelete(prisma: PrismaClient) {
  prisma.$use(async (params, next) => {
    if (!SOFT_DELETE_MODELS.includes(params.model)) {
      return next(params);
    }

    // Auto-filter deleted records on reads
    if (['findMany', 'findFirst', 'findUnique'].includes(params.action)) {
      params.args.where = { ...params.args.where, deletedAt: null };
    }

    // Convert delete to soft delete
    if (params.action === 'delete') {
      params.action = 'update';
      params.args.data = { deletedAt: new Date() };
    }

    // Convert deleteMany to soft deleteMany
    if (params.action === 'deleteMany') {
      params.action = 'updateMany';
      params.args.data = { deletedAt: new Date() };
    }

    return next(params);
  });
}

// Soft delete models
const SOFT_DELETE_MODELS = ['User', 'Tenant', 'Subscription', 'Invoice', 'Order'];

// Service-level usage
class UserService {
  // Soft delete (default)
  async softDelete(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } }); // Intercepted by middleware
  }

  // Restore
  async restore(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  // Hard delete (bypass middleware)
  async hardDelete(id: string): Promise<void> {
    await prisma.$executeRaw`DELETE FROM "User" WHERE id = ${id}`;
  }

  // Include deleted
  async findWithDeleted(id: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { id, deletedAt: { not: null } }, // Override filter
    });
  }
}
```

---

## 3. Feature Flag Pattern

### Purpose
Gate features behind plan-based capabilities, enforcing both boolean access and numeric usage limits.

### Implementation
- File: `apps/api/src/middleware/feature-guard.middleware.ts`
- Uses `Capability` + `Grant` + `UsageTracking` models

### Code Example
```typescript
// feature-guard.middleware.ts
export function requireFeature(capabilityCode: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, userId } = request;

    // 1. Check user-specific grants first
    const grant = await prisma.grant.findUnique({
      where: { tenantId_userId_capabilityId: { tenantId, userId, capabilityId: capability.id } },
    });

    // 2. Fall back to plan-based defaults
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const capability = await prisma.capability.findUnique({ where: { code: capabilityCode } });

    if (capability.type === 'BOOLEAN') {
      const allowed = grant?.value ?? getPlanDefault(tenant.plan, capabilityCode);
      if (!allowed) {
        return reply.code(403).send({ error: 'Feature not available on your plan' });
      }
    }

    if (capability.type === 'NUMERIC') {
      const limit = grant?.value ?? getPlanDefault(tenant.plan, capabilityCode);
      const usage = await prisma.usageTracking.findFirst({
        where: { tenantId, feature: capabilityCode, periodEnd: { gte: new Date() } },
      });

      if (usage && usage.currentUsage >= limit) {
        return reply.code(429).send({ error: 'Usage limit exceeded' });
      }

      // Auto-increment usage
      await prisma.usageTracking.upsert({
        where: { tenantId_feature_period: { tenantId, feature: capabilityCode, period: currentPeriod() } },
        update: { currentUsage: { increment: 1 } },
        create: { tenantId, feature: capabilityCode, currentUsage: 1, limit, period: currentPeriod(), ... },
      });
    }
  };
}

// Route usage
app.post('/api/projects', {
  preHandler: [authMiddleware, requireFeature('MAX_PROJECTS')]
}, projectController.create);
```

---

## 4. Plugin Pattern (Fastify)

### Purpose
Encapsulate related functionality (routes, middleware, decorators) into self-contained Fastify plugins.

### Implementation
- Fastify's built-in plugin system
- Each domain area is a separate plugin

### Code Example
```typescript
// plugins/auth.plugin.ts
import fp from 'fastify-plugin';

export default fp(async function authPlugin(app: FastifyInstance) {
  // Register decorators
  app.decorateRequest('userId', '');
  app.decorateRequest('tenantId', '');
  app.decorateRequest('role', '');

  // Register hooks
  app.addHook('onRequest', authMiddleware);

  // Register routes
  app.register(authRoutes, { prefix: '/auth' });
});

// index.ts — Plugin registration
await app.register(authPlugin);
await app.register(tenantPlugin);
await app.register(invoicePlugin);
await app.register(projectPlugin);
```

---

## 5. Module Pattern (CLI)

### Purpose
Allow modular installation/removal of features via the kaven-cli with idempotent, transactional operations.

### Implementation
- Markers: `// [KAVEN_MODULE:name BEGIN]` / `// [KAVEN_MODULE:name END]`
- Anchors: `// [ANCHOR:ROUTES]`, `// [ANCHOR:MIDDLEWARE]`, etc.
- Config: `module.json` per module

### Code Example
```typescript
// Before module install
import { authPlugin } from './plugins/auth';
// [ANCHOR:ROUTES]

app.register(authPlugin);
// [ANCHOR:MIDDLEWARE]

// After `kaven module add payments`
import { authPlugin } from './plugins/auth';
// [KAVEN_MODULE:payments BEGIN]
import { paymentPlugin } from './modules/payments';
// [KAVEN_MODULE:payments END]
// [ANCHOR:ROUTES]

app.register(authPlugin);
// [KAVEN_MODULE:payments BEGIN]
app.register(paymentPlugin, { prefix: '/payments' });
// [KAVEN_MODULE:payments END]
// [ANCHOR:MIDDLEWARE]
```

### module.json
```json
{
  "name": "payments",
  "version": "1.0.0",
  "description": "Stripe payment integration",
  "files": [
    "src/modules/payments/",
    "prisma/migrations/add_payments/"
  ],
  "injections": [
    {
      "target": "src/index.ts",
      "anchor": "ROUTES",
      "content": "import { paymentPlugin } from './modules/payments';"
    },
    {
      "target": "src/index.ts",
      "anchor": "MIDDLEWARE",
      "content": "app.register(paymentPlugin, { prefix: '/payments' });"
    }
  ],
  "dependencies": {
    "stripe": "^14.0.0"
  },
  "env": {
    "STRIPE_SECRET_KEY": "",
    "STRIPE_WEBHOOK_SECRET": ""
  }
}
```

---

## 6. Repository/Service Pattern

### Purpose
Separate business logic (services) from data access (Prisma), enabling testability and clean architecture.

### Implementation
- Controllers handle HTTP request/response
- Services contain business logic
- Prisma client handles data access (via RLS middleware)

### Code Example
```typescript
// services/invoice.service.ts
export class InvoiceService {
  constructor(private prisma: PrismaClient) {}

  async create(tenantId: string, data: CreateInvoiceDto): Promise<Invoice> {
    const number = await this.generateInvoiceNumber(tenantId);
    return withTenantContext(this.prisma, tenantId, async (prisma) => {
      return prisma.invoice.create({
        data: { ...data, number, status: 'DRAFT' },
      });
    });
  }

  async markAsPaid(tenantId: string, id: string): Promise<Invoice> {
    return withTenantContext(this.prisma, tenantId, async (prisma) => {
      const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id } });
      if (invoice.status === 'PAID') throw new ConflictError('Already paid');
      return prisma.invoice.update({
        where: { id },
        data: { status: 'PAID', paidAt: new Date() },
      });
    });
  }
}

// controllers/invoice.controller.ts
export class InvoiceController {
  constructor(private service: InvoiceService) {}

  async create(request: FastifyRequest, reply: FastifyReply) {
    const dto = CreateInvoiceSchema.parse(request.body);
    const invoice = await this.service.create(request.tenantId, dto);
    return reply.code(201).send(invoice);
  }
}
```

---

## 7. Auth Pattern (JWT + Refresh Token)

### Purpose
Stateless authentication with token rotation for security.

### Flow
```
1. POST /auth/login { email, password }
   → Validate credentials
   → Generate accessToken (15-60min, jose)
   → Generate refreshToken (7-30 days, stored in DB)
   → Set refreshToken as httpOnly cookie
   → Return { accessToken, user }

2. GET /api/protected (Authorization: Bearer <accessToken>)
   → Validate accessToken (jose.jwtVerify)
   → Extract { userId, tenantId, role }
   → Proceed to route handler

3. POST /auth/refresh (Cookie: refreshToken=<token>)
   → Find RefreshToken in DB
   → Verify not expired, not revoked
   → Revoke old refreshToken
   → Generate new pair (access + refresh)
   → Return new tokens

4. POST /auth/logout
   → Revoke refreshToken in DB
   → Clear cookie
```

---

## 8. IDOR Protection Pattern

### Purpose
Prevent users from accessing resources that belong to other users or tenants by verifying ownership before every operation.

### Code Example
```typescript
// middleware/idor.middleware.ts
export function idorCheck(model: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { tenantId, userId, role } = request;

    // SUPER_ADMIN bypasses IDOR checks
    if (role === 'SUPER_ADMIN') return;

    const resource = await prisma[model].findUnique({ where: { id } });

    // Return 404 instead of 403 to prevent enumeration
    if (!resource) {
      return reply.code(404).send({ error: 'Resource not found' });
    }

    // Check tenant ownership
    if (resource.tenantId !== tenantId) {
      return reply.code(404).send({ error: 'Resource not found' });
    }

    // For user-scoped resources, check user ownership
    if (USER_SCOPED_MODELS.includes(model) && role !== 'TENANT_ADMIN') {
      if (resource.userId !== userId) {
        return reply.code(404).send({ error: 'Resource not found' });
      }
    }
  };
}

// Route usage
app.get('/api/invoices/:id', {
  preHandler: [authMiddleware, idorCheck('invoice')]
}, invoiceController.getById);
```

---

## 9. Schema Split Pattern

### Purpose
Allow the core schema to remain immutable while features can extend it via modules.

### Implementation
```
packages/database/prisma/
├── schema.base.prisma       # Core models (immutable, CLI never touches)
├── schema.extended.prisma   # Feature models (modules add here)
├── schema.prisma            # Merged output (auto-generated, gitignored)
└── scripts/merge-schema.ts  # Merge script
```

### Merge Process
```typescript
// scripts/merge-schema.ts
import { readFileSync, writeFileSync } from 'fs';

const base = readFileSync('schema.base.prisma', 'utf-8');
const extended = readFileSync('schema.extended.prisma', 'utf-8');

// Remove duplicate datasource/generator blocks from extended
const cleanExtended = extended
  .replace(/datasource\s+\w+\s*\{[^}]*\}/g, '')
  .replace(/generator\s+\w+\s*\{[^}]*\}/g, '');

writeFileSync('schema.prisma', `${base}\n\n// === Extended Schema ===\n\n${cleanExtended}`);
```

### Rules
- `schema.base.prisma`: Only modified via migrations, never by CLI
- `schema.extended.prisma`: Modules add models/enums here via markers
- `schema.prisma`: Auto-generated, never edit manually

---

## 10. Observability Pattern

### Purpose
Full-stack observability with metrics, logging, and error tracking.

### Metrics (Prometheus)
```typescript
// plugins/metrics.ts
import { collectDefaultMetrics, Counter, Histogram } from 'prom-client';

collectDefaultMetrics();

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

// Hook into Fastify lifecycle
app.addHook('onResponse', (request, reply) => {
  const duration = reply.elapsedTime / 1000;
  httpRequestDuration.observe(
    { method: request.method, route: request.routeOptions.url, status: reply.statusCode },
    duration
  );
  httpRequestsTotal.inc(
    { method: request.method, route: request.routeOptions.url, status: reply.statusCode }
  );
});

// Expose metrics endpoint
app.get('/metrics', async () => register.metrics());
```

### Logging (Winston)
```typescript
// lib/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    // Loki transport for production
  ],
  defaultMeta: { service: 'kaven-api' },
});
```

### Error Tracking (Sentry)
```typescript
// plugins/sentry.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

app.setErrorHandler((error, request, reply) => {
  Sentry.captureException(error, {
    extra: { tenantId: request.tenantId, userId: request.userId },
  });
  reply.code(500).send({ error: 'Internal Server Error' });
});
```
