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

// GET /api/courses — list user's course drafts
export async function GET(): Promise<NextResponse> {
  const userId = await resolveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!SUPABASE_ENABLED) {
    return NextResponse.json({ data: [] });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('user_course_drafts')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[GET /api/courses] Supabase error:', error);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

interface CreateCourseBody {
  title?: string;
  slug?: string;
  mode?: string;
}

// POST /api/courses — create new course draft
export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = await resolveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: CreateCourseBody;
  try {
    body = await request.json() as CreateCourseBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { title, slug, mode = 'greenfield' } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }

  if (!slug?.trim()) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  if (mode !== 'greenfield' && mode !== 'brownfield') {
    return NextResponse.json(
      { error: 'mode must be greenfield or brownfield' },
      { status: 400 }
    );
  }

  if (!SUPABASE_ENABLED) {
    return NextResponse.json({
      data: {
        id: 'dev-' + Date.now(),
        user_id: userId,
        slug: slug.trim(),
        title: title.trim(),
        mode,
        status: 'planning',
        brief_data: {},
        curriculum_data: {},
        script_data: {},
        validation_data: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('user_course_drafts')
    .insert({
      user_id: userId,
      slug: slug.trim(),
      title: title.trim(),
      mode,
      status: 'planning',
    })
    .select('*')
    .single();

  if (error) {
    console.error('[POST /api/courses] Supabase error:', error);
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A course with this slug already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
