import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSaveManager } from '../hooks/useSaveManager';
import { GameState, GameMode } from '../types';
import { INITIAL_GAME_STATE } from '../constants';

// Mock the game state storage functions
vi.mock('../utils/gameStateStorage', () => ({
  saveGameState: vi.fn(),
  loadGameState: vi.fn(),
  getSavedGames: vi.fn(),
  deleteGameState: vi.fn(),
}));

import { saveGameState, loadGameState, getSavedGames } from '../utils/gameStateStorage';

describe('useSaveManager - AI thinking state fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should prevent AI loading state from being saved', async () => {
    const gameStateWithThinking: GameState = {
      ...INITIAL_GAME_STATE,
      aiLoadingStatus: { status: 'loading', message: 'AI 正在思考...' },
      pokemonInstanceIdToRegenerate: 'test-id',
      pokemonNameToRegenerate: 'test-pokemon',
      gameMode: GameMode.ADVENTURE,
    };

    const setGameState = vi.fn();
    vi.mocked(getSavedGames).mockResolvedValue([]);

    const { result } = renderHook(() => useSaveManager(gameStateWithThinking, setGameState));

    await act(async () => {
      await result.current.saveGame(1);
    });

    // Check that saveGameState was called with sanitized state
    expect(saveGameState).toHaveBeenCalledWith(1, expect.objectContaining({
      aiLoadingStatus: { status: 'idle' },
      pokemonInstanceIdToRegenerate: undefined,
      pokemonNameToRegenerate: undefined,
    }));

    // Verify original fields are preserved
    const savedState = vi.mocked(saveGameState).mock.calls[0][1];
    expect(savedState.gameMode).toBe(GameMode.ADVENTURE);
    expect(savedState.playerProfile).toBe(gameStateWithThinking.playerProfile);
  });

  it('should sanitize AI loading state when loading game', async () => {
    const savedStateWithThinking: GameState = {
      ...INITIAL_GAME_STATE,
      aiLoadingStatus: { status: 'loading', message: 'AI 正在思考...' },
      pokemonInstanceIdToRegenerate: 'old-id',
      pokemonNameToRegenerate: 'old-pokemon',
      gameMode: GameMode.ADVENTURE,
    };

    const setGameState = vi.fn();
    vi.mocked(loadGameState).mockResolvedValue(savedStateWithThinking);
    vi.mocked(getSavedGames).mockResolvedValue([]);

    const { result } = renderHook(() => useSaveManager(INITIAL_GAME_STATE, setGameState));

    await act(async () => {
      await result.current.loadGame(1);
    });

    // Check that setGameState was called with sanitized state
    expect(setGameState).toHaveBeenCalledWith(expect.objectContaining({
      aiLoadingStatus: { status: 'idle' },
      pokemonInstanceIdToRegenerate: undefined,
      pokemonNameToRegenerate: undefined,
      gameMode: GameMode.ADVENTURE, // Should preserve other fields
    }));
  });
});