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
        setGameState(savedState);
      } else {
        console.error(`Failed to load game from slot ${slotId}`);
      }
      setIsLoadingFromSave(false);
    },
    [setGameState]
  );

  const saveGame = useCallback(
    async (slotId: number) => {
      await saveGameState(slotId, gameState);
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
