import * as React from 'react';

import { Box, Button, Checkbox, Chip, CircularProgress, Sheet, Typography } from '@mui/joy';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';

import { InlineError } from '~/common/components/InlineError';


export interface DebateMind {
  id: string;
  name: string;
  specialty: string;
  systemPromptPath?: string;
}

const MIN_MINDS = 2;
const MAX_MINDS = 6;


export function DebateMindSelector(props: {
  onStart: (minds: DebateMind[]) => void;
  onCancel: () => void;
}) {

  // state
  const [minds, setMinds] = React.useState<DebateMind[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);


  // load minds from /api/minds on mount
  React.useEffect(() => {
    let cancelled = false;

    async function loadMinds(): Promise<void> {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/minds', {
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({})) as { message?: string };
          throw new Error(body.message ?? `HTTP ${response.status}`);
        }

        const data = await response.json() as { minds: DebateMind[] };

        if (!cancelled) {
          setMinds(data.minds ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load minds');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadMinds();
    return () => { cancelled = true; };
  }, []);


  // handlers

  const handleToggle = React.useCallback((mindId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(mindId)) {
        next.delete(mindId);
      } else if (next.size < MAX_MINDS) {
        next.add(mindId);
      }
      return next;
    });
  }, []);

  const handleStart = React.useCallback(() => {
    const selected = minds.filter(m => selectedIds.has(m.id));
    if (selected.length >= MIN_MINDS) {
      props.onStart(selected);
    }
  }, [minds, props, selectedIds]);


  const selectedCount = selectedIds.size;
  const canStart = selectedCount >= MIN_MINDS;


  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, minWidth: 320 }}>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ForumRoundedIcon sx={{ fontSize: 'xl' }} />
        <Box>
          <Typography level='title-md'>Debate com Minds</Typography>
          <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
            Selecione de {MIN_MINDS} a {MAX_MINDS} minds para o debate
          </Typography>
        </Box>
      </Box>

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size='sm' />
        </Box>
      )}

      {/* Error */}
      {error && <InlineError error={error} />}

      {/* Mind list */}
      {!loading && !error && minds.length === 0 && (
        <Typography level='body-sm' sx={{ color: 'text.secondary', textAlign: 'center', py: 2 }}>
          Nenhum mind disponível. Configure o repositório teamAI.
        </Typography>
      )}

      {!loading && minds.length > 0 && (
        <Sheet
          variant='outlined'
          sx={{ borderRadius: 'sm', overflow: 'auto', maxHeight: 320 }}
        >
          {minds.map(mind => {
            const isSelected = selectedIds.has(mind.id);
            const isDisabled = !isSelected && selectedCount >= MAX_MINDS;

            return (
              <Box
                key={mind.id}
                onClick={() => !isDisabled && handleToggle(mind.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                  px: 2,
                  py: 1.25,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  opacity: isDisabled ? 0.5 : 1,
                  '&:not(:last-child)': { borderBottom: '1px solid', borderColor: 'divider' },
                  '&:hover': !isDisabled ? { backgroundColor: 'background.level1' } : {},
                  backgroundColor: isSelected ? 'primary.softBg' : undefined,
                }}
              >
                <Checkbox
                  checked={isSelected}
                  disabled={isDisabled}
                  onChange={() => handleToggle(mind.id)}
                  size='sm'
                  sx={{ mt: 0.25 }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography level='title-sm' noWrap>{mind.name}</Typography>
                  <Typography level='body-xs' sx={{ color: 'text.secondary' }} noWrap>
                    {mind.specialty}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Sheet>
      )}

      {/* Selection status */}
      {selectedCount > 0 && (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {minds
            .filter(m => selectedIds.has(m.id))
            .map(m => (
              <Chip
                key={m.id}
                size='sm'
                variant='soft'
                color='primary'
                onClick={() => handleToggle(m.id)}
                endDecorator={
                  <Typography level='body-xs' sx={{ color: 'inherit', ml: 0.25 }}>×</Typography>
                }
              >
                {m.name}
              </Chip>
            ))
          }
        </Box>
      )}

      {/* Action buttons */}
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        <Button variant='plain' color='neutral' onClick={props.onCancel}>
          Cancelar
        </Button>
        <Button
          variant='solid'
          color='primary'
          disabled={!canStart}
          endDecorator={<PlayArrowRoundedIcon />}
          onClick={handleStart}
        >
          Iniciar Debate
          {selectedCount >= MIN_MINDS && ` (${selectedCount})`}
        </Button>
      </Box>

    </Box>
  );
}
