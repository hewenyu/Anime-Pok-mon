import { create } from 'zustand';
import type { SaveSlotSummary, FullGameState, PlayerProfile, StoryState } from '../types';
import { getSavedGamesSummary, saveGameState as storageSave } from '../utils/gameStateStorage';

export type GameState = 'MainMenu' | 'InGame' | 'Paused';

export type GameStoreState = {
  // Core State
  gameState: GameState;
  setGameState: (state: GameState) => void;
  
  // Player & World State
  playerProfile: PlayerProfile;
  location: string;
  objective: string;
  areaMap: string;
  gameTime: string;
  money: number;

  // Story State
  storyState: StoryState;
  isStoryLoading: boolean;
  setStoryState: (newState: Partial<StoryState>) => void;
  setIsStoryLoading: (isLoading: boolean) => void;

  // Save Game State & Actions
  savedGames: SaveSlotSummary[];
  fetchSavedGames: () => Promise<void>;
  saveGame: (slotId: number) => Promise<void>;
};

export const useGameStore = create<GameStoreState>((set, get) => ({
  // Core State
  gameState: 'MainMenu',
  setGameState: (state) => set({ gameState: state }),

  // Player & World State
  playerProfile: { name: '无名氏' },
  location: 'Unknown',
  objective: 'Find your purpose.',
  areaMap: `
    ? ? ?
    ? ? ?
    ? ? ?
  `,
  gameTime: 'Day 1, 00:00 AM',
  money: 0,

  // Story State
  storyState: {
    narrative: '你站在一片开阔的草地上，远处是连绵起伏的群山。微风拂过，带来了青草和泥土的气息。接下来你打算做什么？',
    speaker: '旁白',
    choices: [],
  },
  isStoryLoading: false,
  setStoryState: (newState) =>
    set((state) => ({
      storyState: { ...state.storyState, ...newState },
    })),
  setIsStoryLoading: (isLoading) => set({ isStoryLoading: isLoading }),

  // Save Game State & Actions
  savedGames: [],
  fetchSavedGames: async () => {
    const summaries = await getSavedGamesSummary();
    set({ savedGames: summaries });
  },
  saveGame: async (slotId: number) => {
    const { playerProfile, location, objective, gameTime, money, storyState } = get();
    
    // In a real implementation, you'd also get playerTeam and inventory
    const currentGameState: FullGameState = {
      playerProfile,
      location,
      objective,
      gameTime,
      money,
      storyState,
      playerTeam: [], // Placeholder
      inventory: [], // Placeholder
    };

    await storageSave(slotId, currentGameState);
    // Refresh the list of saved games after saving
    await get().fetchSavedGames();
  },
}));