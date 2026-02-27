import { NextRequest, NextResponse } from 'next/server';

import { createSupabaseServerClient } from '~/common/supabase/server';
import { extractPatterns } from '~/server/projects/extract-patterns';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_ENABLED = Boolean(process.env['NEXT_PUBLIC_SUPABASE_URL']);


export async function GET(_request: NextRequest): Promise<NextResponse> {
  if (!SUPABASE_ENABLED) return NextResponse.json({ projects: [] });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('user_projects')
    .select('project_name, claude_md, patterns, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ projects: data ?? [] });
}


export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!SUPABASE_ENABLED) return NextResponse.json({ success: true, dev: true });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json()) as { project_name?: string; claude_md?: string };
  const { project_name, claude_md } = body;
  if (!project_name) return NextResponse.json({ error: 'Missing project_name' }, { status: 400 });

  // Simple hash to avoid reprocessing unchanged CLAUDE.md
  const hash = claude_md
    ? Buffer.from(claude_md).toString('base64').slice(0, 32)
    : null;

  // Extract patterns from CLAUDE.md content
  const patterns = claude_md ? extractPatterns(claude_md) : {};

  const { error } = await supabase.from('user_projects').upsert({
    user_id: user.id,
    project_name,
    claude_md: claude_md ?? null,
    claude_md_hash: hash,
    patterns,
  }, { onConflict: 'user_id,project_name' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
