import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore, type GameMode } from './gameStore.ts';

describe('gameStore', () => {
  beforeEach(() => {
    // Reset the store state before each test
    useGameStore.setState({ gameMode: 'MainMenu' });
  });

  it('should have an initial game state of "MainMenu"', () => {
    const { gameMode } = useGameStore.getState();
    expect(gameMode).toBe('MainMenu');
  });

  it('should set the game mode', () => {
    const newMode: GameMode = 'InGame';
    useGameStore.getState().setGameMode(newMode);
    const { gameMode } = useGameStore.getState();
    expect(gameMode).toBe(newMode);
  });
});