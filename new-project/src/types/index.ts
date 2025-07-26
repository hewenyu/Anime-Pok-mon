export type GameState = 'MainMenu' | 'InGame' | 'Paused';

export type StoryChoice = {
  id: string;
  text: string;
  disabled?: boolean;
};

export type StoryState = {
  narrative: string;
  speaker: string;
  imageUrl?: string;
  choices: StoryChoice[];
};

export const PokemonType = {
  NORMAL: '一般',
  FIRE: '火',
  WATER: '水',
  GRASS: '草',
  ELECTRIC: '电',
  FIGHTING: '格斗',
  PSYCHIC: '超能',
  DARK: '恶',
  STEEL: '钢',
  DRAGON: '龙',
  FLYING: '飞行',
  GROUND: '地面',
  ROCK: '岩石',
  BUG: '虫',
  GHOST: '幽灵',
  ICE: '冰',
  POISON: '毒',
  FAIRY: '妖精',
} as const;

export type PokemonType = (typeof PokemonType)[keyof typeof PokemonType];

export interface PokemonMoveInstance {
  name: string;
  power: number;
  type: PokemonType;
  category: '物理' | '特殊' | '变化';
  basePP: number;
  currentPP: number;
}

export interface Pokemon {
  id: string;
  name: string;
  types: PokemonType[];
  currentHp: number;
  maxHp: number;
  imageUrl: string;
  moves: PokemonMoveInstance[];
  level: number;
}

export type PlayerGender = '男' | '女';

export interface PlayerProfile {
  name?: string;
  gender?: PlayerGender;
  age?: number;
  description?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  description?: string;
}

export interface FullGameState {
  playerProfile: PlayerProfile;
  playerTeam: Pokemon[];
  inventory: InventoryItem[];
  money: number;
  gameTime: string;
  location: string;
  objective: string;
  storyState: StoryState;
}

/**
 * Represents a single save slot containing the full game state.
 */
export interface SaveSlot {
  slotId: number;
  timestamp: number;
  gameState: FullGameState;
  playerProfile: PlayerProfile; // For summary display
}

/**
 * The top-level object stored in localStorage, containing all save slots.
 */
export interface GameSave {
  version: string;
  saveSlots: SaveSlot[];
}

/**
 * Summary of a save slot, used for display in lists.
 */
export interface SaveSlotSummary {
    slotId: number;
    timestamp: number;
    playerProfile: PlayerProfile;
    isEmpty: boolean;
}