import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  saveGameState,
  loadGameState,
  getSavedGames,
  deleteGameState,
} from './gameStateStorage';
import { GameMode } from '../types';
import type { GameState, GameSave } from '../types';

const GAME_SAVES_KEY = 'game_saves';
const CURRENT_VERSION = '1.0.0'; // Assume this is the version used in the implementation

// Mock GameState
const mockGameState = (id: number): GameState => ({
  playerProfile: { name: `Player ${id}` },
  playerTeam: [],
  inventory: [],
  money: 100 * id,
  gameMode: GameMode.ADVENTURE,
  currentGameTime: Date.now(),
  currentAIScene: null,
  aiLoadingStatus: { status: 'idle' },
  currentLocationDescription: `Location ${id}`,
  currentObjective: `Objective ${id}`,
  currentAreaMap: null,
  globalAreaMap: {},
  chatHistory: [],
  knownNPCs: [],
  battleHistory: [],
  initialProfileGenerated: true,
  customizationAssistantResponse: null,
});

describe('gameStateStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  describe('getSavedGames', () => {
    it('should return an empty array when no saved games exist', async () => {
      const savedGames = await getSavedGames();
      expect(savedGames).toEqual([]);
    });

    it('should return an array of save slots without the full gameState', async () => {
      const gameState1 = mockGameState(1);
      const gameState2 = mockGameState(2);
      const timestamp1 = Date.now();
      const timestamp2 = Date.now() + 1000;

      const gameSave: GameSave = {
        version: CURRENT_VERSION,
        saveSlots: [
          { slotId: 1, timestamp: timestamp1, gameState: gameState1 },
          { slotId: 2, timestamp: timestamp2, gameState: gameState2 },
        ],
      };

      window.localStorage.setItem(GAME_SAVES_KEY, JSON.stringify(gameSave));

      const savedGames = await getSavedGames();

      expect(savedGames).toHaveLength(2);
      expect(savedGames[0]).toEqual({ slotId: 1, timestamp: timestamp1 });
      expect(savedGames[1]).toEqual({ slotId: 2, timestamp: timestamp2 });
      // Ensure gameState is not part of the returned data for this function
      expect(savedGames[0]).not.toHaveProperty('gameState');
    });

    it('should return an empty array if the stored data is malformed', async () => {
      window.localStorage.setItem(GAME_SAVES_KEY, 'not a valid json');
      const savedGames = await getSavedGames();
      expect(savedGames).toEqual([]);
    });

    it('should return an empty array if version mismatches', async () => {
      const gameSave: GameSave = {
        version: 'old-version',
        saveSlots: [
          { slotId: 1, timestamp: Date.now(), gameState: mockGameState(1) },
        ],
      };
      window.localStorage.setItem(GAME_SAVES_KEY, JSON.stringify(gameSave));
      const savedGames = await getSavedGames();
      expect(savedGames).toEqual([]);
    });
  });

  describe('saveGameState', () => {
    it('should create a new save file if one does not exist', async () => {
      const gameState = mockGameState(1);
      const slotId = 1;
      await saveGameState(slotId, gameState);

      const savedData: GameSave = JSON.parse(
        window.localStorage.getItem(GAME_SAVES_KEY)!
      );
      expect(savedData.version).toBe(CURRENT_VERSION);
      expect(savedData.saveSlots).toHaveLength(1);
      expect(savedData.saveSlots[0].slotId).toBe(slotId);
      expect(savedData.saveSlots[0].gameState).toEqual(gameState);
      expect(savedData.saveSlots[0].timestamp).toBeDefined();
    });

    it('should add a new save slot to an existing save file', async () => {
      // Pre-populate with a save
      const existingState = mockGameState(1);
      const existingSlotId = 1;
      await saveGameState(existingSlotId, existingState);

      // Save a new state
      const newState = mockGameState(2);
      const newSlotId = 2;
      await saveGameState(newSlotId, newState);

      const savedData: GameSave = JSON.parse(
        window.localStorage.getItem(GAME_SAVES_KEY)!
      );
      expect(savedData.saveSlots).toHaveLength(2);
      expect(
        savedData.saveSlots.find(s => s.slotId === existingSlotId)?.gameState
      ).toEqual(existingState);
      expect(
        savedData.saveSlots.find(s => s.slotId === newSlotId)?.gameState
      ).toEqual(newState);
    });

    it('should overwrite an existing save slot with the same id', async () => {
      const originalTimestamp = Date.now() - 10000;
      const gameSave: GameSave = {
        version: CURRENT_VERSION,
        saveSlots: [
          {
            slotId: 1,
            timestamp: originalTimestamp,
            gameState: mockGameState(1),
          },
        ],
      };
      window.localStorage.setItem(GAME_SAVES_KEY, JSON.stringify(gameSave));

      const newGameState = mockGameState(99); // new data
      await saveGameState(1, newGameState);

      const savedData: GameSave = JSON.parse(
        window.localStorage.getItem(GAME_SAVES_KEY)!
      );
      expect(savedData.saveSlots).toHaveLength(1);
      expect(savedData.saveSlots[0].gameState).toEqual(newGameState);
      expect(savedData.saveSlots[0].timestamp).toBeGreaterThan(
        originalTimestamp
      );
    });

    it('should handle errors during stringification gracefully', async () => {
      const circularState = {} as GameState;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const obj: any = {};
      obj.a = { b: obj };
      circularState.playerProfile = obj; // create circular reference

      // According to the new rules, spying on console is forbidden.
      // The test will still pass, but may log an error, which is acceptable.
      await expect(saveGameState(1, circularState)).rejects.toThrow();
    });
  });

  describe('loadGameState', () => {
    it('should return null if no save file exists', async () => {
      const result = await loadGameState(1);
      expect(result).toBeNull();
    });

    it('should return null if the specified slotId does not exist', async () => {
      const gameSave: GameSave = {
        version: CURRENT_VERSION,
        saveSlots: [
          { slotId: 1, timestamp: Date.now(), gameState: mockGameState(1) },
        ],
      };
      window.localStorage.setItem(GAME_SAVES_KEY, JSON.stringify(gameSave));

      const result = await loadGameState(2);
      expect(result).toBeNull();
    });

    it('should return the correct game state for a valid slotId', async () => {
      const gameState1 = mockGameState(1);
      const gameState2 = mockGameState(2);
      const gameSave: GameSave = {
        version: CURRENT_VERSION,
        saveSlots: [
          { slotId: 1, timestamp: Date.now(), gameState: gameState1 },
          { slotId: 5, timestamp: Date.now(), gameState: gameState2 },
        ],
      };
      window.localStorage.setItem(GAME_SAVES_KEY, JSON.stringify(gameSave));

      const result = await loadGameState(5);
      expect(result).toEqual(gameState2);
    });

    it('should return null if the data is malformed', async () => {
      window.localStorage.setItem(GAME_SAVES_KEY, 'not a valid json');
      const result = await loadGameState(1);
      expect(result).toBeNull();
    });

    it('should return null if the version mismatches', async () => {
      const gameSave: GameSave = {
        version: 'old-version',
        saveSlots: [
          { slotId: 1, timestamp: Date.now(), gameState: mockGameState(1) },
        ],
      };
      window.localStorage.setItem(GAME_SAVES_KEY, JSON.stringify(gameSave));
      const result = await loadGameState(1);
      expect(result).toBeNull();
    });
  });

  describe('deleteGameState', () => {
    it('should remove the specified save slot', async () => {
      const gameState1 = mockGameState(1);
      const gameState2 = mockGameState(2);
      const gameSave: GameSave = {
        version: CURRENT_VERSION,
        saveSlots: [
          { slotId: 1, timestamp: Date.now(), gameState: gameState1 },
          { slotId: 2, timestamp: Date.now(), gameState: gameState2 },
        ],
      };
      window.localStorage.setItem(GAME_SAVES_KEY, JSON.stringify(gameSave));

      await deleteGameState(1);

      const savedData: GameSave = JSON.parse(
        window.localStorage.getItem(GAME_SAVES_KEY)!
      );
      expect(savedData.saveSlots).toHaveLength(1);
      expect(savedData.saveSlots[0].slotId).toBe(2);
    });

    it('should do nothing if the slotId does not exist', async () => {
      const gameState1 = mockGameState(1);
      const gameSave: GameSave = {
        version: CURRENT_VERSION,
        saveSlots: [
          { slotId: 1, timestamp: Date.now(), gameState: gameState1 },
        ],
      };
      window.localStorage.setItem(GAME_SAVES_KEY, JSON.stringify(gameSave));

      await deleteGameState(99); // Try to delete a non-existent slot

      const savedData: GameSave = JSON.parse(
        window.localStorage.getItem(GAME_SAVES_KEY)!
      );
      expect(savedData.saveSlots).toHaveLength(1);
    });

    it('should do nothing if no save file exists', async () => {
      await deleteGameState(1);
      expect(window.localStorage.getItem(GAME_SAVES_KEY)).toBeNull();
    });

    it('should handle malformed data gracefully', async () => {
      window.localStorage.setItem(GAME_SAVES_KEY, 'invalid json');
      await deleteGameState(1);
      // Expect no error to be thrown, and the invalid data is still there
      expect(window.localStorage.getItem(GAME_SAVES_KEY)).toBe('invalid json');
    });
  });
});
