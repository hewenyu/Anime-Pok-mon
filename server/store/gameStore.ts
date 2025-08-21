import { create } from 'zustand';
import { GameState, GameMode, LoadingStatus } from '../types';
import { INITIAL_GAME_STATE } from '../constants';

interface CoreGameState {
  // Core game flow
  gameMode: GameMode;
  currentGameTime: number;

  // AI loading state
  aiLoadingStatus: LoadingStatus;

  // Battle history (could be moved to battle store later)
  battleHistory: any[];

  // General flags
  hasAttemptedInitialLoad: boolean;
}

interface GameStore extends CoreGameState {
  // Actions
  setGameMode: (mode: GameMode) => void;
  setCurrentGameTime: (time: number) => void;
  advanceGameTime: (options: { minutes?: number; hours?: number }) => void;
  setAILoadingStatus: (status: LoadingStatus) => void;
  addBattleToHistory: (battle: any) => void;
  setHasAttemptedInitialLoad: (attempted: boolean) => void;
  updateGameState: (updater: (state: GameState) => Partial<GameState>) => void;
  resetGameState: () => void;
}

const initialCoreState: CoreGameState = {
  gameMode: INITIAL_GAME_STATE.gameMode,
  currentGameTime: INITIAL_GAME_STATE.currentGameTime,
  aiLoadingStatus: INITIAL_GAME_STATE.aiLoadingStatus,
  battleHistory: INITIAL_GAME_STATE.battleHistory,
  hasAttemptedInitialLoad: false,
};

export const useGameStore = create<GameStore>(set => ({
  // Initial state
  ...initialCoreState,

  // Actions
  setGameMode: (mode: GameMode) => set({ gameMode: mode }),

  setCurrentGameTime: (time: number) => set({ currentGameTime: time }),

  advanceGameTime: (options: { minutes?: number; hours?: number }) =>
    set(state => {
      const date = new Date(state.currentGameTime);
      if (options.minutes) date.setMinutes(date.getMinutes() + options.minutes);
      if (options.hours) date.setHours(date.getHours() + options.hours);
      return { currentGameTime: date.getTime() };
    }),

  setAILoadingStatus: (status: LoadingStatus) =>
    set({ aiLoadingStatus: status }),

  addBattleToHistory: (battle: any) =>
    set(state => ({
      battleHistory: [...state.battleHistory, battle],
    })),

  setHasAttemptedInitialLoad: (attempted: boolean) =>
    set({ hasAttemptedInitialLoad: attempted }),

  // Legacy compatibility - this can be gradually removed as we migrate to feature stores
  updateGameState: (updater: (state: GameState) => Partial<GameState>) =>
    set(state => {
      const currentState = { ...INITIAL_GAME_STATE, ...state };
      const updates = updater(currentState);
      return { ...state, ...updates };
    }),

  resetGameState: () => set(initialCoreState),
}));
