import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore, type GameState } from './gameStore.ts';

describe('gameStore', () => {
  beforeEach(() => {
    // Reset the store state before each test
    useGameStore.setState({ gameState: 'MainMenu' });
  });

  it('should have an initial game state of "MainMenu"', () => {
    const { gameState } = useGameStore.getState();
    expect(gameState).toBe('MainMenu');
  });

  it('should set the game state', () => {
    const newState: GameState = 'InGame';
    useGameStore.getState().setGameState(newState);
    const { gameState } = useGameStore.getState();
    expect(gameState).toBe(newState);
  });
});