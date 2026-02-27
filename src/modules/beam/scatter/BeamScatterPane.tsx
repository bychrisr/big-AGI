import * as React from 'react';

import type { SxProps } from '@mui/joy/styles/types';
import { Box, Button, ButtonGroup, FormControl, Modal, ModalDialog, Typography } from '@mui/joy';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PlusOneRoundedIcon from '@mui/icons-material/PlusOneRounded';
import StopRoundedIcon from '@mui/icons-material/StopRounded';

import { FormLabelStart } from '~/common/components/forms/FormLabelStart';
import { TooltipOutlined } from '~/common/components/TooltipOutlined';

import type { BeamStoreApi } from '../store-beam.hooks';
import { BEAM_BTN_SX, SCATTER_COLOR, SCATTER_RAY_PRESETS } from '../beam.config';
import { BeamScatterDropdown } from './BeamScatterPaneDropdown';
import { beamPaneSx } from '../BeamCard';
import { DebateMindSelector } from '../debate/DebateMindSelector';
import type { DebateMind } from '../debate/DebateMindSelector';
import { useDebateTriggerStore } from '~/modules/teamai/store-debate-trigger';


const scatterPaneSx: SxProps = {
  ...beamPaneSx,
  backgroundColor: 'background.popup',

  // col gap is pad/2 (8px), row is double (1rem)
  rowGap: 'var(--Pad)',

  // [desktop] scatter: primary-chan shadow
  // boxShadow: '0px 6px 12px -8px rgb(var(--joy-palette-primary-darkChannel) / 35%)',
  // boxShadow: '0px 16px 16px -24px rgb(var(--joy-palette-primary-darkChannel) / 35%)',
  boxShadow: '0px 6px 16px -12px rgb(var(--joy-palette-primary-darkChannel) / 50%)',
  // boxShadow: '0px 8px 20px -16px rgb(var(--joy-palette-primary-darkChannel) / 30%)',
};

const mobileScatterPaneSx: SxProps = scatterPaneSx;

const desktopScatterPaneSx: SxProps = {
  ...scatterPaneSx,

  // the fact that this works, means we got the CSS and layout right
  position: 'sticky',
  top: 0,
};

const _styles = {

  icon: {
    fontSize: '1rem',
    mr: 0.625,
  } as const,

  iconActive: {
    fontSize: '1rem',
    mr: 0.625,
    // NOTE: no reason to animate the color here, it's just a waste of power...
    // animation: `${animationColorBeamScatter} 2s linear infinite`,
    // ...and so we just fallback to the first color of the animation
    color: 'rgb(85, 140, 47)',
  } as const,

} as const;


export function BeamScatterPane(props: {
  beamStore: BeamStoreApi,
  isMobile: boolean,
  rayCount: number,
  setRayCount: (n: number) => void,
  showRayAdd: boolean,
  startEnabled: boolean,
  startBusy: boolean,
  startRestart: boolean,
  onStart: (restart: boolean) => void,
  onStop: () => void,
  onExplainerShow: () => any,
  onDebateStart: (minds: DebateMind[]) => void,
}) {

  // state
  const [showDebateSelector, setShowDebateSelector] = React.useState(false);
  const [pendingPreselected, setPendingPreselected] = React.useState<string[] | undefined>(undefined);
  const [pendingTopic, setPendingTopic] = React.useState<string | undefined>(undefined);

  // listen for agent-triggered council debates (from *consult-X commands in Composer)
  const { pending: debateTrigger, clearPending } = useDebateTriggerStore();
  React.useEffect(() => {
    if (debateTrigger) {
      setPendingPreselected(debateTrigger.mindIds);
      setPendingTopic(debateTrigger.topic || undefined);
      setShowDebateSelector(true);
      clearPending();
    }
  }, [debateTrigger, clearPending]);

  const dropdownMemo = React.useMemo(() => (
    <BeamScatterDropdown
      beamStore={props.beamStore}
      onExplainerShow={props.onExplainerShow}
    />
  ), [props.beamStore, props.onExplainerShow]);

  const { onStart, startRestart } = props;

  const handleStartClicked = React.useCallback((event: React.MouseEvent) => {
    onStart(!startRestart ? false : event.shiftKey);
  }, [onStart, startRestart]);

  const handleDebateButtonClick = React.useCallback(() => {
    setPendingPreselected(undefined);
    setPendingTopic(undefined);
    setShowDebateSelector(true);
  }, []);

  const handleDebateSelectorStart = React.useCallback((minds: DebateMind[]) => {
    setShowDebateSelector(false);
    setPendingPreselected(undefined);
    setPendingTopic(undefined);
    props.onDebateStart(minds);
  }, [props]);

  const handleDebateSelectorCancel = React.useCallback(() => {
    setShowDebateSelector(false);
    setPendingPreselected(undefined);
    setPendingTopic(undefined);
  }, []);

  return (
    <Box sx={props.isMobile ? mobileScatterPaneSx : desktopScatterPaneSx}>

      {/* Title */}
      <Box>
        <Typography
          level='h4' component='h3'
          endDecorator={dropdownMemo}
          // sx={{ my: 0.25 }}
        >
          {props.startBusy
            ? <AutoAwesomeIcon sx={_styles.iconActive} />
            : <AutoAwesomeOutlinedIcon sx={_styles.icon} />}
          Beam
        </Typography>
        <Typography level='body-sm' sx={{ whiteSpace: 'nowrap' }}>
          Explore different replies
          {/* Explore the solution space */}
        </Typography>
      </Box>

      {/* Ray presets */}
      <FormControl sx={{ my: '-0.25rem' }}>
        <FormLabelStart title='Beam Count' sx={/*{ mb: '0.25rem' }*/ undefined} />
        <ButtonGroup variant='outlined'>
          {SCATTER_RAY_PRESETS.map((n) => {
            const isActive = n === props.rayCount;
            return (
              <Button
                key={n}
                // variant={isActive ? 'solid' : undefined}
                color={isActive ? SCATTER_COLOR : 'neutral'}
                // color='neutral'
                size='sm'
                onClick={() => props.setRayCount(n)}
                sx={{
                  // backgroundColor: isActive ? 'background.popup' : undefined,
                  backgroundColor: !isActive ? `${SCATTER_COLOR}.softBg` : 'background.popup',
                  fontWeight: isActive ? 'xl' : 400, /* reset, from 600 */
                  width: '3rem',
                }}
              >
                {n}
              </Button>
            );
          })}
          {props.showRayAdd && (
            <Button
              color='neutral'
              size='sm'
              onClick={() => props.setRayCount(props.rayCount + 1)}
              sx={{
                backgroundColor: 'background.popup',
                fontWeight: 'xl',
                width: '3rem',
              }}
            >
              {/*{'+'}*/}
              <PlusOneRoundedIcon />
            </Button>
          )}
        </ButtonGroup>
      </FormControl>

      {/* Start / Stop buttons */}
      {!props.startBusy ? (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TooltipOutlined slowEnter title={startRestart ? 'Shift + Click to re-run active Beams' : null} placement='top-end'>
            <Button
              // key='scatter-start' // used for animation triggering, which we don't have now
              variant='solid' color={SCATTER_COLOR}
              disabled={!props.startEnabled || props.startBusy} loading={props.startBusy}
              endDecorator={<PlayArrowRoundedIcon />}
              onClick={handleStartClicked}
              sx={BEAM_BTN_SX}
            >
              Start
            </Button>
          </TooltipOutlined>

          {/* Debate button */}
          <TooltipOutlined slowEnter title='Debate com Minds — inicie um debate entre thought leaders' placement='top-end'>
            <Button
              variant='outlined'
              color='primary'
              disabled={!props.startEnabled}
              startDecorator={<ForumRoundedIcon />}
              onClick={handleDebateButtonClick}
              sx={{ minWidth: 100 }}
            >
              Debate
            </Button>
          </TooltipOutlined>
        </Box>
      ) : (
        <Button
          // key='scatter-stop'
          variant='solid' color='danger'
          endDecorator={<StopRoundedIcon />}
          onClick={props.onStop}
          sx={BEAM_BTN_SX}
        >
          Stop
          {/*{props.rayCount > props.raysReady && ` (${props.rayCount - props.raysReady})`}*/}
        </Button>
      )}

      {/* Debate Mind Selector Modal */}
      {showDebateSelector && (
        <Modal open onClose={handleDebateSelectorCancel}>
          <ModalDialog sx={{ p: 0, overflow: 'hidden' }}>
            <DebateMindSelector
              onStart={handleDebateSelectorStart}
              onCancel={handleDebateSelectorCancel}
              preselectedIds={pendingPreselected}
              topic={pendingTopic}
            />
          </ModalDialog>
        </Modal>
      )}

    </Box>
  );
}