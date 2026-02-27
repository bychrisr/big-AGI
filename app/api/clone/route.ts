import { NextRequest, NextResponse } from 'next/server';

import { createSupabaseServerClient } from '~/common/supabase/server';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_ENABLED = Boolean(process.env['NEXT_PUBLIC_SUPABASE_URL']);


async function resolveUserId(): Promise<string | null> {
  if (!SUPABASE_ENABLED) return 'dev-user';

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}


/**
 * GET /api/clone — returns the user's clone (DNA Mental) layers.
 */
export async function GET(_request: NextRequest): Promise<NextResponse> {
  const userId = await resolveUserId();
  if (!userId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!SUPABASE_ENABLED) {
    return NextResponse.json({
      clone: null,
      message: 'Supabase not configured (dev mode)',
    });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('user_clone')
    .select('version, fidelity, layers, milestone, created_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[GET /api/clone] Supabase error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clone' },
      { status: 500 },
    );
  }

  return NextResponse.json({ clone: data });
}
