import { createSupabaseServerClient } from './server';


export type AuthUser = {
  id: string;
  email: string | undefined;
};

/**
 * Extracts the authenticated user from the request via Supabase JWT.
 * Returns null if not authenticated.
 */
export async function getAuthenticatedUser(): Promise<AuthUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) return null;

  return {
    id: user.id,
    email: user.email,
  };
}
