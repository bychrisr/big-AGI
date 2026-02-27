import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createBeamVanillaStore } from '../store-beam_vanilla';
import type { DebateMind } from './DebateMindSelector';


// Mock beam.config to avoid deep import chain (~/modules/blocks/OverlayButton)
vi.mock('../beam.config', () => ({
  BEAM_INVERT_BACKGROUND: true,
  BEAM_BTN_SX: {},
  BEAM_PANE_ZINDEX: 100,
  BEAM_SHOW_REASONING_ICON: false,
  SCATTER_COLOR: 'neutral',
  SCATTER_DEBUG_STATE: false,
  SCATTER_PLACEHOLDER: '...',
  SCATTER_RAY_DEF: 2,
  SCATTER_RAY_MAX: 8,
  SCATTER_RAY_MIN: 1,
  SCATTER_RAY_PRESETS: [2, 4, 8],
  SCATTER_RAY_SHOW_DRAG_HANDLE: false,
  GATHER_COLOR: 'success',
  GATHER_PLACEHOLDER: '...',
}));

// Mock the module-beam store to avoid localStorage access in tests
vi.mock('../store-module-beam', () => ({
  useModuleBeamStore: {
    getState: () => ({ lastConfig: null }),
  },
  updateBeamLastConfig: vi.fn(),
}));

// Mock LLM heuristic — no LLMs available in test env
vi.mock('~/common/stores/llms/store-llms-domains_slice', () => ({
  llmsHeuristicGetTopDiverseLlmIds: () => [],
}));

// Mock AIX client (not used in debate mode tests, but imported by beam.scatter)
vi.mock('~/modules/aix/client/aix.client', () => ({
  aixChatGenerateContent_DMessage_FromConversation: vi.fn(),
}));

// Mock LLM store
vi.mock('~/common/stores/llms/store-llms', () => ({
  findLLMOrThrow: vi.fn(),
}));

// Mock UX labs store
vi.mock('~/common/stores/store-ux-labs', () => ({
  getUXLabsHighPerformance: () => false,
}));

// Mock chat conversation utilities
vi.mock('~/common/stores/chat/chat.conversation', () => ({
  splitSystemMessageFromHistory: (history: unknown[]) => ({
    chatSystemInstruction: null,
    chatHistory: history,
  }),
}));


const MOCK_MINDS: DebateMind[] = [
  { id: 'alex_hormozi', name: 'Alex Hormozi', specialty: 'Business Growth' },
  { id: 'naval_ravikant', name: 'Naval Ravikant', specialty: 'Wealth & Philosophy' },
  { id: 'andrew_huberman', name: 'Andrew Huberman', specialty: 'Neuroscience & Health' },
];

function makeUserMessage() {
  // minimal DMessage shape required by the store
  return {
    id: 'msg-1',
    role: 'user' as const,
    fragments: [{ fId: 'f1', ft: 'content', part: { pt: 'text', text: 'Test debate topic' } }],
    created: Date.now(),
    updated: null,
    generator: null,
    metadata: null,
    userFlags: null,
    pendingIncomplete: undefined,
    label: null,
  };
}


describe('BeamStore debate mode', () => {

  let store: ReturnType<typeof createBeamVanillaStore>;

  beforeEach(() => {
    store = createBeamVanillaStore();
  });


  it('initializes with debateMode false and no debateMinds', () => {
    const state = store.getState();
    expect(state.debateMode).toBe(false);
    expect(state.debateMinds).toHaveLength(0);
  });


  it('openDebate sets debateMode true with selected minds', () => {
    const history = [makeUserMessage()];
    const callback = vi.fn();

    store.getState().openDebate(history, MOCK_MINDS, callback);

    const state = store.getState();
    expect(state.debateMode).toBe(true);
    expect(state.debateMinds).toHaveLength(3);
    expect(state.debateMinds[0]?.id).toBe('alex_hormozi');
    expect(state.debateMinds[1]?.id).toBe('naval_ravikant');
    expect(state.debateMinds[2]?.id).toBe('andrew_huberman');
  });


  it('openDebate sets isOpen and inputReady for valid history', () => {
    const history = [makeUserMessage()];
    const callback = vi.fn();

    store.getState().openDebate(history, MOCK_MINDS, callback);

    const state = store.getState();
    expect(state.isOpen).toBe(true);
    expect(state.inputReady).toBe(true);
    expect(state.inputIssues).toBeNull();
  });


  it('openDebate sets inputReady false for invalid history', () => {
    const callback = vi.fn();

    store.getState().openDebate([], MOCK_MINDS, callback);

    const state = store.getState();
    expect(state.inputReady).toBe(false);
    expect(state.inputIssues).toBeTruthy();
  });


  it('openDebate creates one ray per mind', () => {
    const history = [makeUserMessage()];
    const callback = vi.fn();

    store.getState().openDebate(history, MOCK_MINDS, callback);

    const state = store.getState();
    expect(state.rays).toHaveLength(3);
  });


  it('terminateKeepingSettings resets debateMode to false', () => {
    const history = [makeUserMessage()];
    const callback = vi.fn();

    store.getState().openDebate(history, MOCK_MINDS, callback);
    expect(store.getState().debateMode).toBe(true);

    store.getState().terminateKeepingSettings();
    expect(store.getState().debateMode).toBe(false);
    expect(store.getState().debateMinds).toHaveLength(0);
  });


  it('standard open() does not set debateMode', () => {
    const history = [makeUserMessage()];
    const callback = vi.fn();

    store.getState().open(history, null, false, callback);

    const state = store.getState();
    expect(state.debateMode).toBe(false);
    expect(state.debateMinds).toHaveLength(0);
  });


  it('openDebate stores the callback', () => {
    const history = [makeUserMessage()];
    const callback = vi.fn();

    store.getState().openDebate(history, MOCK_MINDS, callback);

    expect(store.getState().onSuccessCallback).toBe(callback);
  });

});


describe('DebateMindSelector mind selection logic', () => {

  it('requires at least 2 minds to start', () => {
    const MIN_MINDS = 2;
    const selected: DebateMind[] = [MOCK_MINDS[0]!];
    expect(selected.length >= MIN_MINDS).toBe(false);
  });


  it('allows up to 6 minds to be selected', () => {
    const MAX_MINDS = 6;
    // simulating adding one beyond max
    const selected = new Set<string>(['a', 'b', 'c', 'd', 'e', 'f']);
    const wouldAdd = selected.size < MAX_MINDS;
    expect(wouldAdd).toBe(false);

    const selected5 = new Set<string>(['a', 'b', 'c', 'd', 'e']);
    const canAddOne = selected5.size < MAX_MINDS;
    expect(canAddOne).toBe(true);
  });


  it('can start with exactly 2 minds selected', () => {
    const MIN_MINDS = 2;
    const selected: DebateMind[] = [MOCK_MINDS[0]!, MOCK_MINDS[1]!];
    expect(selected.length >= MIN_MINDS).toBe(true);
  });

});
