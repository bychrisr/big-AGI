import { NextResponse, type NextRequest } from 'next/server';

import { createSupabaseServerClient } from '~/common/supabase/server';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Dev mode: skip auth when Supabase is not configured
const SUPABASE_ENABLED = Boolean(process.env['NEXT_PUBLIC_SUPABASE_URL']);

type MemoryMode = 'general' | 'production' | 'trail' | 'consultation';

const VALID_MODES: MemoryMode[] = ['general', 'production', 'trail', 'consultation'];

interface MemoryRow {
  key: string;
  value: string;
  confidence: number;
  source: string;
  mode: MemoryMode;
  created_at: string;
  last_applied: string;
}


async function resolveUserId(request: NextRequest): Promise<string | null> {
  if (!SUPABASE_ENABLED) return 'dev-user';

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}


// GET /api/memory?mode=general — list user memories ordered by confidence DESC
// When mode is provided, returns memories for that mode + 'general' memories.
// When mode is omitted, returns all memories.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = await resolveUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!SUPABASE_ENABLED) {
    return NextResponse.json({ memories: [] });
  }

  const modeParam = new URL(request.url).searchParams.get('mode') as MemoryMode | null;
  if (modeParam && !VALID_MODES.includes(modeParam)) {
    return NextResponse.json(
      { error: `Invalid mode. Must be one of: ${VALID_MODES.join(', ')}` },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('user_memories')
    .select('key, value, confidence, source, mode, created_at, last_applied')
    .eq('user_id', userId)
    .order('confidence', { ascending: false });

  // Filter: mode-specific memories + general memories (cross-mode context)
  if (modeParam && modeParam !== 'general') {
    query = query.in('mode', [modeParam, 'general']);
  } else if (modeParam === 'general') {
    query = query.eq('mode', 'general');
  }
  // No modeParam → return all

  const { data, error } = await query;

  if (error) {
    console.error('[GET /api/memory] Supabase error:', error);
    return NextResponse.json({ error: 'Failed to fetch memories' }, { status: 500 });
  }

  return NextResponse.json({ memories: data ?? [] });
}


// POST /api/memory — upsert a memory { key, value, source?, mode? }
export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = await resolveUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { key?: string; value?: string; source?: string; mode?: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { key, value, source = 'explicit', mode = 'general' } = body;
  if (!key?.trim() || !value?.trim()) {
    return NextResponse.json({ error: 'key and value are required' }, { status: 400 });
  }

  if (!VALID_MODES.includes(mode as MemoryMode)) {
    return NextResponse.json(
      { error: `Invalid mode. Must be one of: ${VALID_MODES.join(', ')}` },
      { status: 400 }
    );
  }

  if (!SUPABASE_ENABLED) {
    return NextResponse.json({ success: true, dev: true });
  }

  const confidence = source === 'explicit' ? 1.0 : 0.7;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('user_memories')
    .upsert({
      user_id: userId,
      key: key.trim(),
      value: value.trim(),
      confidence,
      source,
      mode,
      last_applied: new Date().toISOString(),
    }, { onConflict: 'user_id,key' });

  if (error) {
    console.error('[POST /api/memory] Supabase error:', error);
    return NextResponse.json({ error: 'Failed to save memory' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}


// DELETE /api/memory?key=... — remove a specific memory
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const userId = await resolveUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const key = new URL(request.url).searchParams.get('key');
  if (!key) return NextResponse.json({ error: 'key query param required' }, { status: 400 });

  if (!SUPABASE_ENABLED) {
    return NextResponse.json({ success: true, dev: true });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('user_memories')
    .delete()
    .eq('user_id', userId)
    .eq('key', key);

  if (error) {
    console.error('[DELETE /api/memory] Supabase error:', error);
    return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
