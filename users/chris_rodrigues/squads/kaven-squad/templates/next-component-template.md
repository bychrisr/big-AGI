# Next.js Component Template — Kaven Framework

> Use this template when creating reusable React components for the Admin Panel or Tenant App.

---

## File Location (Atomic Design)

```
packages/ui/src/
├── atoms/           # Button, Input, Badge, Avatar, Skeleton
├── molecules/       # FormField, SearchInput, StatCard, UserMenu
├── organisms/       # DataTable, Sidebar, CommandPalette, FileUploader
└── index.ts         # Public API exports

apps/{admin-panel|tenant-app}/src/components/
├── {feature}/       # Feature-specific components (not shared)
└── shared/          # App-specific shared components
```

- **Atoms**: Single UI elements with no internal logic. Map to a single HTML element or primitive.
- **Molecules**: Composition of 2-3 atoms with minimal logic (e.g., label + input + error).
- **Organisms**: Complex, self-contained sections with state and data fetching.

---

## Basic Component Pattern

```tsx
// packages/ui/src/molecules/stat-card.tsx
import { cn } from '@kaven/ui/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@kaven/ui/card';
import { type LucideIcon } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendValue,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('transition-shadow hover:shadow-md', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trendValue) && (
          <p className="text-xs text-muted-foreground mt-1">
            {trendValue && (
              <span
                className={cn(
                  'inline-flex items-center mr-1 font-medium',
                  trend === 'up' && 'text-emerald-600 dark:text-emerald-400',
                  trend === 'down' && 'text-red-600 dark:text-red-400',
                  trend === 'neutral' && 'text-muted-foreground'
                )}
              >
                {trendValue}
              </span>
            )}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Component with forwardRef

```tsx
// packages/ui/src/atoms/search-input.tsx
import * as React from 'react';
import { cn } from '@kaven/ui/lib/utils';
import { Input } from '@kaven/ui/input';
import { Search, X } from 'lucide-react';

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onClear?: () => void;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onClear, ...props }, ref) => {
    return (
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={ref}
          type="search"
          className={cn('pl-9 pr-9', className)}
          value={value}
          {...props}
        />
        {value && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);
SearchInput.displayName = 'SearchInput';

export { SearchInput };
```

---

## Component with Internal State and Dark Mode

```tsx
// packages/ui/src/molecules/theme-toggle.tsx
'use client';

import { useTheme } from 'next-themes';
import { cn } from '@kaven/ui/lib/utils';
import { Button } from '@kaven/ui/button';
import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}

export function ThemeToggle({ className, size = 'default' }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(className)}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle theme"
    >
      {/* Uses CSS variables for smooth transition */}
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
```

---

## Responsive Design Pattern (Mobile-First)

```tsx
// packages/ui/src/organisms/page-header.tsx
import { cn } from '@kaven/ui/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        // Mobile: stack vertically
        'flex flex-col gap-2',
        // Desktop: horizontal layout
        'sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground sm:text-base">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
```

---

## Compound Component Pattern

```tsx
// packages/ui/src/molecules/empty-state.tsx
import { cn } from '@kaven/ui/lib/utils';
import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center',
        'min-h-[200px]',
        className
      )}
    >
      {Icon && (
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
```

---

## Exporting from @kaven/ui

```typescript
// packages/ui/src/index.ts
export { StatCard, type StatCardProps } from './molecules/stat-card';
export { SearchInput, type SearchInputProps } from './atoms/search-input';
export { ThemeToggle } from './molecules/theme-toggle';
export { PageHeader } from './organisms/page-header';
export { EmptyState } from './molecules/empty-state';
```

---

## The cn() Utility

```typescript
// packages/ui/src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## Notes

- Always use CSS variables for colors (e.g., `text-foreground`, `bg-background`, `text-muted-foreground`) so dark mode works automatically.
- Use `cn()` to merge className props. Never use string concatenation for classes.
- Prefer composition over prop drilling. Pass `children` or render props for flexible layouts.
- Keep components focused: one component, one responsibility.
- Use `'use client'` only when the component uses hooks, event handlers, or browser APIs.
- Icons come from `lucide-react`. Do not import other icon libraries.
