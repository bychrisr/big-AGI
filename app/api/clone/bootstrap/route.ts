import { NextRequest, NextResponse } from 'next/server';

import { bootstrapClone, type OnboardingAnswers } from '~/server/clone/bootstrap-clone.server';
import { createSupabaseServerClient } from '~/common/supabase/server';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


interface BootstrapRequestBody {
  username: string;
  answers: OnboardingAnswers;
}


export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const body = (await request.json()) as BootstrapRequestBody;
  const { username, answers } = body;

  if (!username || !answers) {
    return NextResponse.json({ error: 'Missing username or answers' }, { status: 400 });
  }

  const userId = user?.id ?? `dev-user-${username}`;

  try {
    const result = await bootstrapClone(userId, username, answers);

    return NextResponse.json({
      success: true,
      fidelity: result.fidelity,
      message: 'Criei um perfil inicial seu. Vou melhorando conforme conversamos.',
      milestone: result.fidelity >= 0.40
        ? 'Clone mínimo atingido!'
        : `Próximo marco: ${Math.round((0.40 - result.fidelity) * 100)}% para clone mínimo`,
    });
  } catch (err) {
    console.error('[POST /api/clone/bootstrap] Error:', err);
    return NextResponse.json(
      { error: 'Failed to bootstrap clone', message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
