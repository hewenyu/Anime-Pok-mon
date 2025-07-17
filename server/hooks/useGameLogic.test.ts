/// <reference types="vitest/globals" />
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGameLogic } from './useGameLogic';
import * as gameStateStorage from '../utils/gameStateStorage';
import { GameState, GameMode } from '../types';
import { INITIAL_GAME_STATE } from '../constants';

// Mock the gameStateStorage module
vi.mock('../utils/gameStateStorage', () => ({
  getSavedGames: vi.fn(),
  loadGameState: vi.fn(),
  saveGameState: vi.fn(),
  deleteGameState: vi.fn(),
}));

const mockGetSavedGames = gameStateStorage.getSavedGames as any;
const mockLoadGameState = gameStateStorage.loadGameState as any;

describe('useGameLogic Hook with Save/Load Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error for cleaner test output, especially for expected errors
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should call getSavedGames on initialization and expose the list', async () => {
    const savedGamesList = [
      { slotId: 1, timestamp: Date.now() },
      { slotId: 2, timestamp: Date.now() - 10000 },
    ];
    mockGetSavedGames.mockResolvedValue(savedGamesList);

    const { result } = renderHook(() => useGameLogic());

    await waitFor(() => {
      expect(result.current.savedGames).toEqual(savedGamesList);
    });

    expect(mockGetSavedGames).toHaveBeenCalledTimes(1);
    expect(result.current.savedGames).toEqual(savedGamesList);
  });

  it('should provide a loadGame function that updates game state', async () => {
    const slotToLoad = 1;
    const mockSavedState: GameState = {
      ...INITIAL_GAME_STATE,
      gameMode: GameMode.ADVENTURE,
      playerProfile: { name: 'Mock Player', gender: '男', age: 20, description: 'A test player.' },
      money: 500,
    };
    mockLoadGameState.mockResolvedValue(mockSavedState);
    mockGetSavedGames.mockResolvedValue([{ slotId: 1, timestamp: Date.now() }]);

    const { result } = renderHook(() => useGameLogic());
    await waitFor(() => {
      expect(mockGetSavedGames).toHaveBeenCalled();
    });

    await act(async () => {
      await result.current.loadGame(slotToLoad);
    });

    expect(mockLoadGameState).toHaveBeenCalledWith(slotToLoad);
    expect(result.current.gameState).toEqual(mockSavedState);
  });

  it('should not call createNewCharacter or similar functions if saved games exist', async () => {
    mockGetSavedGames.mockResolvedValue([{ slotId: 1, timestamp: Date.now() }]);
    
    // We need to spy on triggerAIStory to check if it's called.
    // Since it's part of the hook's internal logic, we can't easily mock it from outside.
    // Instead, we check a side effect: the game state should remain initial,
    // and no loading state for AI should be triggered.
    const { result } = renderHook(() => useGameLogic());

    await waitFor(() => {
      expect(mockGetSavedGames).toHaveBeenCalled();
    });

    // The hook should not automatically change the game mode or trigger AI loading
    // if saves are present. It should wait for user action.
    expect(result.current.gameState.gameMode).toBe(GameMode.MAIN_MENU);
    expect(result.current.gameState.aiLoadingStatus.status).toBe('idle');
    expect(result.current.gameState.initialProfileGenerated).toBe(false);
  });

  it('should set a flag to prevent character creation before load completes', async () => {
    const slotToLoad = 1;
    const mockSavedState: GameState = { ...INITIAL_GAME_STATE, money: 1234 };
    mockLoadGameState.mockResolvedValue(mockSavedState);
    mockGetSavedGames.mockResolvedValue([{ slotId: 1, timestamp: Date.now() }]);

    const { result } = renderHook(() => useGameLogic());
    await waitFor(() => {
      expect(mockGetSavedGames).toHaveBeenCalled();
    });

    let loadPromise: Promise<void> | undefined;
    act(() => {
      loadPromise = result.current.loadGame(slotToLoad);
    });

    // While loading, a flag should be set
    expect(result.current.isLoadingFromSave).toBe(true);

    await act(async () => {
      await loadPromise;
    });

    // After loading, the flag should be reset
    expect(result.current.isLoadingFromSave).toBe(false);
    expect(result.current.gameState.money).toBe(1234);
  });
});