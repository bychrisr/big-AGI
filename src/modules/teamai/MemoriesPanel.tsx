'use client';

import * as React from 'react';

import { Box, Chip, IconButton, ListDivider, ListItem, ListItemContent, ListItemDecorator, Tooltip, Typography } from '@mui/joy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';


interface Memory {
  key: string;
  value: string;
  confidence: number;
  source: string;
  created_at: string;
}

function confidenceColor(c: number): 'success' | 'warning' | 'neutral' {
  if (c >= 0.8) return 'success';
  if (c >= 0.6) return 'warning';
  return 'neutral';
}


export function MemoriesPanel() {
  const [memories, setMemories] = React.useState<Memory[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  const fetchMemories = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/memory');
      if (res.ok) {
        const json = await res.json() as { memories: Memory[] };
        setMemories(json.memories ?? []);
      }
    } catch {
      // silent — not logged in or offline
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on first expand
  React.useEffect(() => {
    if (expanded && memories.length === 0 && !loading) {
      void fetchMemories();
    }
  }, [expanded, memories.length, loading, fetchMemories]);

  const handleDelete = React.useCallback(async (key: string) => {
    try {
      await fetch(`/api/memory?key=${encodeURIComponent(key)}`, { method: 'DELETE' });
      setMemories(prev => prev.filter(m => m.key !== key));
    } catch { /* silent */ }
  }, []);

  return (
    <>
      <ListDivider sx={{ my: 0 }} />

      {/* Section header */}
      <ListItem sx={{ px: 2, py: 0.5 }}>
        <ListItemDecorator sx={{ minWidth: 0, mr: 1 }}>
          <PsychologyOutlinedIcon sx={{ fontSize: 'md', color: 'text.tertiary' }} />
        </ListItemDecorator>
        <ListItemContent>
          <Typography
            level='body-xs'
            sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.tertiary', cursor: 'pointer', userSelect: 'none' }}
            onClick={() => setExpanded(e => !e)}
          >
            Memórias {memories.length > 0 && `(${memories.length})`}
          </Typography>
        </ListItemContent>
        {expanded && (
          <Tooltip title='Atualizar'>
            <IconButton size='sm' disabled={loading} onClick={fetchMemories} sx={{ ml: 'auto' }}>
              <RefreshIcon sx={{ fontSize: 'sm', ...(loading && { animation: 'spin 1s linear infinite', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }) }} />
            </IconButton>
          </Tooltip>
        )}
      </ListItem>

      {expanded && (
        <Box sx={{ mx: 1, mb: 1 }}>

          {memories.length === 0 && !loading && (
            <Typography level='body-xs' sx={{ color: 'text.tertiary', px: 2, py: 1 }}>
              Nenhuma memória ainda. Diga &ldquo;grava na memória que...&rdquo;
            </Typography>
          )}

          {memories.map(memory => (
            <Box
              key={memory.key}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 0.5,
                px: 1.5,
                py: 0.5,
                borderRadius: 'sm',
                '&:hover': { backgroundColor: 'background.level2', '& .delete-btn': { opacity: 1 } },
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                  <Typography level='body-xs' sx={{ fontWeight: 600, color: 'text.primary' }}>
                    {memory.key}
                  </Typography>
                  <Chip
                    size='sm'
                    variant='soft'
                    color={confidenceColor(memory.confidence)}
                    sx={{ fontSize: '0.55rem', '--Chip-minHeight': '14px', py: 0, px: 0.5 }}
                  >
                    {Math.round(memory.confidence * 100)}%
                  </Chip>
                </Box>
                <Typography level='body-xs' sx={{ color: 'text.secondary', wordBreak: 'break-word' }}>
                  {memory.value}
                </Typography>
              </Box>
              <IconButton
                className='delete-btn'
                size='sm'
                color='danger'
                variant='plain'
                onClick={() => void handleDelete(memory.key)}
                sx={{ opacity: 0, transition: 'opacity 0.15s', flexShrink: 0, mt: 0.25 }}
              >
                <DeleteOutlineIcon sx={{ fontSize: 'sm' }} />
              </IconButton>
            </Box>
          ))}

        </Box>
      )}
    </>
  );
}
