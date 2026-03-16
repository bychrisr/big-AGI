import { NextResponse, type NextRequest } from 'next/server';

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

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/courses/[id] — fetch a specific draft
export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const userId = await resolveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;

  if (!SUPABASE_ENABLED) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('user_course_drafts')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error('[GET /api/courses/[id]] Supabase error:', error);
    return NextResponse.json({ error: 'Failed to fetch course' }, { status: 500 });
  }

  return NextResponse.json({ data });
}

type PatchableFields = {
  title?: string;
  slug?: string;
  mode?: string;
  status?: string;
  brief_data?: Record<string, unknown>;
  curriculum_data?: Record<string, unknown>;
  script_data?: Record<string, unknown>;
  validation_data?: Record<string, unknown>;
};

const ALLOWED_STATUSES = [
  'planning',
  'brief',
  'research',
  'curriculum',
  'script_design',
  'generation',
  'validation',
  'published',
] as const;

// PATCH /api/courses/[id] — update draft fields
export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const userId = await resolveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;

  let body: PatchableFields;
  try {
    body = await request.json() as PatchableFields;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Validate status if provided
  if (body.status && !ALLOWED_STATUSES.includes(body.status as typeof ALLOWED_STATUSES[number])) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(', ')}` },
      { status: 400 }
    );
  }

  // Validate mode if provided
  if (body.mode && body.mode !== 'greenfield' && body.mode !== 'brownfield') {
    return NextResponse.json(
      { error: 'mode must be greenfield or brownfield' },
      { status: 400 }
    );
  }

  // Build update payload — only include provided fields
  const update: Record<string, unknown> = {};
  if (body.title !== undefined) update['title'] = body.title;
  if (body.slug !== undefined) update['slug'] = body.slug;
  if (body.mode !== undefined) update['mode'] = body.mode;
  if (body.status !== undefined) update['status'] = body.status;
  if (body.brief_data !== undefined) update['brief_data'] = body.brief_data;
  if (body.curriculum_data !== undefined) update['curriculum_data'] = body.curriculum_data;
  if (body.script_data !== undefined) update['script_data'] = body.script_data;
  if (body.validation_data !== undefined) update['validation_data'] = body.validation_data;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  if (!SUPABASE_ENABLED) {
    return NextResponse.json({ data: { id, ...update } });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('user_course_drafts')
    .update(update)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error('[PATCH /api/courses/[id]] Supabase error:', error);
    return NextResponse.json({ error: 'Failed to update course' }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// DELETE /api/courses/[id] — remove a draft
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const userId = await resolveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;

  if (!SUPABASE_ENABLED) {
    return NextResponse.json({ success: true, dev: true });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('user_course_drafts')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('[DELETE /api/courses/[id]] Supabase error:', error);
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
