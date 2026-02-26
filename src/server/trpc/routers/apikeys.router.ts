import * as z from 'zod/v4';
import { createTRPCRouter, publicProcedure } from '../trpc.server';
import { createSupabaseServerClient } from '~/common/supabase/server';
import { TRPCError } from '@trpc/server';


export const apiKeysRouter = createTRPCRouter({

  upsertKey: publicProcedure
    .input(z.object({ provider: z.string(), key: z.string() }))
    .mutation(async ({ input }) => {
      const supabase = await createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' });

      const { error } = await supabase.from('user_api_keys').upsert({
        user_id: user.id,
        provider: input.provider,
        encrypted_key: input.key,
      }, { onConflict: 'user_id,provider' });

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

      return { success: true };
    }),

  getKey: publicProcedure
    .input(z.object({ provider: z.string() }))
    .query(async ({ input }) => {
      const supabase = await createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from('user_api_keys')
        .select('encrypted_key')
        .eq('user_id', user.id)
        .eq('provider', input.provider)
        .single();

      return data?.encrypted_key ?? null;
    }),

  listProviders: publicProcedure
    .query(async () => {
      const supabase = await createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data } = await supabase
        .from('user_api_keys')
        .select('provider')
        .eq('user_id', user.id);

      return (data ?? []).map(r => r.provider);
    }),

  deleteKey: publicProcedure
    .input(z.object({ provider: z.string() }))
    .mutation(async ({ input }) => {
      const supabase = await createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' });

      const { error } = await supabase
        .from('user_api_keys')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', input.provider);

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

      return { success: true };
    }),

});
