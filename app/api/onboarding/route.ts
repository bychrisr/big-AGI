import { NextResponse, type NextRequest } from 'next/server';

import { createSupabaseServerClient } from '~/common/supabase/server';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_ENABLED = Boolean(process.env['NEXT_PUBLIC_SUPABASE_URL']);


interface OnboardingAnswers {
  display_name?: string;
  work_area?: string;
  interests?: string[];
  inspirations?: string[];
  public_profiles?: { instagram?: string; youtube?: string; website?: string };
  ai_experience?: { uses_ai: boolean; platforms?: string[]; export_provided?: boolean };
  current_challenge?: string;
  api_key?: string; // Never persisted — passed to apikeys router separately
}


async function resolveUserId(request: NextRequest): Promise<string | null> {
  if (!SUPABASE_ENABLED) return 'dev-user';
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}


// POST /api/onboarding — save answers to user_preferences + user_clone
export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = await resolveUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: OnboardingAnswers;
  try {
    body = await request.json() as OnboardingAnswers;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!SUPABASE_ENABLED) {
    return NextResponse.json({ success: true, dev: true });
  }

  const supabase = await createSupabaseServerClient();

  // Build preference entries from answers (excluding api_key — handled separately)
  const { api_key: _apiKey, ...answers } = body;
  const now = new Date().toISOString();

  const prefEntries = Object.entries(answers)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([key, value]) => ({
      user_id: userId,
      key,
      value: JSON.stringify(value),
      updated_at: now,
    }));

  // Mark onboarding as complete
  prefEntries.push({
    user_id: userId,
    key: 'onboarding_completed',
    value: JSON.stringify(true),
    updated_at: now,
  });

  if (prefEntries.length > 0) {
    const { error: prefError } = await supabase
      .from('user_preferences')
      .upsert(prefEntries, { onConflict: 'user_id,key' });

    if (prefError) {
      console.error('[POST /api/onboarding] user_preferences error:', prefError);
      return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
    }
  }

  // Seed user_clone L1 (identity) from display_name + work_area
  if (answers.display_name || answers.work_area) {
    const l1Content = {
      display_name: answers.display_name ?? '',
      work_area: answers.work_area ?? '',
      onboarding_source: 'initial_setup',
    };

    const { error: cloneError } = await supabase
      .from('user_clone')
      .upsert({
        user_id: userId,
        layer: 'L1_identidade',
        content: l1Content,
        fidelity: 0.05,
        version: 'v0.1-onboarding',
        updated_at: now,
      }, { onConflict: 'user_id,layer' });

    if (cloneError) {
      console.error('[POST /api/onboarding] user_clone error:', cloneError);
      // Non-fatal — preferences already saved
    }
  }

  // Seed user_clone L5 (interests) from interests + inspirations + current_challenge
  if (answers.interests || answers.inspirations || answers.current_challenge) {
    const l5Content = {
      interests: answers.interests ?? [],
      inspirations: answers.inspirations ?? [],
      current_challenge: answers.current_challenge ?? '',
    };

    const { error: cloneL5Error } = await supabase
      .from('user_clone')
      .upsert({
        user_id: userId,
        layer: 'L5_interesses',
        content: l5Content,
        fidelity: 0.15,
        version: 'v0.1-onboarding',
        updated_at: now,
      }, { onConflict: 'user_id,layer' });

    if (cloneL5Error) {
      console.error('[POST /api/onboarding] user_clone L5 error:', cloneL5Error);
    }
  }

  return NextResponse.json({ success: true });
}


// GET /api/onboarding/status — check if user has completed onboarding
export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = await resolveUserId(request);
  if (!userId) return NextResponse.json({ needsOnboarding: false });

  if (!SUPABASE_ENABLED) {
    return NextResponse.json({ needsOnboarding: false, dev: true });
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('user_preferences')
    .select('key')
    .eq('user_id', userId)
    .eq('key', 'onboarding_completed')
    .single();

  return NextResponse.json({ needsOnboarding: !data });
}
