# Kaven Squad

Specialized AI agent squad for developing and maintaining the **Kaven Framework** -- an enterprise-grade SaaS boilerplate with multi-tenancy, authentication, payments, observability, and a 76+ component design system.

---

## What is kaven-squad?

The kaven-squad is a collection of AI agents with deep knowledge of the Kaven Framework architecture, patterns, and codebase. Each agent specializes in a specific domain (API, frontend, database, security, DevOps) and works together through structured workflows to implement features, fix bugs, and maintain code quality.

The squad uses:
- **Knowledge base files** (`data/`) for comprehensive framework reference
- **Workflow definitions** (`workflows/`) for multi-step development processes
- **Agent definitions** (`agents/`) for specialized domain expertise
- **Task definitions** (`tasks/`) for reusable operations

---

## Prerequisites

- Node.js 20.x LTS
- pnpm 9.x
- Docker and Docker Compose
- PostgreSQL 17 (via Docker)
- Redis 7 (via Docker)
- GitHub CLI (`gh`) authenticated

---

## Quick Start

### 1. Activate the Squad
```
@kaven-squad
```

### 2. Activate a Specific Agent
```
@kaven-architect    # Architecture review and planning
@kaven-api-dev      # Backend API development
@kaven-frontend-dev # Frontend development
@kaven-db-engineer  # Database schema and migrations
@kaven-qa           # Testing and security
@kaven-devops       # CI/CD and infrastructure
```

### 3. Run a Workflow
```
*workflow kaven-new-feature --feature_name="notifications" --story_id="STORY-015"
*workflow kaven-sprint-cycle --story_id="STORY-015" --sprint_number=3
*workflow kaven-security-audit --scope=full
*workflow kaven-new-module --module_name="analytics"
```

---

## Agents

### kaven-architect
**Role**: Architecture review, design decisions, implementation planning

Responsibilities:
- Review feature architecture against Kaven patterns
- Plan implementation approach for stories
- Verify multi-tenancy impact of changes
- Ensure consistency with existing codebase
- Update story files and track progress

### kaven-api-dev
**Role**: Backend API development with Fastify

Responsibilities:
- Implement Fastify services, controllers, and routes
- Apply middleware stack (auth, tenant, RBAC, feature guard, IDOR)
- Create Zod validation schemas
- Register plugins following Kaven patterns
- Implement RLS and soft delete patterns

### kaven-frontend-dev
**Role**: Frontend development with Next.js

Responsibilities:
- Create pages using App Router conventions
- Build components using @kaven/ui design system
- Implement API client integration
- Add internationalization (EN + PT-BR)
- Update navigation and routing

### kaven-db-engineer
**Role**: Database schema design and management

Responsibilities:
- Design Prisma models following Kaven conventions
- Add tenantId and composite indexes
- Implement soft delete fields
- Create and run migrations
- Manage schema split (base vs extended)

### kaven-qa
**Role**: Testing, security validation, GDPR compliance

Responsibilities:
- Write unit and integration tests (Vitest)
- Run security test suites (IDOR, CSRF, SQLi, XSS)
- Run GDPR compliance tests
- Verify multi-tenant isolation
- Ensure coverage targets (80% lines, 80% functions, 75% branches)

### kaven-devops
**Role**: CI/CD, infrastructure, Git workflow

Responsibilities:
- Run quality pipeline (lint, typecheck, test)
- Manage Docker Compose environment
- Create branches and PRs following conventions
- Verify CI pipeline passes locally
- Manage deployment process

---

## Commands

### Development
```
*implement <story-id>     # Start implementing a story
*review <file-path>       # Review code in a file
*refactor <file-path>     # Suggest and apply refactoring
```

### Testing
```
*test                     # Run all tests
*test:security            # Run security tests
*test:gdpr                # Run GDPR tests
*test:coverage            # Run tests with coverage report
```

### Database
```
*schema:add <model>       # Add a new Prisma model
*schema:review            # Review current schema
*migrate                  # Create and run migration
*seed                     # Seed database
```

### Quality
```
*quality                  # Run full quality pipeline
*lint                     # Run ESLint + Prettier
*typecheck                # Run TypeScript checks
```

### Git
```
*branch <name>            # Create feature branch
*commit <message>         # Create conventional commit
*pr                       # Create pull request
*merge                    # Post-merge cleanup
```

---

## Workflow Examples

### Implementing a New Feature
```
# 1. Start the workflow
*workflow kaven-new-feature \
  --feature_name="payment-reminders" \
  --story_id="STORY-020" \
  --story_file="docs/planning/stories/sprint-4/STORY-020.md"

# The workflow will:
# - Read and understand the story
# - Review architecture impact
# - Design schema changes
# - Implement API endpoints
# - Implement frontend pages
# - Write tests
# - Run security validation
# - Run CI pipeline
# - Update story progress
```

### Creating a New Module
```
# 1. Start the workflow
*workflow kaven-new-module \
  --module_name="analytics" \
  --module_description="Usage analytics and reporting dashboard" \
  --has_schema=true \
  --has_frontend=true \
  --target_apps="[admin, tenant]"

# The workflow will:
# - Design module structure
# - Create module.json manifest
# - Add schema models with markers
# - Implement backend (service, controller, routes)
# - Implement frontend (pages, components)
# - Write tests
# - Package and validate module
```

### Running a Security Audit
```
# Full security audit
*workflow kaven-security-audit --scope=full --include_gdpr=true

# API-only audit
*workflow kaven-security-audit --scope=api-only

# Specific module audit
*workflow kaven-security-audit --scope=specific-module --module_name=payments
```

### Sprint Development Cycle
```
# Complete sprint cycle for a story
*workflow kaven-sprint-cycle \
  --story_id="STORY-015" \
  --story_file="docs/planning/stories/sprint-3/STORY-015.md" \
  --sprint_number=3

# The workflow will:
# - Review story and plan
# - Setup Git branch
# - Plan architecture
# - Implement feature
# - Write and run tests
# - Run security validation
# - Verify CI pipeline
# - Commit and create PR
# - Update story status
```

---

## Architecture Overview

```
squads/kaven-squad/
├── README.md                          # This file
├── agents/                            # Agent definitions
│   ├── kaven-architect.yaml
│   ├── kaven-api-dev.yaml
│   ├── kaven-frontend-dev.yaml
│   ├── kaven-db-engineer.yaml
│   ├── kaven-qa.yaml
│   └── kaven-devops.yaml
├── tasks/                             # Reusable task definitions
│   ├── kaven-architect-review-feature.yaml
│   ├── kaven-api-dev-add-endpoint.yaml
│   ├── kaven-frontend-dev-add-page.yaml
│   ├── kaven-db-engineer-add-model.yaml
│   ├── kaven-qa-add-test.yaml
│   ├── kaven-qa-run-security.yaml
│   └── kaven-devops-ci-check.yaml
├── data/                              # Knowledge base files
│   ├── kaven-kb.md                    # Complete framework knowledge base
│   ├── kaven-schema-reference.md      # All 54 Prisma models and 28 enums
│   ├── kaven-middleware-stack.md      # 10-layer middleware documentation
│   ├── kaven-patterns.md             # Architectural patterns with code
│   └── kaven-feature-flags.md        # 40+ feature capabilities by plan
├── workflows/                         # Multi-step workflow definitions
│   ├── kaven-new-feature.yaml        # Add new feature end-to-end
│   ├── kaven-new-module.yaml         # Create CLI-installable module
│   ├── kaven-security-audit.yaml     # Comprehensive security audit
│   └── kaven-sprint-cycle.yaml       # Sprint development cycle
└── commands/                          # Command definitions
```

---

## Data Files Reference

| File | Content | Lines |
|------|---------|-------|
| `data/kaven-kb.md` | Complete framework knowledge base -- architecture, multi-tenancy, security, database, auth, payments, email, design system, testing, CI/CD, CLI modules, key files, commands, env vars, observability | 300+ |
| `data/kaven-schema-reference.md` | All 54 Prisma models grouped by domain (Core, Auth, Billing, Features, System) with field definitions and all 28 enums | 400+ |
| `data/kaven-middleware-stack.md` | Detailed docs for each of the 10 middleware layers with purpose, config, bypass rules, error responses, and testing approach | 250+ |
| `data/kaven-patterns.md` | 10 architectural patterns with full code examples: RLS, Soft Delete, Feature Flags, Plugin, Module, Repository, Auth, IDOR, Schema Split, Observability | 350+ |
| `data/kaven-feature-flags.md` | Complete list of 48 capabilities (35 boolean, 13 numeric) with plan defaults, enforcement examples, and usage tracking | 200+ |

---

## Contributing

### Adding a New Agent
1. Create YAML in `agents/` following existing format
2. Define persona, expertise, and available tools
3. Reference data files for knowledge
4. Add corresponding tasks in `tasks/`

### Adding a New Workflow
1. Create YAML in `workflows/` following existing format
2. Define inputs, steps with dependencies, and completion criteria
3. Reference existing agents and tasks
4. Include evidence bundle definition

### Updating Knowledge Base
1. Edit files in `data/` to reflect codebase changes
2. Keep `kaven-kb.md` as the single source of truth
3. Update schema reference when Prisma models change
4. Update feature flags when capabilities change

---

## Key Principles

1. **Multi-tenancy first** -- Every model has tenantId, every query is scoped
2. **Security by default** -- 10-layer middleware stack on every request
3. **Evidence-based** -- No work is "done" without evidence (tests, diffs, reports)
4. **Pattern consistency** -- Follow established patterns, never invent new ones without review
5. **Reuse over create** -- Check existing components and patterns before creating new ones
6. **Story-driven** -- All work traces back to a story with acceptance criteria
