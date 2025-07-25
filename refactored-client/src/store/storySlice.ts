import type { StateCreator } from 'zustand';
import type { AIStoryResponse, ChatHistoryEntry, NPC } from '../types';

export interface StorySlice {
  currentAIScene: AIStoryResponse | null;
  chatHistory: ChatHistoryEntry[];
  knownNPCs: NPC[];
  actions: {
    setCurrentAIScene: (scene: AIStoryResponse) => void;
    addChatMessage: (message: ChatHistoryEntry) => void;
    addKnownNPC: (npc: NPC) => void;
  };
}

const initialStoryState: Omit<StorySlice, 'actions'> = {
  currentAIScene: null,
  chatHistory: [],
  knownNPCs: [],
};

export const createStorySlice: StateCreator<StorySlice, [], [], StorySlice> = (set) => ({
  ...initialStoryState,
  actions: {
    setCurrentAIScene: (scene) => set({ currentAIScene: scene }),
    addChatMessage: (message) =>
      set((state) => ({ chatHistory: [...state.chatHistory, message] })),
    addKnownNPC: (npc) =>
      set((state) => {
        if (state.knownNPCs.find((n) => n.id === npc.id)) {
          return {}; // Avoid duplicates
        }
        return { knownNPCs: [...state.knownNPCs, npc] };
      }),
  },
});