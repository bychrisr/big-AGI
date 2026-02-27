import * as React from 'react';
import { useShallow } from 'zustand/react/shallow';

import type { SxProps } from '@mui/joy/styles/types';
import { Alert, Avatar, Box, Button, Card, CardContent, Checkbox, IconButton, Input, List, ListItem, ListItemButton, Textarea, Tooltip, Typography } from '@mui/joy';
import ClearIcon from '@mui/icons-material/Clear';
import DoneIcon from '@mui/icons-material/Done';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import EditNoteIcon from '@mui/icons-material/EditNote';
import SearchIcon from '@mui/icons-material/Search';
import TelegramIcon from '@mui/icons-material/Telegram';

import { SystemPurposeData, SystemPurposeExample, SystemPurposeId, SystemPurposes } from '../../../../data';

import { buildMemoryContextBlock, fetchMindSystemPrompt, registeredMindIds, useMindsStore } from '~/modules/teamai/store-minds';
import type { MindMetadata } from '~/modules/teamai/store-minds';
import { YouTubeURLInput } from '~/modules/youtube/YouTubeURLInput';
import { bareBonesPromptMixer } from '~/modules/persona/pmix/pmix';

import type { DConversationId } from '~/common/stores/chat/chat.conversation';
import { ExpanderControlledBox } from '~/common/components/ExpanderControlledBox';
import { createDMessageTextContent } from '~/common/stores/chat/chat.message';
import { useFolderStore } from '~/common/stores/folders/store-chat-folders';
import { lineHeightTextareaMd } from '~/common/app.theme';
import { navigateToPersonas } from '~/common/app.routes';
import { useChatStore } from '~/common/stores/chat/store-chats';
import { useChipBoolean } from '~/common/components/useChipBoolean';
import { useModelDomain } from '~/common/stores/llms/hooks/useModelDomain';
import { useUIPreferencesStore } from '~/common/stores/store-ui';

import { usePurposeStore } from './store-purposes';


// 'special' purpose IDs, for tile hiding purposes
const PURPOSE_ID_PERSONA_CREATOR = '__persona-creator__';
const TILE_ACTIVE_COLOR = 'primary' as const;

// defined looks
const tileSize = 7; // rem
const tileGap = 0.5; // rem


function Tile(props: {
  text?: string,
  imageUrl?: string,
  symbol?: string,
  isActive: boolean,
  isEditMode: boolean,
  isHidden?: boolean,
  isHighlighted?: boolean,
  onClick: () => void,
  sx?: SxProps,
}) {
  return (
    <Button
      variant={(!props.isEditMode && props.isActive) ? 'solid' : props.isHighlighted ? 'soft' : 'soft'}
      color={(!props.isEditMode && props.isActive) ? 'primary' : props.isHighlighted ? 'primary' : TILE_ACTIVE_COLOR}
      onClick={props.onClick}
      sx={{
        aspectRatio: 1,
        height: `${tileSize}rem`,
        fontWeight: 'md',
        lineHeight: 'xs',
        paddingInline: 0.5,
        ...((props.isEditMode || !props.isActive) ? {
          boxShadow: `0 2px 8px -3px rgb(var(--joy-palette-${TILE_ACTIVE_COLOR}-darkChannel) / 30%)`,
          // boxShadow: props.isHighlighted
          //   ? '0 2px 8px -2px rgb(var(--joy-palette-primary-darkChannel) / 30%)'
          //   : 'sm',
          backgroundColor: props.isHighlighted ? undefined : 'background.popup',
          // ...(props.imageUrl && {
          //   backgroundImage: `linear-gradient(rgba(255 255 255 /0.85), rgba(255 255 255 /1)), url(${props.imageUrl})`,
          //   backgroundPosition: 'center',
          //   backgroundSize: 'cover',
          //   '&:hover': {
          //     backgroundImage: 'none',
          //   },
          // }),
        } : {}),
        flexDirection: 'column', gap: props.symbol === '🎭' ? 0.5 : 1.25, pt: 1.25,
        ...props.sx,
      }}
    >
      {/* [Edit mode checkbox] */}
      {props.isEditMode && (
        <Checkbox
          variant='soft' color={TILE_ACTIVE_COLOR}
          checked={!props.isHidden}
          // label={<Typography level='body-xs'>show</Typography>}
          sx={{ position: 'absolute', left: `${tileGap}rem`, top: `${tileGap}rem` }}
        />
      )}

      {/* Icon and Text */}
      {/*<Box sx={{ fontSize: '2rem' }}>*/}
      {/*  {props.symbol}*/}
      {/*</Box>*/}
      <Avatar
        variant='plain'
        src={props.imageUrl}
        sx={{
          '--Avatar-size': '3rem',
          fontSize: '2rem',
          borderRadius: props.imageUrl ? 'sm' : 0,
          boxShadow: (props.imageUrl && !props.isActive) ? 'sm' : undefined,
        }}
      >
        {props.symbol}
      </Avatar>
      <div>
        {props.text}
      </div>
    </Button>
  );
}


// Formats squad directory names (e.g. "mmos-squad") to display labels ("MMOS Squad")
function formatSquadLabel(squad: string): string {
  return squad
    .split(/[-_]/)
    .map(word => word.toUpperCase() === word ? word : word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}


function MindSquadSections(props: {
  minds: MindMetadata[],
  systemPurposeId: SystemPurposeId | null,
  loadingMindId: string | null,
  onMindSelected: (mindId: string) => void,
}) {
  // Group minds by squad (category field) — fall back to 'source' value
  const bySquad = React.useMemo(() => {
    const groups = new Map<string, MindMetadata[]>();
    for (const mind of props.minds) {
      const key = mind.category ?? (mind.source === 'custom' ? 'custom' : 'mmos-squad');
      const group = groups.get(key) ?? [];
      group.push(mind);
      groups.set(key, group);
    }
    return groups;
  }, [props.minds]);

  return (
    <>
      {Array.from(bySquad.entries()).map(([squad, squadMinds]) => (
        <React.Fragment key={squad}>
          <Box sx={{ gridColumn: '1 / -1', mt: 2, mb: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography level='title-sm'>
              {formatSquadLabel(squad)}
            </Typography>
            <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
              {squadMinds.length} minds
            </Typography>
          </Box>
          {squadMinds.map((mind) => {
            const isActive = props.systemPurposeId === mind.id;
            const isLoading = props.loadingMindId === mind.id;
            const purpose = SystemPurposes[mind.id];
            return (
              <Tile
                key={'mind-' + mind.id}
                text={isLoading ? '...' : mind.name}
                symbol={purpose?.symbol ?? '🧠'}
                isActive={isActive}
                isEditMode={false}
                isHighlighted={false}
                onClick={() => props.onMindSelected(mind.id)}
              />
            );
          })}
        </React.Fragment>
      ))}
    </>
  );
}


/**
 * Purpose selector for the current chat. Clicking on any item activates it for the current chat.
 */
export function PersonaSelector(props: {
  conversationId: DConversationId,
  isMobile: boolean,
  runExample: (example: SystemPurposeExample) => void,
}) {

  // state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filteredIDs, setFilteredIDs] = React.useState<SystemPurposeId[] | null>(null);
  const [editMode, setEditMode] = React.useState(false);
  const [loadingMindId, setLoadingMindId] = React.useState<string | null>(null);

  // MMOS minds
  const { minds, fetchMinds } = useMindsStore();
  React.useEffect(() => { void fetchMinds(); }, [fetchMinds]);


  // external state
  const { complexityMode, showPersonaFinder } = useUIPreferencesStore(useShallow(state => ({
    complexityMode: state.complexityMode,
    showPersonaFinder: state.showPersonaFinder,
  })));
  const [showExamples, showExamplescomponent] = useChipBoolean('Examples', complexityMode === 'extra' && !props.isMobile);
  const [showPrompt, showPromptComponent] = useChipBoolean('Prompt', false);
  const { systemPurposeId, setSystemPurposeId } = useChatStore(useShallow(state => {
    const conversation = state.conversations.find(conversation => conversation.id === props.conversationId);
    return {
      systemPurposeId: conversation ? conversation.systemPurposeId : null,
      setSystemPurposeId: conversation ? state.setSystemPurposeId : null,
    };
  }));
  const { hiddenPurposeIDs, toggleHiddenPurposeId } = usePurposeStore(useShallow(state => ({
    hiddenPurposeIDs: state.hiddenPurposeIDs,
    toggleHiddenPurposeId: state.toggleHiddenPurposeId,
  })));
  const { domainModelId: chatLLMId } = useModelDomain('primaryChat');
  const chatLLM = { id: chatLLMId ?? undefined }; // adapter for porting


  // derived state

  const isCustomPurpose = systemPurposeId === 'Custom';
  const isYouTubeTranscriber = systemPurposeId === 'YouTubeTranscriber';

  const { selectedPurpose, fourExamples } = React.useMemo(() => {
    const selectedPurpose: SystemPurposeData | null = systemPurposeId ? (SystemPurposes[systemPurposeId] ?? null) : null;
    // const selectedExample = selectedPurpose?.examples?.length
    //   ? selectedPurpose.examples[Math.floor(Math.random() * selectedPurpose.examples.length)]
    //   : null;
    const fourExamples = selectedPurpose?.examples?.slice(0, 4) ?? null;
    return { selectedPurpose, fourExamples };
  }, [systemPurposeId]);


  // Only show built-in personas in the main grid — exclude dynamically registered minds
  const builtinIDs = (Object.keys(SystemPurposes) as SystemPurposeId[]).filter(id => !registeredMindIds.has(id));
  const unfilteredPurposeIDs = (filteredIDs && showPersonaFinder) ? filteredIDs.filter(id => !registeredMindIds.has(id)) : builtinIDs;
  const visiblePurposeIDs = editMode ? unfilteredPurposeIDs : unfilteredPurposeIDs.filter(id => !hiddenPurposeIDs.includes(id));
  const hidePersonaCreator = hiddenPurposeIDs.includes(PURPOSE_ID_PERSONA_CREATOR);


  // Handlers

  const handlePurposeChanged = React.useCallback((purposeId: SystemPurposeId | null) => {
    if (purposeId && setSystemPurposeId)
      setSystemPurposeId(props.conversationId, purposeId);
  }, [props.conversationId, setSystemPurposeId]);

  const handleAppendTranscriptAsMessage = React.useCallback((messageText: string) => {
    // Create a new message object
    const newMessage = createDMessageTextContent('assistant', messageText); // [chat] append assistant:YouTube transcript

    // Append the new message to the conversation
    useChatStore.getState().appendMessage(props.conversationId, newMessage);
  }, [props.conversationId]);


  const handleCustomSystemMessageChange = React.useCallback((v: React.ChangeEvent<HTMLTextAreaElement>): void => {
    // TODO: persist this change? Right now it's reset every time.
    //       maybe we shall have a "save" button just save on a state to persist between sessions
    SystemPurposes['Custom'].systemMessage = v.target.value;
  }, []);

  const handleSwitchToCustom = React.useCallback((customText: string) => {
    if (setSystemPurposeId) {
      SystemPurposes['Custom'].systemMessage = customText;
      setSystemPurposeId(props.conversationId, 'Custom');
    }
  }, [props.conversationId, setSystemPurposeId]);

  const toggleEditMode = React.useCallback(() => setEditMode(on => !on), []);

  // MMOS mind handler: fetch full system prompt + inject memory context, then activate
  const handleMindSelected = React.useCallback(async (mindId: string) => {
    if (!setSystemPurposeId) return;

    // If already registered in SystemPurposes with a preview, activate immediately
    if (SystemPurposes[mindId]) {
      setSystemPurposeId(props.conversationId, mindId);
    }

    // Fetch full system prompt in background and update
    setLoadingMindId(mindId);
    const [fullPrompt, memoryBlock] = await Promise.all([
      fetchMindSystemPrompt(mindId),
      // Find active project folder for this conversation to inject debate context
      (async () => {
        const folders = useFolderStore.getState().folders;
        const activeFolder = folders.find(f => f.conversationIds.includes(props.conversationId));
        return buildMemoryContextBlock(activeFolder?.title);
      })(),
    ]);
    setLoadingMindId(null);

    if (fullPrompt && SystemPurposes[mindId]) {
      // Append memory layer context (memories + recent debates) to system prompt
      SystemPurposes[mindId]!.systemMessage = fullPrompt + memoryBlock;
    }

    setSystemPurposeId(props.conversationId, mindId);
  }, [props.conversationId, setSystemPurposeId]);


  // Search (filtering)

  const handleSearchClear = React.useCallback(() => {
    setSearchQuery('');
    setFilteredIDs(null);
  }, []);

  const handleSearchOnChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    if (!query)
      return handleSearchClear();

    // Filter results based on search term (title and description)
    const lcQuery = query.toLowerCase();
    const ids = (Object.keys(SystemPurposes) as SystemPurposeId[])
      .filter(key => SystemPurposes.hasOwnProperty(key))
      .filter(key => {
        const purpose = SystemPurposes[key as SystemPurposeId];
        return purpose.title.toLowerCase().includes(lcQuery)
          || (typeof purpose.description === 'string' && purpose.description.toLowerCase().includes(lcQuery));
      });

    setSearchQuery(query);
    setFilteredIDs(ids);

    // If there's a search term, activate the first item
    // if (ids.length && systemPurposeId && !ids.includes(systemPurposeId))
    //   handlePurposeChanged(ids[0] as SystemPurposeId);
  }, [handleSearchClear]);

  const handleSearchOnKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key == 'Escape')
      handleSearchClear();
  }, [handleSearchClear]);


  // safety check - shouldn't happen - this is set to null when the conversation is not found
  if (!setSystemPurposeId)
    return null;


  return (
    <Box sx={{
      maxWidth: 'md',
      minWidth: `${2 + 1 + tileSize * 2}rem`, // accomodate at least 2 columns (scroll-x in case)
      mx: 'auto',
      minHeight: '90%', // was 60svh - looked too big on desktop stacked
      display: 'grid',
      px: { xs: 0.5, sm: 1, md: 2 },
      py: 2,
    }}>

      {showPersonaFinder && <Box>
        <Input
          fullWidth
          variant='outlined' color='neutral'
          value={searchQuery} onChange={handleSearchOnChange}
          onKeyDown={handleSearchOnKeyDown}
          placeholder='Search for purpose…'
          startDecorator={<SearchIcon />}
          endDecorator={searchQuery && (
            <IconButton onClick={handleSearchClear}>
              <ClearIcon />
            </IconButton>
          )}
          sx={{
            boxShadow: 'sm',
          }}
        />
      </Box>}


      <Box sx={{
        my: 'auto',
        // layout
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${tileSize}rem, ${tileSize}rem))`,
        justifyContent: 'center', gap: `${tileGap}rem`,
      }}>

        {/* [row 0] ...  Edit mode [ ] */}
        <Box sx={{
          gridColumn: '1 / -1',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Typography level='title-sm'>
            AI Persona
          </Typography>
          <Tooltip disableInteractive title={editMode ? 'Done Editing' : 'Edit Tiles'}>
            <IconButton size='sm' onClick={toggleEditMode} sx={{ my: '-0.25rem' /* absorb the button padding */ }}>
              {editMode ? <DoneIcon /> : <EditRoundedIcon />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Personas Tiles */}
        {visiblePurposeIDs.map((spId: SystemPurposeId) => {
          const isActive = systemPurposeId === spId;
          const systemPurpose = SystemPurposes[spId];
          return (
            <Tile
              key={'tile-' + spId}
              text={systemPurpose?.title}
              imageUrl={systemPurpose?.imageUri}
              symbol={systemPurpose?.symbol}
              isActive={isActive}
              isEditMode={editMode}
              isHidden={hiddenPurposeIDs.includes(spId)}
              isHighlighted={systemPurpose?.highlighted}
              onClick={() => editMode ? toggleHiddenPurposeId(spId) : handlePurposeChanged(spId)}
            />
          );
        })}

        {/* Persona Creator Tile */}
        {(editMode || !hidePersonaCreator) && (
          <Tile
            text='Persona Creator'
            symbol='🎭'
            isActive={false}
            isEditMode={editMode}
            isHidden={hidePersonaCreator}
            onClick={() => editMode ? toggleHiddenPurposeId(PURPOSE_ID_PERSONA_CREATOR) : void navigateToPersonas()}
            sx={{
              fontSize: 'xs',
              boxShadow: 'xs',
              backgroundColor: 'neutral.softDisabledBg',
            }}
          />
        )}

        {/* Minds grouped by squad */}
        {minds.length > 0 && <MindSquadSections
          minds={minds}
          systemPurposeId={systemPurposeId}
          loadingMindId={loadingMindId}
          onMindSelected={handleMindSelected}
        />}


        {/* [row -3] Description */}
        <Box sx={{ gridColumn: '1 / -1', mt: 3, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>

          {/* Description*/}
          <Typography level='body-sm' sx={{ color: 'text.primary' }}>
            {!selectedPurpose
              ? 'Cannot find the former persona' + (systemPurposeId ? ` "${systemPurposeId}"` : '')
              : selectedPurpose?.description || 'No description available'}
          </Typography>

          {/* Examples/Prompt Toggles */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {fourExamples && showExamplescomponent}
            {!isCustomPurpose && showPromptComponent}
          </Box>

        </Box>

        {/* [row -3] Example incipits */}
        {systemPurposeId !== 'Custom' && (
          <ExpanderControlledBox expanded={showExamples || (!isCustomPurpose && showPrompt)} sx={{ gridColumn: '1 / -1', pt: 1 }}>
            {showExamples && (
              <List
                aria-label='Persona Conversation Starters'
                sx={{
                  // example items 2-col layout
                  display: 'grid',
                  gridTemplateColumns: `repeat(auto-fit, minmax(${tileSize * 3 + 1}rem, 1fr))`,
                  gap: 1,
                }}
              >
                {fourExamples?.map((example, idx) => (
                  <ListItem
                    key={idx}
                    variant='outlined'
                    sx={{
                      // padding: '0.25rem 0.5rem',
                      backgroundColor: 'background.popup',
                      borderRadius: 'md',
                      boxShadow: 'xs',
                      '& svg': { opacity: 0.1, transition: 'opacity 0.2s' },
                      '&:hover svg': { opacity: 1 },
                    }}
                  >
                    <ListItemButton onClick={() => props.runExample(example)} sx={{ justifyContent: 'space-between', borderRadius: 'md' }}>
                      <Typography level='body-sm'>
                        {/* Icon 📁 when the .action is 'require-data-attachment' */}
                        {(typeof example === 'object' && example.action === 'require-data-attachment') ? '📁 ' : ''}
                        {(typeof example === 'string') ? example : example.prompt}
                      </Typography>
                      <TelegramIcon color='primary' sx={{}} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
            {(!isCustomPurpose && showPrompt) && (
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography level='title-sm'>
                      System Prompt
                    </Typography>
                    <Button
                      variant='plain' color='neutral' size='sm'
                      endDecorator={<EditNoteIcon />}
                      onClick={() => handleSwitchToCustom(bareBonesPromptMixer(selectedPurpose?.systemMessage || 'No system message available', chatLLM?.id))}
                      sx={{ ml: 'auto', my: '-0.25rem' /* absorb the button padding */ }}
                    >
                      Custom
                    </Button>
                  </Box>
                  <Typography level='body-sm' sx={{ whiteSpace: 'break-spaces' }}>
                    {bareBonesPromptMixer(selectedPurpose?.systemMessage || 'No system message available', chatLLM?.id)}
                  </Typography>
                  {!!selectedPurpose?.systemMessageNotes && (
                    <Alert sx={{ m: -1, mt: 1, p: 1 }}>
                      <Typography level='body-xs'>
                        Prompt notes: {selectedPurpose.systemMessageNotes}
                      </Typography>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}
          </ExpanderControlledBox>
        )}

        {/* [row -1] Custom Prompt box */}
        {systemPurposeId === 'Custom' && (
          <Textarea
            autoFocus
            variant='outlined'
            placeholder='Craft your custom system message here…'
            minRows={3}
            defaultValue={SystemPurposes['Custom']?.systemMessage}
            onChange={handleCustomSystemMessageChange}
            endDecorator={
              <Alert sx={{ flex: 1, p: 1 }}>
                <Typography level='body-xs'>
                  Just start chatting when done.
                </Typography>
              </Alert>
            }
            sx={{
              gridColumn: '1 / -1',
              backgroundColor: 'background.surface',
              '&:focus-within': {
                backgroundColor: 'background.popup',
              },
              lineHeight: lineHeightTextareaMd,
            }}
          />
        )}

        {/* [row -1] YouTube URL */}
        {isYouTubeTranscriber && (
          <YouTubeURLInput
            onSubmit={handleAppendTranscriptAsMessage}
            sx={{
              gridColumn: '1 / -1',
            }}
          />
        )}

      </Box>

    </Box>
  );
}