import { NextResponse, type NextRequest } from 'next/server';

import { createSupabaseServerClient } from '~/common/supabase/server';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_ENABLED = Boolean(process.env['NEXT_PUBLIC_SUPABASE_URL']);


export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!SUPABASE_ENABLED) {
    return NextResponse.json({ sessions: [] });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');
    const projectFilter = searchParams.get('project'); // e.g. ?project=kaven

    // Single session with full turns
    if (sessionId) {
      const { data, error } = await supabase
        .from('debate_sessions')
        .select('session_id, topic, minds, turns, token_usage, created_at')
        .eq('user_id', user.id)
        .eq('session_id', sessionId)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      return NextResponse.json({ session: data });
    }

    // List sessions (without turns for performance)
    // Filter by project stored in token_usage JSONB: token_usage->>'project' = projectFilter
    let query = supabase
      .from('debate_sessions')
      .select('session_id, topic, minds, token_usage, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (projectFilter) {
      // PostgREST filter on JSONB field
      query = query.filter('token_usage->>project', 'eq', projectFilter);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sessions: data ?? [] });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
