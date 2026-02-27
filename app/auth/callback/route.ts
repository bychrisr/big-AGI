/**
 * Supabase OAuth callback handler.
 * Exchanges the auth code for a session and ensures user_preferences is initialized.
 * Runs after Google (or any OAuth) login redirect.
 */
import { NextRequest, NextResponse } from 'next/server';

import { createSupabaseServerClient } from '~/common/supabase/server';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Extract username from user_metadata (set via Supabase Dashboard or update-user)
      // Falls back to email prefix (e.g. "rodrigues0christian" from "rodrigues0christian@gmail.com")
      const metaUsername = (data.user.user_metadata?.['teamai_username'] as string | undefined)
        ?? (data.user.email?.split('@')[0] ?? null);

      // Ensure user_preferences row exists — ignore if already there
      if (metaUsername) {
        await supabase.from('user_preferences').upsert({
          user_id: data.user.id,
          username: metaUsername,
          display_name: (data.user.user_metadata?.['full_name'] as string | undefined) ?? metaUsername,
        }, { onConflict: 'user_id', ignoreDuplicates: true });
      }
    }
  }

  // Redirect to home after successful auth (or even on failure — let app handle it)
  return NextResponse.redirect(`${origin}/`);
}
