---
task: addPage()
responsavel: "@kaven-frontend-dev"
responsavel_type: agent
atomic_layer: task
Entrada:
  - page_name: string
  - app: string # "admin" | "tenant"
  - route_path: string
  - data_requirements: list # APIs to fetch
  - layout: string # "default" | "sidebar" | "fullwidth"
Saida:
  - page_tsx: file
  - layout_tsx: file
  - loading_tsx: file
  - error_tsx: file
  - hooks: list
  - i18n_keys: list
Checklist:
  - [ ] Create page.tsx with Server Component or Client Component
  - [ ] Create layout.tsx if needed
  - [ ] Create loading.tsx skeleton
  - [ ] Create error.tsx boundary
  - [ ] Add TanStack Query hooks for data fetching
  - [ ] Add i18n translations (en, pt-BR)
  - [ ] Add to sidebar navigation config
  - [ ] Use @kaven/ui components exclusively
  - [ ] Implement responsive design
  - [ ] Support dark mode
---

# addPage()

Add a new page to the Kaven Admin Panel or Tenant App following Next.js App Router patterns with proper loading states, error boundaries, and data fetching.

## Usage

```
@kaven-frontend-dev *task addPage --name "InvoiceHistory" --app "tenant" --route "/invoices" --data '["/api/v1/invoices"]' --layout "sidebar"
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page_name` | string | yes | PascalCase name for the page |
| `app` | string | yes | Target app: "admin" or "tenant" |
| `route_path` | string | yes | URL path (e.g., "/invoices") |
| `data_requirements` | list | yes | API endpoints this page needs |
| `layout` | string | no | Layout type. Default: "sidebar" |

## Output Format

```
apps/{app}/src/app/(dashboard)/{route}/
  ├── page.tsx        # Main page component
  ├── layout.tsx      # Layout wrapper (if custom)
  ├── loading.tsx     # Loading skeleton
  └── error.tsx       # Error boundary
apps/{app}/src/hooks/
  └── use-{feature}.ts # TanStack Query hook
apps/{app}/src/locales/
  ├── en/{feature}.json
  └── pt-BR/{feature}.json
```

## Implementation Steps

### Step 1: Create the Route Directory

```bash
mkdir -p apps/{app}/src/app/(dashboard)/{route}
```

### Step 2: Create the Page Component

Create `page.tsx`:

```tsx
import { Metadata } from 'next';
import { InvoiceHistoryContent } from './components/invoice-history-content';

export const metadata: Metadata = {
  title: 'Invoice History | Kaven',
  description: 'View and manage your invoice history',
};

export default function InvoiceHistoryPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Invoice History</h1>
      </div>
      <InvoiceHistoryContent />
    </div>
  );
}
```

### Step 3: Create the Client Content Component

For pages that need client-side interactivity and data fetching:

```tsx
'use client';

import { useInvoices } from '@/hooks/use-invoices';
import { DataTable } from '@kaven/ui/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@kaven/ui/card';
import { Skeleton } from '@kaven/ui/skeleton';
import { Alert, AlertDescription } from '@kaven/ui/alert';
import { useTranslation } from '@/lib/i18n';

export function InvoiceHistoryContent() {
  const { t } = useTranslation('invoices');
  const { data, isLoading, error } = useInvoices();

  if (isLoading) {
    return <InvoicesSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t('errors.loadFailed')}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={data?.items ?? []} />
      </CardContent>
    </Card>
  );
}
```

### Step 4: Create loading.tsx

```tsx
import { Skeleton } from '@kaven/ui/skeleton';
import { Card, CardContent, CardHeader } from '@kaven/ui/card';

export default function InvoiceHistoryLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-48" />
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
```

### Step 5: Create error.tsx

```tsx
'use client';

import { useEffect } from 'react';
import { Button } from '@kaven/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@kaven/ui/alert';
import { AlertTriangle } from 'lucide-react';

export default function InvoiceHistoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Invoice History Error:', error);
  }, [error]);

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription>
        Failed to load invoice history.
        <Button variant="outline" size="sm" onClick={reset} className="ml-2">
          Try again
        </Button>
      </AlertDescription>
    </Alert>
  );
}
```

### Step 6: Create the TanStack Query Hook

Create `apps/{app}/src/hooks/use-invoices.ts`:

```tsx
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Invoice {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface InvoicesResponse {
  items: Invoice[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export function useInvoices(options?: { page?: number; status?: string }) {
  return useQuery<InvoicesResponse>({
    queryKey: ['invoices', options],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/invoices', { params: options });
      return data;
    },
  });
}
```

### Step 7: Add i18n Translations

Create `apps/{app}/src/locales/en/invoices.json`:
```json
{
  "title": "Invoice History",
  "columns": { "id": "Invoice #", "amount": "Amount", "status": "Status", "date": "Date" },
  "errors": { "loadFailed": "Failed to load invoices. Please try again." }
}
```

Create `apps/{app}/src/locales/pt-BR/invoices.json`:
```json
{
  "title": "Historico de Faturas",
  "columns": { "id": "Fatura #", "amount": "Valor", "status": "Status", "date": "Data" },
  "errors": { "loadFailed": "Falha ao carregar faturas. Tente novamente." }
}
```

### Step 8: Add to Sidebar Navigation

Update the sidebar config file:

```typescript
// In apps/{app}/src/config/navigation.ts
{
  title: 'Invoices',
  href: '/invoices',
  icon: FileText,
  badge: undefined,
}
```

### Step 9: Responsive and Dark Mode

- Use Tailwind responsive prefixes: `sm:`, `md:`, `lg:`.
- Use `dark:` variants for dark mode classes.
- Test on mobile (375px), tablet (768px), and desktop (1280px).
- All `@kaven/ui` components already support dark mode.
