// Basic types copied from the original project to decouple the refactored client.
// We will expand this file as we migrate more features.

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

export const StatusCondition = {
  NONE: '无',
  PARALYZED: '麻痹',
  POISONED: '中毒',
  BADLY_POISONED: '剧毒',
  BURNED: '灼伤',
  FROZEN: '冰冻',
  ASLEEP: '睡眠',
  CONFUSED: '混乱',
  FLINCHED: '畏缩',
} as const;
export type StatusCondition = (typeof StatusCondition)[keyof typeof StatusCondition];

export const Stat = {
  HP: 'HP',
  ATTACK: '攻击',
  DEFENSE: '防御',
  SPECIAL_ATTACK: '特攻',
  SPECIAL_DEFENSE: '特防',
  SPEED: '速度',
  ACCURACY: '命中率',
  EVASION: '闪避率',
} as const;
export type Stat = (typeof Stat)[keyof typeof Stat];

export interface StatStageModifier {
  stat: Stat;
  stage: number; // Typically -6 to +6
}

export interface ActiveStatusCondition {
  condition: StatusCondition;
  duration?: number;
  sourceMove?: string;
  toxicCounter?: number;
}

export type MoveEffectType =
  | 'STATUS'
  | 'STAT_CHANGE'
  | 'HEAL'
  | 'DAMAGE_HEAL'
  | 'RECOIL_PERCENT'
  | 'RECOIL_FIXED'
  | 'MULTI_HIT'
  | 'FLINCH'
  | 'FIXED_DAMAGE'
  | 'OHKO'
  | 'FIELD_EFFECT'
  | 'PRIORITY_CHANGE'
  | 'NO_EFFECT';

export interface MoveEffect {
  type: MoveEffectType;
  target:
    | 'SELF'
    | 'OPPONENT'
    | 'ALL_OPPONENTS'
    | 'ALL_ALLIES'
    | 'FIELD_PLAYER'
    | 'FIELD_OPPONENT'
    | 'FIELD_BOTH';
  chance?: number;
  statusCondition?: StatusCondition;
  statChanges?: Array<{ stat: Stat; stage: number }>;
  healPercent?: number;
  damageHealRatio?: number;
  recoilPercent?: number;
  recoilFixedPercentMaxHp?: number;
  fixedDamage?: number;
  multiHitMin?: number;
  multiHitMax?: number;
  effectString?: string;
}

export interface IVs {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

export interface PokemonMoveInstance {
  name: string;
  power: number;
  type: PokemonType;
  category: '物理' | '特殊' | '变化';
  basePP: number;
  currentPP: number;
  description?: string;
  effects?: MoveEffect[];
  accuracy?: number | null;
  priority?: number;
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
  currentXp: number;
  xpToNextLevel: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
  ivs: IVs;
  nature: string;
  statusConditions: ActiveStatusCondition[];
  statStageModifiers: StatStageModifier[];
  isFainted?: boolean;
  isHit?: boolean;
  isPlayerOwned?: boolean;
  instanceId?: string;
}

export type PlayerGender = '男' | '女';

export interface PlayerProfile {
  name?: string;
  gender?: PlayerGender;
  age?: number;
  description?: string;
  stamina?: number;
  maxStamina?: number;
  energy?: number;
  maxEnergy?: number;

  healthStatus?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  description?: string;
  effectText?: string;
  imageUrl?: string;
  canUseInBattle?: boolean;
  targetType?: 'SELF_TEAM' | 'ENEMY' | 'SELF_ACTIVE';
  effect?: ItemEffect;
}

export type ItemEffectType =
  | 'HEAL_HP'
  | 'CURE_STATUS'
  | 'STAT_BOOST_TEMP'
  | 'CATCH_POKEMON';

export interface ItemEffect {
  type: ItemEffectType;
  amount?: number;
  statusToCure?: StatusCondition;
  ballBonus?: number;
}
export type AIEventTriggerType =
  | 'GIVE_ITEM'
  | 'START_BATTLE'
  | 'UPDATE_MONEY'
  | 'HEAL_TEAM'
  | 'UPDATE_OBJECTIVE'
  | 'UPDATE_LOCATION'
  | 'ADD_POKEMON_TO_TEAM'
  | 'UPDATE_AREA_MAP'
  | 'INTRODUCE_NPC'
  | 'UPDATE_NPC_RELATIONSHIP'
  | 'SET_PLAYER_PROFILE'
  | 'PRESENT_SUGGESTED_POKEMON_DETAILS'
  | 'PRESENT_SUGGESTED_ITEM_DETAILS'
  | 'PRESENT_SUGGESTED_LOCATION_DETAILS';

export interface AIEventTrigger {
  type: AIEventTriggerType;
  itemDetails?: InventoryItem;
  quantity?: number;
  enemyPokemonDetails?: Partial<Pokemon>;
  newObjective?: string;
  newLocation?: string;
  pokemonDetails?: Partial<Pokemon>;
  mapData?: string;
  message?: string;
  profileDetails?: Partial<PlayerProfile>;
}
export interface AIStoryChoice {
  text: string;
  actionTag: string;
  tooltip?: string;
}

export interface ChatHistoryEntry {
  id: string;
  timestamp: number;
  speaker: string;
  narrative: string;
  type:
    | 'static'
    | 'ai'
    | 'player_input'
    | 'system'
    | 'npc_dialogue'
    | 'assistant_suggestion';
  confirmationChoices?: AIStoryChoice[];
  isClickableSuggestion?: boolean;
  events?: AIEventTrigger[];
}

export interface NPC {
  id: string;
  name: string;
  description?: string;
  relationshipStatus: string;
  profileImageUrl?: string;
  dialogueHistory: ChatHistoryEntry[];
}

export interface AIStoryResponse {
  narrative: string;
  speaker?: string;
  imageUrl?: string;
  choices?: AIStoryChoice[];
  events?: AIEventTrigger[];
  suggestedPlayerReplies?: AIStoryChoice[];
  itemActionSuggestions?: AIStoryChoice[];
}
export const BattleGameStatus = {
  NOT_IN_BATTLE: '不在战斗中',
  SELECTING_ACTION: '选择行动中',
  PLAYER_ATTACKING: '玩家攻击中',
  ENEMY_ATTACKING: '敌方攻击中',
  PLAYER_WON: '玩家胜利',
  ENEMY_WON: '敌方胜利',
  PROCESSING: '处理中',
  NOT_ENOUGH_PP: 'PP不足',
} as const;
export type BattleGameStatus = (typeof BattleGameStatus)[keyof typeof BattleGameStatus];