// Bridge store: Composer → BeamScatterPane for agent-triggered council debates
import { create } from 'zustand';

export interface PendingDebate {
  /** Council key (growth | product | leadership) */
  council: string;
  /** Topic/question from the user message */
  topic: string;
  /** Mind IDs to pre-select in DebateMindSelector */
  mindIds: string[];
}

interface DebateTriggerState {
  pending: PendingDebate | null;
  setPending: (debate: PendingDebate) => void;
  clearPending: () => void;
}

export const useDebateTriggerStore = create<DebateTriggerState>()((set) => ({
  pending: null,
  setPending: (debate) => set({ pending: debate }),
  clearPending: () => set({ pending: null }),
}));
