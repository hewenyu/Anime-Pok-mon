import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore, type GameState } from './gameStore';
import * as storage from '../utils/gameStateStorage';
import type { SaveSlotSummary, FullGameState } from '../types';

// Mock the storage utility
vi.mock('../utils/gameStateStorage');

const mockSummaries: SaveSlotSummary[] = [
  { slotId: 1, timestamp: 123, playerProfile: { name: '小智' }, isEmpty: false },
  { slotId: 2, timestamp: 0, playerProfile: { name: '空插槽' }, isEmpty: true },
  { slotId: 3, timestamp: 0, playerProfile: { name: '空插槽' }, isEmpty: true },
];

const mockGameState: FullGameState = {
  playerProfile: { name: '小智', age: 10, gender: '男' },
  playerTeam: [],
  inventory: [],
  money: 100,
  gameTime: 'Day 1, 09:00 AM',
  location: '真新镇',
  objective: '成为宝可梦大师',
  storyState: {
    narrative: '开始冒险！',
    speaker: '旁白',
    choices: [],
  },
};

describe('gameStore', () => {
  beforeEach(() => {
    // Reset the store state before each test
    useGameStore.setState({
      gameState: 'MainMenu',
      savedGames: [],
      // Reset other relevant state
      ...mockGameState
    });
    vi.resetAllMocks();
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

  describe('Save and Load functionality', () => {
    it('should fetch saved games and update the state', async () => {
      const getSpy = vi.spyOn(storage, 'getSavedGamesSummary').mockResolvedValue(mockSummaries);
      
      await useGameStore.getState().fetchSavedGames();

      expect(getSpy).toHaveBeenCalled();
      const { savedGames } = useGameStore.getState();
      expect(savedGames).toEqual(mockSummaries);
    });

    it('should save the current game to a slot and refresh the list', async () => {
      const saveSpy = vi.spyOn(storage, 'saveGameState').mockResolvedValue(undefined);
      const fetchSpy = vi.spyOn(storage, 'getSavedGamesSummary').mockResolvedValue(mockSummaries);
      
      // Set a game state to be saved
      useGameStore.setState({ ...mockGameState, gameState: 'InGame' });

      await useGameStore.getState().saveGame(1);

      expect(saveSpy).toHaveBeenCalledWith(1, expect.any(Object));
      // Verify that the correct game state was passed to saveGameState
      const savedData = saveSpy.mock.calls[0][1];
      expect(savedData.money).toBe(100);

      expect(fetchSpy).toHaveBeenCalled();
      const { savedGames } = useGameStore.getState();
      expect(savedGames).toEqual(mockSummaries);
    });
  });
});