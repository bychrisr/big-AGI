---
task: addMiddleware()
responsavel: "@kaven-api-dev"
responsavel_type: agent
atomic_layer: task
Entrada:
  - middleware_name: string
  - purpose: string
  - position_in_chain: number # 1-10 position in the middleware stack
  - applies_to: string # "global" | "route" | "module"
Saida:
  - middleware_file: file
  - middleware_tests: file
  - updated_middleware_stack_docs: markdown
Checklist:
  - [ ] Implement middleware as Fastify hook or plugin
  - [ ] Register in correct position in the chain
  - [ ] Add TypeScript types for request decoration
  - [ ] Add unit tests
  - [ ] Add integration test with route
  - [ ] Document in middleware stack reference
  - [ ] Verify no conflicts with existing middleware
  - [ ] Handle error cases gracefully
---

# addMiddleware()

Add a new middleware to Kaven's 10-layer Fastify middleware stack, ensuring correct ordering and compatibility with existing middleware.

## Usage

```
@kaven-api-dev *task addMiddleware --name "requestIdMiddleware" --purpose "Add unique request ID to every request for tracing" --position 1 --applies_to "global"
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `middleware_name` | string | yes | camelCase name for the middleware |
| `purpose` | string | yes | What this middleware does |
| `position_in_chain` | number | yes | Position 1-10+ in the execution order |
| `applies_to` | string | yes | Scope: "global", "route", or "module" |

## Output Format

```
apps/api/src/middleware/
  ├── {middleware-name}.ts        # Middleware implementation
  └── {middleware-name}.test.ts   # Tests
```

## Kaven Middleware Stack Reference

The current 10-layer stack executes in this order:

| Position | Layer | Type | Scope |
|----------|-------|------|-------|
| 1 | Rate Limiting | Global plugin | All routes |
| 2 | CORS | Global plugin | All routes |
| 3 | Authentication (JWT) | Route hook | Protected routes |
| 4 | Tenant Resolution | Route hook | Protected routes |
| 5 | RBAC (Role Check) | Route hook | Protected routes |
| 6 | Feature Guard | Route hook | Gated features |
| 7 | IDOR Protection | Route hook | Resource routes |
| 8 | Input Validation (Zod) | Schema option | Routes with input |
| 9 | Audit Logging | onResponse hook | Audited routes |
| 10 | CSRF Protection | Route hook | State-changing routes |

## Implementation Steps

### Step 1: Choose the Middleware Pattern

Fastify offers several patterns for middleware:

**A) Global Plugin** — Runs on every request (positions 1-2):
```typescript
import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';

export default fp(async function rateLimitPlugin(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions
) {
  fastify.addHook('onRequest', async (request, reply) => {
    // Middleware logic here
  });
});
```

**B) Route-level preHandler** — Used in route options (positions 3-7, 10):
```typescript
import type { FastifyRequest, FastifyReply } from 'fastify';

export function requireAuth() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    // Validate token, decorate request
    request.user = decoded;
    request.tenantId = decoded.tenantId;
  };
}
```

**C) Schema-based** — Zod validation via schema option (position 8):
```typescript
// This is not a middleware file; it is configured in route schema options
schema: {
  body: createInvoiceBodySchema,
  params: invoiceParamsSchema,
}
```

**D) onResponse Hook** — Runs after response is sent (position 9):
```typescript
fastify.addHook('onResponse', async (request, reply) => {
  // Log audit event after response
});
```

### Step 2: Implement the Middleware

Create `apps/api/src/middleware/{middleware-name}.ts`:

```typescript
import type { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';

const middlewareLogger = logger.child({ middleware: '{middleware-name}' });

/**
 * {Purpose description}
 *
 * Position in chain: {position}
 * Applies to: {scope}
 */
export function myMiddleware(options?: MyMiddlewareOptions) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // 1. Extract needed data from request
      // 2. Perform validation or transformation
      // 3. Decorate request if needed: request.myData = ...
      // 4. Return (continue chain) or reply (short-circuit)

      middlewareLogger.debug({ requestId: request.id }, 'Middleware executed');
    } catch (error) {
      middlewareLogger.error({ err: error }, 'Middleware failed');
      throw new AppError('Middleware error', 500);
    }
  };
}

// Types
export interface MyMiddlewareOptions {
  enabled?: boolean;
}
```

### Step 3: Decorate the Request (if needed)

If the middleware adds data to the request, declare the type:

```typescript
// In apps/api/src/types/fastify.d.ts
declare module 'fastify' {
  interface FastifyRequest {
    myData?: MyDataType;
  }
}
```

### Step 4: Register the Middleware

**For global plugins**, register in `app.ts`:
```typescript
import myPlugin from '@/middleware/my-plugin';
// Register in order
fastify.register(rateLimitPlugin); // Position 1
fastify.register(corsPlugin);      // Position 2
fastify.register(myPlugin);        // New position
```

**For route-level hooks**, add to preHandler array:
```typescript
preHandler: [
  requireAuth(),       // Position 3
  requireRole(['admin']), // Position 5
  myMiddleware(),      // New position
],
```

### Step 5: Test the Middleware

```typescript
import { describe, it, expect, vi } from 'vitest';
import { myMiddleware } from './my-middleware';

describe('myMiddleware', () => {
  it('should pass when conditions are met', async () => {
    const request = createMockRequest({ /* valid data */ });
    const reply = createMockReply();
    await myMiddleware()(request, reply);
    expect(request.myData).toBeDefined();
  });

  it('should reject when conditions fail', async () => {
    const request = createMockRequest({ /* invalid data */ });
    const reply = createMockReply();
    await expect(myMiddleware()(request, reply)).rejects.toThrow();
  });
});
```

### Step 6: Document in Stack Reference

Update the middleware stack documentation to include the new middleware, its position, purpose, and any configuration options. Ensure the ordering table in `docs/architecture/middleware-stack.md` is updated.

### Step 7: Verify Chain Compatibility

1. Run the full test suite to ensure no middleware conflicts.
2. Test that the middleware does not break existing routes.
3. Verify ordering by checking that dependent middleware (e.g., auth before RBAC) still works.
4. Test error propagation through the chain.
