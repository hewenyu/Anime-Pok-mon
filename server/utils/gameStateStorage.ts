import { GameState, GameSave, SaveSlot, PlayerProfile } from '../types';

const GAME_SAVES_KEY = 'game_saves';
const CURRENT_VERSION = '1.0.0';

/**
 * Retrieves the entire GameSave object from localStorage.
 * @returns The parsed GameSave object or a default structure if not found or invalid.
 */
const getGameSave = async (): Promise<GameSave> => {
  try {
    const storedData = localStorage.getItem(GAME_SAVES_KEY);
    if (storedData) {
      const parsedData: GameSave = JSON.parse(storedData);
      if (parsedData.version === CURRENT_VERSION) {
        return parsedData;
      }
      // eslint-disable-next-line no-console
      console.warn('Game save version mismatch, ignoring saved data.');
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load or parse game saves:', error);
  }
  // Return a default structure if no valid data is found
  return { version: CURRENT_VERSION, saveSlots: [] };
};

/**
 * Saves the entire GameSave object to localStorage.
 * @param gameSave The GameSave object to be stored.
 */
const setGameSave = async (gameSave: GameSave): Promise<void> => {
  try {
    const dataToStore = JSON.stringify(gameSave);
    localStorage.setItem(GAME_SAVES_KEY, dataToStore);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to save game state:', error);
    throw new Error('Failed to save game state due to a serialization error.');
  }
};

/**
 * Returns a list of save slots without the full game state for performance.
 * @returns A promise that resolves to an array of SaveSlot objects (without gameState).
 */
export const getSavedGames = async (): Promise<
  (Omit<SaveSlot, 'gameState'> & { playerProfile: PlayerProfile })[]
> => {
  const gameSave = await getGameSave();
  return gameSave.saveSlots.map(({ slotId, timestamp, gameState }) => ({
    slotId,
    timestamp,
    playerProfile: gameState.playerProfile,
  }));
};

/**
 * Saves a game state to a specific slot.
 * @param slotId The ID of the slot to save to.
 * @param gameState The game state to save.
 * @returns A promise that resolves when the save is complete.
 */
export const saveGameState = async (
  slotId: number,
  gameState: GameState
): Promise<void> => {
  const gameSave = await getGameSave();
  const newSaveSlot: SaveSlot = {
    slotId,
    timestamp: Date.now(),
    gameState,
  };

  const existingSlotIndex = gameSave.saveSlots.findIndex(
    slot => slot.slotId === slotId
  );

  if (existingSlotIndex > -1) {
    // Overwrite existing slot
    gameSave.saveSlots[existingSlotIndex] = newSaveSlot;
  } else {
    // Add new slot
    gameSave.saveSlots.push(newSaveSlot);
  }

  await setGameSave(gameSave);
};

/**
 * Loads a game state from a specific slot.
 * @param slotId The ID of the slot to load from.
 * @returns A promise that resolves to the GameState or null if not found.
 */
export const loadGameState = async (
  slotId: number
): Promise<GameState | null> => {
  const gameSave = await getGameSave();
  const saveSlot = gameSave.saveSlots.find(slot => slot.slotId === slotId);
  return saveSlot ? saveSlot.gameState : null;
};

/**
 * Deletes a game state from a specific slot.
 * @param slotId The ID of the slot to delete.
 * @returns A promise that resolves when the deletion is complete.
 */
export const deleteGameState = async (slotId: number): Promise<void> => {
  try {
    const storedData = localStorage.getItem(GAME_SAVES_KEY);
    if (!storedData) {
      return; // No save file, nothing to delete
    }

    const gameSave: GameSave = JSON.parse(storedData);

    // Only proceed if version matches
    if (gameSave.version !== CURRENT_VERSION) {
      return;
    }

    const initialCount = gameSave.saveSlots.length;
    gameSave.saveSlots = gameSave.saveSlots.filter(
      slot => slot.slotId !== slotId
    );

    // Only write back if a change was made
    if (gameSave.saveSlots.length < initialCount) {
      await setGameSave(gameSave);
    }
  } catch (error) {
    // If data is malformed, do nothing as per test expectations.
    // eslint-disable-next-line no-console
    console.error(
      'Failed to process deletion, data might be malformed:',
      error
    );
  }
};
