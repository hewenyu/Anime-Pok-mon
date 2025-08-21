import { create } from 'zustand';
import { ChatHistoryEntry, AIStoryResponse, NPC } from '../../../types';

interface AdventureState {
  // Story and narrative
  currentLocationDescription: string;
  currentObjective: string;
  currentAIScene: AIStoryResponse | null;
  currentAreaMap: string | null;
  globalAreaMap: Record<string, string>;
  chatHistory: ChatHistoryEntry[];

  // NPCs and relationships
  knownNPCs: NPC[];

  // Current segment tracking
  currentStaticSegmentId: string;
  npcInteractionLoading: boolean;
}

interface AdventureActions {
  // Location and map
  setCurrentLocation: (description: string) => void;
  setCurrentObjective: (objective: string) => void;
  setCurrentAreaMap: (map: string | null) => void;
  updateGlobalAreaMap: (locationKey: string, map: string) => void;

  // AI Scene
  setCurrentAIScene: (scene: AIStoryResponse | null) => void;

  // Chat history
  addChatHistoryEntry: (entry: ChatHistoryEntry) => void;
  updateChatHistory: (
    updater: (history: ChatHistoryEntry[]) => ChatHistoryEntry[]
  ) => void;
  clearChatHistory: () => void;

  // NPCs
  addKnownNPC: (npc: NPC) => void;
  updateNPCRelationship: (npcId: string, relationshipStatus: string) => void;

  // Static story navigation
  setCurrentStaticSegmentId: (id: string) => void;
  setNpcInteractionLoading: (loading: boolean) => void;

  // Reset
  resetAdventure: () => void;
}

const initialAdventureState: AdventureState = {
  currentLocationDescription: '',
  currentObjective: '',
  currentAIScene: null,
  currentAreaMap: null,
  globalAreaMap: {},
  chatHistory: [],
  knownNPCs: [],
  currentStaticSegmentId: 'INITIAL_PROFILE_PREPARATION',
  npcInteractionLoading: false,
};

export const useAdventureStore = create<AdventureState & AdventureActions>(
  (set, _get) => ({
    ...initialAdventureState,

    setCurrentLocation: description =>
      set({ currentLocationDescription: description }),
    setCurrentObjective: objective => set({ currentObjective: objective }),
    setCurrentAreaMap: map => set({ currentAreaMap: map }),

    updateGlobalAreaMap: (locationKey, map) =>
      set(state => ({
        globalAreaMap: { ...state.globalAreaMap, [locationKey]: map },
      })),

    setCurrentAIScene: scene => set({ currentAIScene: scene }),

    addChatHistoryEntry: entry =>
      set(state => ({
        chatHistory: [...state.chatHistory, entry],
      })),

    updateChatHistory: updater =>
      set(state => ({
        chatHistory: updater(state.chatHistory),
      })),

    clearChatHistory: () => set({ chatHistory: [] }),

    addKnownNPC: npc =>
      set(state => {
        const existingNPC = state.knownNPCs.find(n => n.id === npc.id);
        if (existingNPC) {
          return state; // Don't add duplicates
        }
        return { knownNPCs: [...state.knownNPCs, npc] };
      }),

    updateNPCRelationship: (npcId, relationshipStatus) =>
      set(state => ({
        knownNPCs: state.knownNPCs.map(npc =>
          npc.id === npcId ? { ...npc, relationshipStatus } : npc
        ),
      })),

    setCurrentStaticSegmentId: id => set({ currentStaticSegmentId: id }),
    setNpcInteractionLoading: loading =>
      set({ npcInteractionLoading: loading }),

    resetAdventure: () => set(initialAdventureState),
  })
);
