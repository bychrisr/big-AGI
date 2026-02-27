# Next.js Page Template — Kaven Framework

> Use this template when creating pages in the Admin Panel or Tenant App (Next.js App Router).

---

## File Structure

```
apps/{admin-panel|tenant-app}/src/app/[locale]/(dashboard)/{feature}/
├── page.tsx        # Main page (Server Component by default)
├── layout.tsx      # Optional layout wrapper
├── loading.tsx     # Suspense fallback with skeletons
├── error.tsx       # Error boundary
├── [id]/
│   ├── page.tsx    # Detail page
│   └── edit/
│       └── page.tsx # Edit form page
└── new/
    └── page.tsx    # Create form page
```

---

## Server Component Page (List Page)

```tsx
// app/[locale]/(dashboard)/items/page.tsx
import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';
import { ItemsPageClient } from './items-page-client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('items');
  return { title: t('pageTitle') };
}

export default async function ItemsPage() {
  const t = await getTranslations('items');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('pageTitle')}</h1>
          <p className="text-muted-foreground">{t('pageDescription')}</p>
        </div>
      </div>
      <ItemsPageClient />
    </div>
  );
}
```

---

## Client Component (Data Table with TanStack Query)

```tsx
// app/[locale]/(dashboard)/items/items-page-client.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@kaven/ui/button';
import { DataTable } from '@/components/data-table';
import { Plus } from 'lucide-react';
import { useItems } from '@/hooks/use-items';
import { columns } from './columns';

export function ItemsPageClient() {
  const t = useTranslations('items');
  const router = useRouter();
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });

  const { data, isLoading, isError } = useItems({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => router.push('/items/new')}>
          <Plus className="mr-2 h-4 w-4" />
          {t('actions.create')}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        totalItems={data?.meta.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        isLoading={isLoading}
      />
    </div>
  );
}
```

---

## TanStack Query Hook

```tsx
// hooks/use-items.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Item, ListItemsQuery, CreateItemInput } from '@/types/items';

export function useItems(query: ListItemsQuery) {
  return useQuery({
    queryKey: ['items', query],
    queryFn: () => api.get<{ data: Item[]; meta: PaginationMeta }>('/items', { params: query }),
  });
}

export function useItem(id: string) {
  return useQuery({
    queryKey: ['items', id],
    queryFn: () => api.get<Item>(`/items/${id}`),
    enabled: !!id,
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateItemInput) => api.post<Item>('/items', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}

export function useUpdateItem(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CreateItemInput>) => api.put<Item>(`/items/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['items', id] });
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}
```

---

## Layout Pattern

```tsx
// app/[locale]/(dashboard)/items/layout.tsx
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from '@kaven/ui/breadcrumb';

export default function ItemsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="/items">Items</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>
      {children}
    </div>
  );
}
```

---

## Loading State

```tsx
// app/[locale]/(dashboard)/items/loading.tsx
import { Skeleton } from '@kaven/ui/skeleton';

export default function ItemsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="rounded-md border">
        <div className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## Error Boundary

```tsx
// app/[locale]/(dashboard)/items/error.tsx
'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@kaven/ui/button';
import { AlertCircle } from 'lucide-react';

export default function ItemsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('common');

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <h2 className="text-xl font-semibold">{t('error.title')}</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <Button onClick={reset} variant="outline">
        {t('error.retry')}
      </Button>
    </div>
  );
}
```

---

## Form Page (Create/Edit)

```tsx
// app/[locale]/(dashboard)/items/new/page.tsx
'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@kaven/ui/button';
import { Input } from '@kaven/ui/input';
import { Textarea } from '@kaven/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kaven/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@kaven/ui/card';
import { useCreateItem } from '@/hooks/use-items';
import { toast } from 'sonner';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewItemPage() {
  const t = useTranslations('items');
  const router = useRouter();
  const createItem = useCreateItem();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', description: '' },
  });

  async function onSubmit(values: FormValues) {
    try {
      await createItem.mutateAsync(values);
      toast.success(t('messages.created'));
      router.push('/items');
    } catch (error) {
      toast.error(t('messages.createError'));
    }
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>{t('create.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fields.name')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('fields.namePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fields.description')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('fields.descriptionPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                {t('actions.cancel')}
              </Button>
              <Button type="submit" disabled={createItem.isPending}>
                {createItem.isPending ? t('actions.creating') : t('actions.create')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
```

---

## Notes

- Server Components are the default; only add `'use client'` when you need interactivity.
- Always use `next-intl` for all user-facing strings (`useTranslations` client-side, `getTranslations` server-side).
- Import UI primitives from `@kaven/ui/*`, never from raw shadcn paths.
- Use `sonner` for toast notifications (already configured in the root layout).
- The `api` client in `@/lib/api-client` automatically attaches the JWT token and tenant context.
