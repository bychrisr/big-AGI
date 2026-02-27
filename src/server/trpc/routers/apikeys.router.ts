import * as z from 'zod/v4';
import { TRPCError } from '@trpc/server';

import { createSupabaseServerClient } from '~/common/supabase/server';
import { decrypt, encrypt } from '~/server/utils/encryption.server';
import { env } from '~/server/env.server';
import { createTRPCRouter, publicProcedure } from '../trpc.server';


/** Returns the encryption secret or throws in production. */
function requireEncryptionSecret(): string {
  const secret = env.ENCRYPTION_SECRET;
  if (!secret) {
    if (process.env['NODE_ENV'] === 'production')
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'ENCRYPTION_SECRET not configured' });
    // Dev mode: fall back to a fixed dev-only key (never used with real data)
    return 'dev-mode-insecure-key-32-chars!!';
  }
  return secret;
}


export const apiKeysRouter = createTRPCRouter({

  upsertKey: publicProcedure
    .input(z.object({ provider: z.string(), key: z.string() }))
    .mutation(async ({ input }) => {
      const supabase = await createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' });

      const secret = requireEncryptionSecret();
      const encryptedKey = encrypt(input.key, secret);

      const { error } = await supabase.from('user_api_keys').upsert({
        user_id: user.id,
        provider: input.provider,
        encrypted_key: encryptedKey,
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

      if (!data?.encrypted_key) return null;

      const secret = requireEncryptionSecret();
      try {
        return decrypt(data.encrypted_key, secret);
      } catch {
        // Key stored in old plaintext format (pre-encryption migration)
        return data.encrypted_key;
      }
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

      return (data ?? []).map(r => r.provider as string);
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
