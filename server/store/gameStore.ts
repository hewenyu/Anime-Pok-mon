import { create } from 'zustand';
import { GameState, GameMode } from '../types';
import { INITIAL_GAME_STATE } from '../constants';

interface GameStore extends GameState {
  // Actions
  setGameMode: (mode: GameMode) => void;
  updateGameState: (updater: (state: GameState) => Partial<GameState>) => void;
  resetGameState: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state from constants
  ...INITIAL_GAME_STATE,

  // Actions
  setGameMode: (mode: GameMode) =>
    set((state) => ({ ...state, gameMode: mode })),

  updateGameState: (updater: (state: GameState) => Partial<GameState>) =>
    set((state) => {
      const updates = updater(state);
      return { ...state, ...updates };
    }),

  resetGameState: () => set(INITIAL_GAME_STATE),
}));