import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { apiAsyncNode } from '~/common/util/trpc.client';


/**
 * React hook for reading and writing per-provider API keys stored in Supabase.
 * Requires the user to be authenticated.
 */
export function useApiKey(provider: string) {
  const queryClient = useQueryClient();
  const queryKey = ['apikey', provider];

  const { data: key } = useQuery({
    queryKey,
    queryFn: () => apiAsyncNode.apikeys.getKey.query({ provider }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const saveMutation = useMutation({
    mutationFn: (newKey: string) => apiAsyncNode.apikeys.upsertKey.mutate({ provider, key: newKey }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => apiAsyncNode.apikeys.deleteKey.mutate({ provider }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const saveKey = useCallback((newKey: string) => saveMutation.mutateAsync(newKey), [saveMutation]);
  const removeKey = useCallback(() => removeMutation.mutateAsync(), [removeMutation]);

  return {
    key: key ?? null,
    saveKey,
    removeKey,
  };
}
