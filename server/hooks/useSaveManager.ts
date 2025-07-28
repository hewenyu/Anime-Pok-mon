import { useState, useCallback, useEffect } from 'react';
import { GameState, GameMode } from '../types';
import {
  saveGameState,
  loadGameState,
  getSavedGames,
  deleteGameState,
} from '../utils/gameStateStorage';

type SetGameStateFunction = (state: GameState) => void;

export const useSaveManager = (
  gameState: GameState,
  setGameState: SetGameStateFunction
) => {
  const [savedGames, setSavedGames] = useState<
    Awaited<ReturnType<typeof getSavedGames>>
  >([]);
  const [isLoadingFromSave, setIsLoadingFromSave] = useState(true);

  const loadGame = useCallback(
    async (slotId: number) => {
      setIsLoadingFromSave(true);
      const savedState = await loadGameState(slotId);
      if (savedState) {
        // Reset transient AI states for backward compatibility with old saves
        const sanitizedState = {
          ...savedState,
          aiLoadingStatus: { status: 'idle' as const },
          pokemonInstanceIdToRegenerate: undefined,
          pokemonNameToRegenerate: undefined,
        };
        setGameState(sanitizedState);
      } else {
        console.error(`Failed to load game from slot ${slotId}`);
      }
      setIsLoadingFromSave(false);
    },
    [setGameState]
  );

  const saveGame = useCallback(
    async (slotId: number) => {
      // Create a clean version of the game state that excludes transient AI states
      const stateToSave = {
        ...gameState,
        aiLoadingStatus: { status: 'idle' as const },
        pokemonInstanceIdToRegenerate: undefined,
        pokemonNameToRegenerate: undefined,
      };
      await saveGameState(slotId, stateToSave);
      const saves = await getSavedGames();
      setSavedGames(saves);
    },
    [gameState]
  );

  const deleteGame = useCallback(async (slotId: number) => {
    await deleteGameState(slotId);
    const saves = await getSavedGames();
    setSavedGames(saves);
  }, []);

  const checkForSavedGamesOnMount = useCallback(async () => {
    const saves = await getSavedGames();
    setSavedGames(saves);
    if (saves.length > 0) {
      setGameState({ ...gameState, gameMode: GameMode.MAIN_MENU });
    } else {
      setGameState({ ...gameState, gameMode: GameMode.CUSTOMIZE_RANDOM_START });
    }
    setIsLoadingFromSave(false);
  }, [setGameState]);

  useEffect(() => {
    checkForSavedGamesOnMount();
  }, []);

  return {
    savedGames,
    isLoadingFromSave,
    loadGame,
    saveGame,
    deleteGame,
  };
};
