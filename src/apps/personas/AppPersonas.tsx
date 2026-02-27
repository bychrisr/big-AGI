import * as React from 'react';

import { Box, Container, ListDivider, Typography } from '@mui/joy';

import { OptimaDrawerIn } from '~/common/layout/optima/portals/OptimaPortalsIn';

import { importSyncedPersonas } from './store-app-personas';
import { Creator } from './creator/Creator';
import { CreatorDrawer } from './creator/CreatorDrawer';
import { Viewer } from './creator/Viewer';


export function AppPersonas() {

  // state
  const [selectedSimplePersonaId, setSelectedSimplePersonaId] = React.useState<string | null>(null);

  // Sync MMOS minds into personas on mount (once per session)
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/personas/sync');
        if (!res.ok || cancelled) return;
        const data = await res.json() as { personas?: Array<{ id: string; name: string; systemPrompt: string; inputText: string }> };
        if (data.personas && !cancelled) {
          importSyncedPersonas(data.personas.map(p => ({
            id: p.id,
            name: p.name,
            description: (p as { specialty?: string }).specialty,
            systemPrompt: p.systemPrompt,
            inputText: p.inputText,
          })));
        }
      } catch {
        // Non-critical: sync failure does not break the personas page
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return <>

    {/* -> Drawer */}
    <OptimaDrawerIn>
      <CreatorDrawer
        selectedSimplePersonaId={selectedSimplePersonaId}
        setSelectedSimplePersonaId={setSelectedSimplePersonaId}
      />
    </OptimaDrawerIn>

    <Box sx={{
      flexGrow: 1,
      overflowY: 'auto',
      p: { xs: 3, md: 6 },
    }}>

      <Container disableGutters maxWidth='md' sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>

        <Typography level='title-lg' sx={{ textAlign: 'center' }}>
          AI Personas Creator
        </Typography>

        <ListDivider sx={{ my: 2 }} />

        {!!selectedSimplePersonaId && <Viewer selectedSimplePersonaId={selectedSimplePersonaId} />}

        <Creator display={!selectedSimplePersonaId} />

      </Container>

    </Box>
  </>;
}