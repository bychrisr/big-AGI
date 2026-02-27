'use client';

import * as React from 'react';

import { Box, Chip, IconButton, ListDivider, ListItem, ListItemButton, ListItemContent, ListItemDecorator, Tooltip, Typography } from '@mui/joy';
import AddIcon from '@mui/icons-material/Add';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';


interface DebateSession {
  session_id: string;
  topic: string;
  minds: string[];
  token_usage: { turns?: number } | null;
  created_at: string;
}


function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function formatTopic(topic: string): string {
  // Keep only the part before " — " or first 48 chars
  const short = topic.split(' — ')[0] ?? topic;
  return short.length > 44 ? short.slice(0, 41) + '…' : short;
}


export function DebateSessionsSection(props: {
  activeProjectName: string | null; // folder title lowercased, or null if no folder selected
  onOpenSession: (sessionId: string, topic: string, minds: string[]) => void;
  onNewSession: () => void;
}) {
  const { activeProjectName } = props;
  const [sessions, setSessions] = React.useState<DebateSession[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [expanded, setExpanded] = React.useState(true);

  const fetchSessions = React.useCallback(async (projectName: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/debates?project=${encodeURIComponent(projectName)}`);
      if (res.ok) {
        const json = await res.json() as { sessions: DebateSession[] };
        setSessions(json.sessions ?? []);
      }
    } catch {
      // silent — not logged in or no network
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (activeProjectName) {
      setSessions([]);
      void fetchSessions(activeProjectName);
    } else {
      setSessions([]);
    }
  }, [activeProjectName, fetchSessions]);

  // Oculta seção se nenhum folder/projeto está selecionado
  if (!activeProjectName) return null;

  return (
    <>
      <ListDivider sx={{ my: 0 }} />

      {/* Section header */}
      <ListItem sx={{ px: 2, py: 0.5 }}>
        <ListItemDecorator sx={{ minWidth: 0, mr: 1 }}>
          <ForumOutlinedIcon sx={{ fontSize: 'md', color: 'text.tertiary' }} />
        </ListItemDecorator>
        <ListItemContent>
          <Typography
            level='body-xs'
            sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.tertiary', cursor: 'pointer', userSelect: 'none' }}
            onClick={() => setExpanded(e => !e)}
          >
            Debates {sessions.length > 0 && `(${sessions.length})`}
          </Typography>
        </ListItemContent>
        <Tooltip title='Atualizar'>
          <IconButton size='sm' disabled={loading} onClick={() => activeProjectName && fetchSessions(activeProjectName)} sx={{ ml: 'auto' }}>
            <RefreshIcon sx={{ fontSize: 'sm', ...(loading && { animation: 'spin 1s linear infinite', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }) }} />
          </IconButton>
        </Tooltip>
      </ListItem>

      {expanded && (
        <Box sx={{ mx: 1, mb: 1 }}>

          {/* Session list */}
          {sessions.length === 0 && !loading && (
            <Typography level='body-xs' sx={{ color: 'text.tertiary', px: 2, py: 1 }}>
              Nenhuma sessão ainda
            </Typography>
          )}

          {sessions.map(session => (
            <ListItemButton
              key={session.session_id}
              onClick={() => props.onOpenSession(session.session_id, session.topic, session.minds)}
              sx={{
                borderRadius: 'sm',
                px: 1.5,
                py: 0.75,
                gap: 0,
                '&:hover': { backgroundColor: 'background.level2' },
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, width: '100%', minWidth: 0 }}>
                <Typography level='body-xs' noWrap sx={{ fontWeight: 500, color: 'text.primary' }}>
                  {formatTopic(session.topic)}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography level='body-xs' sx={{ color: 'text.tertiary', flexShrink: 0 }}>
                    {formatDate(session.created_at)}
                  </Typography>
                  {(session.token_usage?.turns ?? 0) > 0 && (
                    <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                      · {session.token_usage!.turns} turns
                    </Typography>
                  )}
                  {session.minds.slice(0, 3).map(m => (
                    <Chip key={m} size='sm' variant='soft' color='neutral' sx={{ fontSize: '0.6rem', '--Chip-minHeight': '16px', py: 0, px: 0.5 }}>
                      {m.split('_')[0]}
                    </Chip>
                  ))}
                  {session.minds.length > 3 && (
                    <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>+{session.minds.length - 3}</Typography>
                  )}
                </Box>
              </Box>
            </ListItemButton>
          ))}

          {/* New debate button */}
          <ListItemButton
            onClick={props.onNewSession}
            sx={{
              borderRadius: 'sm',
              px: 1.5,
              py: 0.75,
              mt: 0.5,
              border: '1px dashed',
              borderColor: 'neutral.outlinedBorder',
            }}
          >
            <ListItemDecorator>
              <AddIcon sx={{ fontSize: 'md', color: 'text.tertiary' }} />
            </ListItemDecorator>
            <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
              Novo debate
            </Typography>
          </ListItemButton>

        </Box>
      )}
    </>
  );
}
