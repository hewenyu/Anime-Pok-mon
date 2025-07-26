import { create } from 'zustand';

export type GameMode = 'MainMenu' | 'InGame' | 'Paused';

type GameState = {
  gameMode: GameMode;
  setGameMode: (mode: GameMode) => void;
};

export const useGameStore = create<GameState>((set) => ({
  gameMode: 'MainMenu',
  setGameMode: (mode) => set({ gameMode: mode }),
}));