import { GameState } from '../types';

const GAME_STATE_KEY = 'anime-pokemon-game-state';
const GAME_STATE_VERSION = '1.0.0';

interface StoredGameData {
  version: string;
  timestamp: number;
  gameState: GameState;
}

/**
 * 保存游戏状态到localStorage
 */
export const saveGameState = (gameState: GameState): boolean => {
  try {
    const dataToStore: StoredGameData = {
      version: GAME_STATE_VERSION,
      timestamp: Date.now(),
      gameState: gameState,
    };
    
    localStorage.setItem(GAME_STATE_KEY, JSON.stringify(dataToStore));
    return true;
  } catch (error) {
    console.error('Failed to save game state:', error);
    return false;
  }
};

/**
 * 从localStorage加载游戏状态
 */
export const loadGameState = (): GameState | null => {
  try {
    const storedData = localStorage.getItem(GAME_STATE_KEY);
    if (!storedData) {
      return null;
    }

    const parsed: StoredGameData = JSON.parse(storedData);
    
    // 检查版本兼容性
    if (parsed.version !== GAME_STATE_VERSION) {
      console.warn('Game state version mismatch, ignoring saved data');
      clearSavedGameState();
      return null;
    }

    return parsed.gameState;
  } catch (error) {
    console.error('Failed to load game state:', error);
    clearSavedGameState();
    return null;
  }
};

/**
 * 检查是否有保存的游戏状态
 */
export const hasSavedGameState = (): boolean => {
  try {
    const storedData = localStorage.getItem(GAME_STATE_KEY);
    if (!storedData) {
      return false;
    }

    const parsed: StoredGameData = JSON.parse(storedData);
    return parsed.version === GAME_STATE_VERSION && !!parsed.gameState;
  } catch (error) {
    console.error('Failed to check saved game state:', error);
    return false;
  }
};

/**
 * 清除保存的游戏状态
 */
export const clearSavedGameState = (): void => {
  try {
    localStorage.removeItem(GAME_STATE_KEY);
  } catch (error) {
    console.error('Failed to clear saved game state:', error);
  }
};

/**
 * 获取保存游戏状态的时间戳
 */
export const getSavedGameTimestamp = (): number | null => {
  try {
    const storedData = localStorage.getItem(GAME_STATE_KEY);
    if (!storedData) {
      return null;
    }

    const parsed: StoredGameData = JSON.parse(storedData);
    return parsed.timestamp;
  } catch (error) {
    console.error('Failed to get saved game timestamp:', error);
    return null;
  }
};