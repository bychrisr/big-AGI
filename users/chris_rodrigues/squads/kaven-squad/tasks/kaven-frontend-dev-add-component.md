---
task: addComponent()
responsavel: "@kaven-frontend-dev"
responsavel_type: agent
atomic_layer: task
Entrada:
  - component_name: string
  - type: string # "atom" | "molecule" | "organism"
  - location: string # "shared" | "admin" | "tenant"
  - props: list
Saida:
  - component_file: file
  - component_types: file
  - component_story: file # Storybook (optional)
Checklist:
  - [ ] Create component file with proper naming
  - [ ] Use @kaven/ui primitives as base
  - [ ] Add comprehensive TypeScript types/interfaces
  - [ ] Implement responsive design (mobile-first)
  - [ ] Support dark mode via Tailwind dark: variants
  - [ ] Add i18n for user-facing text
  - [ ] Follow atomic design hierarchy
  - [ ] Export from module index
---

# addComponent()

Create a new React component following Kaven's design system patterns, using `@kaven/ui` primitives, atomic design principles, and Tailwind CSS for styling.

## Usage

```
@kaven-frontend-dev *task addComponent --name "InvoiceStatusBadge" --type "atom" --location "shared" --props '[{"name": "status", "type": "InvoiceStatus", "required": true}]'
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `component_name` | string | yes | PascalCase component name |
| `type` | string | yes | Atomic design level: "atom", "molecule", "organism" |
| `location` | string | yes | Where it lives: "shared" (@kaven/ui), "admin", "tenant" |
| `props` | list | no | Array of prop definitions |

## Output Format

```
# For shared components:
packages/ui/src/components/{component-name}/
  ├── {component-name}.tsx
  ├── {component-name}.types.ts
  └── index.ts

# For app-specific components:
apps/{app}/src/components/{type}/{component-name}/
  ├── {component-name}.tsx
  ├── {component-name}.types.ts
  └── index.ts
```

## Implementation Steps

### Step 1: Determine Component Location

Based on the `location` and `type` parameters:

| Location | Path | When to use |
|----------|------|-------------|
| shared | `packages/ui/src/components/` | Reusable across apps |
| admin | `apps/admin/src/components/{type}/` | Admin Panel only |
| tenant | `apps/tenant/src/components/{type}/` | Tenant App only |

### Step 2: Define TypeScript Types

Create `{component-name}.types.ts`:

```typescript
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceStatusBadgeProps {
  /** The current status of the invoice */
  status: InvoiceStatus;
  /** Optional size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Optional additional className */
  className?: string;
}
```

### Step 3: Create the Component

Create `{component-name}.tsx`:

```tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { Badge } from '@kaven/ui/badge';
import { cn } from '@kaven/ui/lib/utils';
import type { InvoiceStatusBadgeProps } from './invoice-status-badge.types';

const statusVariants = cva('', {
  variants: {
    status: {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      overdue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    },
    size: {
      sm: 'text-xs px-2 py-0.5',
      md: 'text-sm px-2.5 py-0.5',
      lg: 'text-base px-3 py-1',
    },
  },
  defaultVariants: {
    status: 'draft',
    size: 'md',
  },
});

export function InvoiceStatusBadge({
  status,
  size = 'md',
  className,
}: InvoiceStatusBadgeProps) {
  const labels: Record<InvoiceStatus, string> = {
    draft: 'Draft',
    sent: 'Sent',
    paid: 'Paid',
    overdue: 'Overdue',
    cancelled: 'Cancelled',
  };

  return (
    <Badge className={cn(statusVariants({ status, size }), className)}>
      {labels[status]}
    </Badge>
  );
}
```

### Step 4: Create Index Export

Create `index.ts`:

```typescript
export { InvoiceStatusBadge } from './invoice-status-badge';
export type { InvoiceStatusBadgeProps, InvoiceStatus } from './invoice-status-badge.types';
```

### Step 5: Atomic Design Guidelines

| Level | Description | Examples | Rules |
|-------|-------------|----------|-------|
| **Atom** | Smallest UI unit, no business logic | Badge, Button, Input, Avatar | Must use @kaven/ui primitives, no API calls |
| **Molecule** | Combination of atoms with minimal logic | SearchBar, FormField, StatCard | Can combine atoms, minimal state |
| **Organism** | Complex sections with business logic | InvoiceTable, UserProfile, Sidebar | Can use hooks, TanStack Query, i18n |

### Step 6: Dark Mode Support

Always include dark mode variants:

```tsx
// Use Tailwind dark: prefix
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
  <p className="text-gray-600 dark:text-gray-400">Subtitle</p>
</div>
```

All `@kaven/ui` components already handle dark mode internally. Only add dark variants for custom styling.

### Step 7: Responsive Design

Follow mobile-first approach:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards */}
</div>

<div className="p-4 md:p-6 lg:p-8">
  {/* Content with responsive padding */}
</div>

<span className="hidden sm:inline">Full Label</span>
<span className="sm:hidden">Short</span>
```

### Step 8: Register in Module Index

If the component is in `packages/ui`, update `packages/ui/src/index.ts`:

```typescript
export { InvoiceStatusBadge } from './components/invoice-status-badge';
```

If app-specific, ensure the component directory is discoverable by barrel exports or direct imports.
