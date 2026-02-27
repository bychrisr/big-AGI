/**
 * Alex Onboarding — Fluxo conversacional para novos usuários do teamAI.
 * Apresenta 7 perguntas sequencialmente, coleta respostas, persiste no Supabase.
 */
import * as React from 'react';

import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import CircularProgress from '@mui/joy/CircularProgress';
import Input from '@mui/joy/Input';
import LinearProgress from '@mui/joy/LinearProgress';
import Sheet from '@mui/joy/Sheet';
import Textarea from '@mui/joy/Textarea';
import Typography from '@mui/joy/Typography';


// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface OnboardingAnswers {
  display_name: string;
  work_area: string;
  interests: string;
  inspirations: string;
  public_profiles: string;
  ai_experience: string;
  current_challenge: string;
  api_key: string;
}

interface Step {
  key: keyof OnboardingAnswers;
  question: string;
  placeholder: string;
  hint?: string;
  multiline?: boolean;
  isApiKey?: boolean;
}


// ─────────────────────────────────────────────────────────────────────────────
// Onboarding steps definition
// ─────────────────────────────────────────────────────────────────────────────

const STEPS: Step[] = [
  {
    key: 'display_name',
    question: 'Qual é o seu nome? Como você prefere ser chamado?',
    placeholder: 'Ex: João',
  },
  {
    key: 'work_area',
    question: 'Em que área você trabalha?',
    placeholder: 'Ex: Marketing digital, Engenharia de software, Educação...',
  },
  {
    key: 'interests',
    question: 'Quais são seus 2-3 maiores interesses agora?',
    placeholder: 'Ex: IA, empreendedorismo, liderança',
    hint: 'Separe por vírgula.',
    multiline: true,
  },
  {
    key: 'inspirations',
    question: 'Você acompanha alguém que te inspira muito?',
    placeholder: 'Ex: Naval Ravikant, Paul Graham, Lex Fridman',
    hint: 'Pode ser autor, empreendedor, criador de conteúdo... Separe por vírgula.',
    multiline: true,
  },
  {
    key: 'public_profiles',
    question: 'Você tem perfil público? Instagram, YouTube, site...',
    placeholder: 'Ex: instagram.com/joao, youtube.com/@joao',
    hint: 'Opcional — pula se quiser.',
  },
  {
    key: 'ai_experience',
    question: 'Você já usa alguma IA no dia a dia? ChatGPT, Gemini, Claude...',
    placeholder: 'Ex: ChatGPT para textos, Gemini para pesquisa',
    hint: 'Se sim, você pode exportar seu histórico e eu construo um perfil muito mais completo.',
    multiline: true,
  },
  {
    key: 'current_challenge',
    question: 'Qual é seu maior desafio agora?',
    placeholder: 'Pode ser profissional ou pessoal...',
    multiline: true,
  },
  {
    key: 'api_key',
    question: 'Última coisa: sua API key da Anthropic.',
    placeholder: 'sk-ant-...',
    hint: 'Necessária para usar o teamAI. Acesse console.anthropic.com para criar a sua.',
    isApiKey: true,
  },
];

const TOTAL_STEPS = STEPS.length;


// ─────────────────────────────────────────────────────────────────────────────
// AppOnboarding component
// ─────────────────────────────────────────────────────────────────────────────

export function AppOnboarding({ onComplete }: { onComplete: () => void }) {

  const [step, setStep] = React.useState(0);
  const [answers, setAnswers] = React.useState<OnboardingAnswers>({
    display_name: '', work_area: '', interests: '', inspirations: '',
    public_profiles: '', ai_experience: '', current_challenge: '', api_key: '',
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const currentStep = STEPS[step]!;
  const currentValue = answers[currentStep.key];
  const isLast = step === TOTAL_STEPS - 1;
  const canSkip = currentStep.key === 'public_profiles';
  const canProceed = canSkip || currentValue.trim().length > 0;

  function handleChange(value: string) {
    setAnswers(prev => ({ ...prev, [currentStep.key]: value }));
    setError(null);
  }

  async function handleNext() {
    if (!canProceed) {
      setError('Por favor, responda antes de continuar.');
      return;
    }

    if (!isLast) {
      setStep(s => s + 1);
      return;
    }

    // Final step — save everything
    setSaving(true);
    setError(null);

    try {
      // Save non-apikey answers to Supabase
      const { api_key, ...prefs } = answers;
      const prefsFormatted: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(prefs)) {
        if (v.trim()) {
          // Parse comma-separated fields as arrays
          if (k === 'interests' || k === 'inspirations') {
            prefsFormatted[k] = v.split(',').map(s => s.trim()).filter(Boolean);
          } else {
            prefsFormatted[k] = v.trim();
          }
        }
      }

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...prefsFormatted, api_key: api_key.trim() || undefined }),
      });

      if (!res.ok) {
        throw new Error('Falha ao salvar configurações.');
      }

      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  function handleSkip() {
    setStep(s => s + 1);
  }


  // Completion screen
  if (done) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.body' }}>
        <Sheet variant='outlined' sx={{ maxWidth: 480, width: '100%', p: 5, borderRadius: 'xl', boxShadow: 'lg', textAlign: 'center' }}>
          <Typography level='h3' sx={{ mb: 2 }}>Tudo pronto! 🎉</Typography>
          <Typography level='body-md' sx={{ mb: 1, color: 'text.secondary' }}>
            Configurei o teamAI com o seu perfil inicial.
          </Typography>
          <Typography level='body-sm' sx={{ mb: 4, color: 'text.tertiary' }}>
            Nome: <strong>{answers.display_name}</strong> · Área: <strong>{answers.work_area}</strong>
          </Typography>
          <Button size='lg' onClick={onComplete} sx={{ width: '100%' }}>
            Começar a usar o teamAI
          </Button>
        </Sheet>
      </Box>
    );
  }


  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.body', p: 2 }}>
      <Sheet variant='outlined' sx={{ maxWidth: 520, width: '100%', p: 5, borderRadius: 'xl', boxShadow: 'lg' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1.5 }}>
          <Typography level='title-lg'>Alex</Typography>
          <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>Assistente de configuração</Typography>
        </Box>

        {/* Progress */}
        <Box sx={{ mb: 3 }}>
          <LinearProgress
            determinate
            value={(step / TOTAL_STEPS) * 100}
            sx={{ mb: 0.5 }}
          />
          <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
            Pergunta {step + 1} de {TOTAL_STEPS}
          </Typography>
        </Box>

        {/* Question */}
        <Typography level='title-md' sx={{ mb: 1 }}>
          {currentStep.question}
        </Typography>

        {currentStep.hint && (
          <Typography level='body-sm' sx={{ color: 'text.secondary', mb: 2 }}>
            {currentStep.hint}
            {currentStep.isApiKey && (
              <> <a href='https://console.anthropic.com' target='_blank' rel='noreferrer'>Criar API key</a></>
            )}
          </Typography>
        )}

        {/* Input */}
        {currentStep.multiline ? (
          <Textarea
            value={currentValue}
            onChange={e => handleChange(e.target.value)}
            placeholder={currentStep.placeholder}
            minRows={3}
            sx={{ mb: 2 }}
            autoFocus
          />
        ) : (
          <Input
            value={currentValue}
            onChange={e => handleChange(e.target.value)}
            placeholder={currentStep.placeholder}
            type={currentStep.isApiKey ? 'password' : 'text'}
            sx={{ mb: 2 }}
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') void handleNext(); }}
          />
        )}

        {error && (
          <Typography level='body-sm' color='danger' sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {canSkip && (
            <Button variant='plain' color='neutral' onClick={handleSkip} sx={{ flex: 1 }}>
              Pular
            </Button>
          )}
          <Button
            onClick={() => void handleNext()}
            loading={saving}
            disabled={saving || (!canSkip && !currentValue.trim())}
            sx={{ flex: 3 }}
            endDecorator={saving ? <CircularProgress size='sm' /> : null}
          >
            {isLast ? 'Finalizar configuração' : 'Continuar'}
          </Button>
        </Box>

      </Sheet>
    </Box>
  );
}
