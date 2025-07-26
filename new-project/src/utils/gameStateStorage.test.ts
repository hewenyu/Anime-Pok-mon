import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getSavedGamesSummary,
  saveGameState,
  loadGameState,
  deleteGameState,
} from './gameStateStorage';
import type { FullGameState } from '../types';

const GAME_SAVES_KEY = 'game_saves';
const CURRENT_VERSION = '1.0.1';

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

describe('gameStateStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return a list of empty save summaries if no data exists', async () => {
    const summaries = await getSavedGamesSummary();
    expect(summaries).toHaveLength(3);
    expect(summaries[0].isEmpty).toBe(true);
    expect(summaries[0].playerProfile.name).toBe('空插槽');
  });

  it('should save a game state to a new slot', async () => {
    const now = Date.now();
    vi.setSystemTime(now);

    await saveGameState(1, mockGameState);
    const summaries = await getSavedGamesSummary();
    
    expect(summaries[0].isEmpty).toBe(false);
    expect(summaries[0].playerProfile.name).toBe('小智');
    expect(summaries[0].timestamp).toBe(now);
  });

  it('should overwrite an existing save slot', async () => {
    await saveGameState(1, mockGameState);
    const updatedState = { ...mockGameState, money: 500 };
    await saveGameState(1, updatedState);

    const loadedState = await loadGameState(1);
    expect(loadedState?.money).toBe(500);
  });

  it('should load a saved game state', async () => {
    await saveGameState(2, mockGameState);
    const loadedState = await loadGameState(2);
    expect(loadedState).toEqual(mockGameState);
  });

  it('should return null when loading a non-existent slot', async () => {
    const loadedState = await loadGameState(1);
    expect(loadedState).toBeNull();
  });

  it('should delete a saved game state', async () => {
    await saveGameState(3, mockGameState);
    let loadedState = await loadGameState(3);
    expect(loadedState).not.toBeNull();

    await deleteGameState(3);
    loadedState = await loadGameState(3);
    expect(loadedState).toBeNull();
  });

  it('should ignore saved data with a version mismatch', async () => {
    const oldData = {
      version: '0.9.0',
      saveSlots: [{ slotId: 1, timestamp: Date.now(), gameState: mockGameState }],
    };
    localStorage.setItem(GAME_SAVES_KEY, JSON.stringify(oldData));

    const summaries = await getSavedGamesSummary();
    expect(summaries[0].isEmpty).toBe(true);
  });

  it('should save data with the correct version', async () => {
    await saveGameState(1, mockGameState);
    const rawData = localStorage.getItem(GAME_SAVES_KEY);
    const parsedData = JSON.parse(rawData!);
    expect(parsedData.version).toBe(CURRENT_VERSION);
  });
});