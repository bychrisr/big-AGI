---
task: addHook()
responsavel: "@kaven-frontend-dev"
responsavel_type: agent
atomic_layer: task
Entrada:
  - hook_name: string
  - purpose: string
  - api_endpoint: string
  - method: string # "query" | "mutation"
Saida:
  - hook_file: file
  - hook_types: file
Checklist:
  - [ ] Create hook file with proper naming (use-{feature}.ts)
  - [ ] Use useQuery or useMutation from TanStack Query
  - [ ] Add comprehensive TypeScript types
  - [ ] Handle loading, error, and success states
  - [ ] Add cache invalidation strategy
  - [ ] Configure staleTime and gcTime appropriately
  - [ ] Add query key factory pattern
  - [ ] Document usage with JSDoc
---

# addHook()

Create a custom React hook using TanStack Query (React Query) for data fetching from the Kaven API, with proper typing, caching, and error handling.

## Usage

```
@kaven-frontend-dev *task addHook --name "useInvoices" --purpose "Fetch paginated invoice list" --endpoint "/api/v1/invoices" --method "query"
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `hook_name` | string | yes | camelCase hook name starting with "use" |
| `purpose` | string | yes | What this hook does |
| `api_endpoint` | string | yes | API endpoint to call |
| `method` | string | yes | "query" for GET, "mutation" for POST/PUT/DELETE |

## Output Format

```
apps/{app}/src/hooks/
  ├── use-{feature}.ts       # Hook implementation
  └── query-keys.ts          # Updated query key factory
```

## Implementation Steps

### Step 1: Define Types

At the top of the hook file or in a shared types file:

```typescript
// Types matching the API response
export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  description: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoicesResponse {
  items: Invoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface InvoiceFilters {
  page?: number;
  limit?: number;
  status?: Invoice['status'];
  search?: string;
}

export interface CreateInvoiceInput {
  amount: number;
  currency: string;
  description: string;
  dueDate: string;
}
```

### Step 2: Create Query Key Factory

Update `apps/{app}/src/hooks/query-keys.ts`:

```typescript
export const queryKeys = {
  invoices: {
    all: ['invoices'] as const,
    lists: () => [...queryKeys.invoices.all, 'list'] as const,
    list: (filters: InvoiceFilters) =>
      [...queryKeys.invoices.lists(), filters] as const,
    details: () => [...queryKeys.invoices.all, 'detail'] as const,
    detail: (id: string) =>
      [...queryKeys.invoices.details(), id] as const,
  },
  // ... other domain keys
};
```

### Step 3: Create the Query Hook (for GET requests)

```typescript
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from './query-keys';
import type { InvoicesResponse, InvoiceFilters } from './types';

/**
 * Fetch a paginated list of invoices for the current tenant.
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useInvoices({ page: 1, status: 'paid' });
 * ```
 */
export function useInvoices(
  filters: InvoiceFilters = {},
  options?: Omit<UseQueryOptions<InvoicesResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<InvoicesResponse>({
    queryKey: queryKeys.invoices.list(filters),
    queryFn: async () => {
      const { data } = await api.get<InvoicesResponse>('/api/v1/invoices', {
        params: filters,
      });
      return data;
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Fetch a single invoice by ID.
 */
export function useInvoice(
  id: string,
  options?: Omit<UseQueryOptions<Invoice>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Invoice>({
    queryKey: queryKeys.invoices.detail(id),
    queryFn: async () => {
      const { data } = await api.get<Invoice>(`/api/v1/invoices/${id}`);
      return data;
    },
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute
    ...options,
  });
}
```

### Step 4: Create the Mutation Hook (for POST/PUT/DELETE)

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from './query-keys';
import { toast } from '@kaven/ui/toast';

/**
 * Create a new invoice.
 *
 * @example
 * ```tsx
 * const { mutate: createInvoice, isPending } = useCreateInvoice();
 * createInvoice({ amount: 100, currency: 'USD', description: 'Test' });
 * ```
 */
export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateInvoiceInput) => {
      const { data } = await api.post<Invoice>('/api/v1/invoices', input);
      return data;
    },
    onSuccess: () => {
      // Invalidate all invoice lists to refresh data
      queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.lists(),
      });
      toast.success('Invoice created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create invoice: ${error.message}`);
    },
  });
}

/**
 * Delete an invoice by ID.
 */
export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/invoices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.all,
      });
      toast.success('Invoice deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete invoice: ${error.message}`);
    },
  });
}
```

### Step 5: Cache Strategy Guidelines

| Data Type | staleTime | gcTime | Reason |
|-----------|-----------|--------|--------|
| Lists (paginated) | 30s | 5min | Frequently changing, need fresh data |
| Detail views | 1min | 10min | Less frequent changes |
| Static config | 5min | 30min | Rarely changes |
| User profile | 2min | 10min | Important to keep current |

### Step 6: Optimistic Updates (for mutations)

```typescript
export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await api.patch(`/api/v1/invoices/${id}`, { status });
      return data;
    },
    onMutate: async ({ id, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.invoices.detail(id) });
      // Snapshot previous value
      const previous = queryClient.getQueryData(queryKeys.invoices.detail(id));
      // Optimistically update
      queryClient.setQueryData(queryKeys.invoices.detail(id), (old: Invoice) => ({
        ...old,
        status,
      }));
      return { previous };
    },
    onError: (_err, { id }, context) => {
      // Rollback on error
      queryClient.setQueryData(queryKeys.invoices.detail(id), context?.previous);
      toast.error('Failed to update status');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
    },
  });
}
```

### Step 7: Usage in Components

```tsx
'use client';

import { useInvoices, useDeleteInvoice } from '@/hooks/use-invoices';

export function InvoiceList() {
  const { data, isLoading, error } = useInvoices({ page: 1 });
  const { mutate: deleteInvoice, isPending: isDeleting } = useDeleteInvoice();

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorAlert message={error.message} />;

  return (
    <ul>
      {data?.items.map((invoice) => (
        <li key={invoice.id}>
          {invoice.description} — ${invoice.amount}
          <button onClick={() => deleteInvoice(invoice.id)} disabled={isDeleting}>
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}
```
