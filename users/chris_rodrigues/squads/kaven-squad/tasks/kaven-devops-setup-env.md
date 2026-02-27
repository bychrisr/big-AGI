---
task: setupEnvironment()
responsavel: "@kaven-devops"
responsavel_type: agent
atomic_layer: task
Entrada:
  - environment: string # "local" | "staging" | "production"
  - options: object # { reset_db: bool, seed: bool, monitoring: bool }
Saida:
  - environment_status: object
  - service_urls: object
  - health_check_results: list
Checklist:
  - [ ] Verify Docker and Docker Compose installed
  - [ ] Run docker-compose up for required services
  - [ ] Verify PostgreSQL is running and accessible
  - [ ] Verify Redis is running and accessible
  - [ ] Run database migrations
  - [ ] Run seed data (if applicable)
  - [ ] Verify all application ports are available
  - [ ] Verify monitoring stack (if enabled)
  - [ ] Run health checks on all services
  - [ ] Generate environment status report
---

# setupEnvironment()

Set up a complete Kaven development, staging, or production environment with all required services, database migrations, and health verification.

## Usage

```
@kaven-devops *task setupEnvironment --env "local" --options '{"reset_db": false, "seed": true, "monitoring": true}'
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `environment` | string | yes | "local", "staging", "production" |
| `options` | object | no | Configuration options |

## Output Format

```markdown
# Environment Setup Report
## Environment: {environment}
## Date: YYYY-MM-DD

## Services Status
| Service | Status | Port | URL |
|---------|--------|------|-----|
| API (Fastify) | Running | 3001 | http://localhost:3001 |
| Admin Panel | Running | 3000 | http://localhost:3000 |
| Tenant App | Running | 3002 | http://localhost:3002 |
| PostgreSQL | Running | 5432 | postgresql://localhost:5432 |
| Redis | Running | 6379 | redis://localhost:6379 |

## Health Checks
| Check | Status | Details |
```

## Implementation Steps

### Step 1: Prerequisites Verification

```bash
# Check Docker
docker --version || echo "FAIL: Docker not installed"
docker compose version || echo "FAIL: Docker Compose not installed"

# Check Node.js
node --version || echo "FAIL: Node.js not installed"

# Check pnpm
pnpm --version || echo "FAIL: pnpm not installed"

# Check required ports are free
for port in 3000 3001 3002 5432 6379; do
  lsof -i :$port > /dev/null 2>&1 && echo "WARNING: Port $port in use" || echo "OK: Port $port available"
done
```

### Step 2: Environment-Specific Configuration

#### Local Development

```bash
# Copy environment file
cp .env.example .env.local

# Key environment variables
DATABASE_URL="postgresql://kaven:kaven@localhost:5432/kaven_dev"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="dev-secret-change-in-production"
ADMIN_PANEL_URL="http://localhost:3000"
TENANT_APP_URL="http://localhost:3002"
API_URL="http://localhost:3001"
NODE_ENV="development"
```

#### Staging

```bash
# Use staging environment variables
cp .env.staging .env

# Staging uses managed database and Redis
DATABASE_URL="postgresql://user:pass@staging-db.kaven.io:5432/kaven_staging"
REDIS_URL="redis://staging-redis.kaven.io:6379"
NODE_ENV="staging"
```

#### Production

```bash
# Production uses secrets management
# Environment variables are injected via CI/CD or secrets manager
NODE_ENV="production"
# DATABASE_URL, REDIS_URL, JWT_SECRET from secrets
```

### Step 3: Start Infrastructure Services

```bash
# Start PostgreSQL and Redis
docker compose up -d postgres redis

# Wait for services to be healthy
docker compose exec postgres pg_isready --timeout=30
docker compose exec redis redis-cli ping
```

Docker Compose services defined in `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: kaven
      POSTGRES_PASSWORD: kaven
      POSTGRES_DB: kaven_dev
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U kaven"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
```

### Step 4: Install Dependencies

```bash
# Install all workspace dependencies
pnpm install

# Generate Prisma client
pnpm prisma generate
```

### Step 5: Run Database Migrations

```bash
# For local/staging: apply migrations
pnpm prisma migrate deploy

# For local with reset: drop and recreate
if [ "$RESET_DB" = true ]; then
  pnpm prisma migrate reset --force
fi
```

### Step 6: Run Seed Data

```bash
# Seed the database with initial data
if [ "$SEED" = true ]; then
  pnpm prisma db seed
fi
```

The seed script creates:
- Default admin tenant and user.
- Sample tenants for testing.
- Feature flag configurations.
- Role and permission definitions.
- Sample data for demo purposes.

### Step 7: Start Application Services

```bash
# Development mode (with hot reload)
pnpm dev

# This starts (via Turborepo):
# - apps/api (Fastify) on port 3001
# - apps/admin (Next.js) on port 3000
# - apps/tenant (Next.js) on port 3002
```

### Step 8: Start Monitoring Stack (optional)

```bash
if [ "$MONITORING" = true ]; then
  docker compose --profile monitoring up -d

  # This starts:
  # - Prometheus (metrics collection) on port 9090
  # - Grafana (dashboards) on port 3003
fi
```

### Step 9: Run Health Checks

```bash
# API health check
curl -s http://localhost:3001/health | jq .

# Admin Panel
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000

# Tenant App
curl -s -o /dev/null -w "%{http_code}" http://localhost:3002

# Database connection
pnpm prisma db execute --stdin <<< "SELECT 1"

# Redis connection
docker compose exec redis redis-cli ping
```

### Step 10: Generate Status Report

Compile all results into the Environment Setup Report format. Include:
- Service status (running/stopped/error).
- URLs for accessing each service.
- Health check results.
- Any warnings or issues encountered.
- Next steps or manual actions needed.
