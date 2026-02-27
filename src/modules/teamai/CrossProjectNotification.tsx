'use client';

/**
 * Inline notification when cross-project insight is detected.
 * Uses Joy UI Alert with "Sim, conte mais" and "Ignorar" actions.
 */
import * as React from 'react';

import { Alert, Box, Button, Typography } from '@mui/joy';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';

import type { CrossProjectInsight } from './useCrossProjectContext';


interface CrossProjectNotificationProps {
  insight: CrossProjectInsight;
  onExpand: () => void;
  onDismiss: () => void;
}


export function CrossProjectNotification(props: CrossProjectNotificationProps) {
  const { insight, onExpand, onDismiss } = props;
  const confidencePct = Math.round(insight.confidence * 100);

  return (
    <Alert
      variant='soft'
      color='neutral'
      startDecorator={<LightbulbOutlinedIcon />}
      sx={{ mx: 1, my: 0.5 }}
    >
      <Box sx={{ flex: 1 }}>
        <Typography level='body-sm'>
          Lembro que no <strong>{insight.sourceProject}</strong> voce
          resolveu algo parecido: &ldquo;{insight.decision}&rdquo;
          (confianca: {confidencePct}%). Quer considerar isso aqui?
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Button
            size='sm'
            variant='solid'
            color='primary'
            onClick={onExpand}
          >
            Sim, conte mais
          </Button>
          <Button
            size='sm'
            variant='plain'
            color='neutral'
            onClick={onDismiss}
          >
            Ignorar
          </Button>
        </Box>
      </Box>
    </Alert>
  );
}
