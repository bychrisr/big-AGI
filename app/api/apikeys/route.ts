import { NextRequest, NextResponse } from 'next/server';

import { createSupabaseServerClient } from '~/common/supabase/server';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider');

  if (provider) {
    const { data } = await supabase
      .from('user_api_keys')
      .select('encrypted_key')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .single();
    return NextResponse.json({ key: data?.encrypted_key ?? null });
  }

  const { data } = await supabase
    .from('user_api_keys')
    .select('provider')
    .eq('user_id', user.id);
  return NextResponse.json({ providers: (data ?? []).map(r => r.provider) });
}


export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json()) as { provider?: string; key?: string };
  const { provider, key } = body;
  if (!provider || !key)
    return NextResponse.json({ error: 'Missing provider or key' }, { status: 400 });

  const { error } = await supabase.from('user_api_keys').upsert({
    user_id: user.id,
    provider,
    encrypted_key: key,
  }, { onConflict: 'user_id,provider' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}


export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider');
  if (!provider) return NextResponse.json({ error: 'Missing provider' }, { status: 400 });

  const { error } = await supabase
    .from('user_api_keys')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', provider);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
