# Kaven Squad Coding Standards

> **Coding standards for kaven-squad agents**

## General Principles

1. **TypeScript First** - All code must be TypeScript with strict mode
2. **Functional Style** - Prefer functional programming patterns
3. **Error Handling** - Always use try-catch with meaningful errors
4. **Testing Required** - All new code needs tests
5. **Documentation** - Self-documenting code > comments

## Naming Conventions

- **Files**: kebab-case (e.g., `user-service.ts`)
- **Classes**: PascalCase (e.g., `UserService`)
- **Functions**: camelCase (e.g., `getUserById`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRY_ATTEMPTS`)
- **Interfaces**: PascalCase with `I` prefix (e.g., `IUserRepository`)

## Prohibited

- ❌ `any` type (use `unknown` if needed)
- ❌ `console.log` in production code (use logger)
- ❌ Hardcoded secrets
- ❌ Direct DB access (use services)
- ❌ Unhandled promises
