import type { GameSave, FullGameState, SaveSlot, SaveSlotSummary } from '../types';

const GAME_SAVES_KEY = 'game_saves';
const CURRENT_VERSION = '1.0.1'; // Incremented version for new structure
const MAX_SAVE_SLOTS = 3;

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
      console.warn('Game save version mismatch, ignoring saved data.');
    }
  } catch (error) {
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
    console.error('Failed to save game state:', error);
    throw new Error('Failed to save game state due to a serialization error.');
  }
};

/**
 * Returns a summary list of all save slots.
 * @returns A promise that resolves to an array of SaveSlotSummary objects.
 */
export const getSavedGamesSummary = async (): Promise<SaveSlotSummary[]> => {
  const gameSave = await getGameSave();
  const summaries: SaveSlotSummary[] = [];

  for (let i = 1; i <= MAX_SAVE_SLOTS; i++) {
    const savedSlot = gameSave.saveSlots.find(slot => slot.slotId === i);
    if (savedSlot) {
      summaries.push({
        slotId: savedSlot.slotId,
        timestamp: savedSlot.timestamp,
        playerProfile: savedSlot.playerProfile,
        isEmpty: false,
      });
    } else {
      summaries.push({
        slotId: i,
        timestamp: 0,
        playerProfile: { name: '空插槽' },
        isEmpty: true,
      });
    }
  }
  return summaries;
};

/**
 * Saves a game state to a specific slot.
 * @param slotId The ID of the slot to save to.
 * @param gameState The game state to save.
 * @returns A promise that resolves when the save is complete.
 */
export const saveGameState = async (
  slotId: number,
  gameState: FullGameState
): Promise<void> => {
  if (slotId < 1 || slotId > MAX_SAVE_SLOTS) {
    throw new Error(`Invalid slotId: ${slotId}`);
  }
  const gameSave = await getGameSave();
  const newSaveSlot: SaveSlot = {
    slotId,
    timestamp: Date.now(),
    gameState,
    playerProfile: gameState.playerProfile, // Store summary directly
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
 * @returns A promise that resolves to the FullGameState or null if not found.
 */
export const loadGameState = async (
  slotId: number
): Promise<FullGameState | null> => {
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
  const gameSave = await getGameSave();
  const initialCount = gameSave.saveSlots.length;
  gameSave.saveSlots = gameSave.saveSlots.filter(
    slot => slot.slotId !== slotId
  );

  if (gameSave.saveSlots.length < initialCount) {
    await setGameSave(gameSave);
  }
};