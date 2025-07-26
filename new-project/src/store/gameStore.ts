import { create } from 'zustand';

export type GameState = 'MainMenu' | 'InGame' | 'Paused';

export type GameStoreState = {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  location: string;
  objective: string;
  areaMap: string;
  gameTime: string;
};

export const useGameStore = create<GameStoreState>((set) => ({
  gameState: 'MainMenu',
  setGameState: (state) => set({ gameState: state }),
  location: 'Unknown',
  objective: 'Find your purpose.',
  areaMap: `
    ? ? ?
    ? ? ?
    ? ? ?
  `,
  gameTime: 'Day 1, 00:00 AM',
}));