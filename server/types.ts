// Added types for AI Customization Intent Classification
export type CustomizationIntentType =
  | 'CREATE_FULL_PROFILE' // User wants a complete profile generated based on a theme/description.
  | 'SUGGEST_POKEMON' // User wants a Pokémon suggestion.
  | 'SUGGEST_ITEM' // User wants an item suggestion.
  | 'MODIFY_PROFILE_FIELD' // User wants to change a specific profile field (name, age, gender, description).
  | 'MODIFY_OBJECTIVE' // User wants to change the current objective.
  | 'MODIFY_LOCATION' // User wants to change the current location.
  | 'MODIFY_MONEY' // User wants to change the starting money.
  | 'MODIFY_GAME_START_TIME' // User wants to change the game's starting date and time (e.g., via chat).
  | 'SUGGEST_GAME_START_TIME_BASED_ON_PROFILE' // User clicked button to get AI time suggestion based on current form.
  | 'MODIFY_ITEM_QUANTITY' // User wants to change the quantity of an existing item (not yet fully supported by UI for assistant to initiate).
  | 'REQUEST_RANDOM_DESCRIPTION' // User specifically asks for a random description (distinct from general profile field modification).
  | 'GENERAL_CHAT_OR_CLARIFICATION' // User is asking a question, making a general statement, or input is unclear.
  | 'UNKNOWN_INTENT'; // Classifier could not determine intent.

export interface ProfileDataForTimeSuggestion {
  name?: string;
  description?: string;
  objective?: string;
  location?: string;
  pokemonNames?: string[]; // Just names or key characteristics
  itemNames?: string[]; // Just names
}

export interface ClassifiedIntent {
  intent: CustomizationIntentType;
  params?: {
    theme?: string; // For CREATE_FULL_PROFILE
    pokemonType?: PokemonType; // For SUGGEST_POKEMON
    pokemonName?: string; // For SUGGEST_POKEMON (if specified by user)
    itemName?: string; // For SUGGEST_ITEM or MODIFY_ITEM_QUANTITY
    quantity?: number; // For MODIFY_ITEM_QUANTITY or SUGGEST_ITEM
    fieldName?:
      | keyof PlayerProfile
      | 'currentObjective'
      | 'currentLocationDescription'
      | 'money'; // For MODIFY_PROFILE_FIELD and its variants
    fieldValue?: string | number | PlayerGender; // For MODIFY_PROFILE_FIELD
    // For MODIFY_GAME_START_TIME - numerical values expected after AI parsing user's natural language
    year?: number; // e.g., 2025, -100 (for 101 BC)
    month?: number; // 1-12
    day?: number; // 1-31
    hour?: number; // 0-23
    minute?: number; // 0-59
    // For SUGGEST_GAME_START_TIME_BASED_ON_PROFILE (sent from client to AI service)
    currentProfileDataForTimeSuggestion?: ProfileDataForTimeSuggestion;
  };
  originalQuery: string; // The user's full original input text.
  confidence?: number; // Optional: classifier's confidence in the intent.
  feedbackToUser?: string; // Optional: message if intent is unclear or params are missing.
}

export enum PokemonType {
  NORMAL = '一般',
  FIRE = '火',
  WATER = '水',
  GRASS = '草',
  ELECTRIC = '电',
  FIGHTING = '格斗',
  PSYCHIC = '超能',
  DARK = '恶',
  STEEL = '钢',
  DRAGON = '龙',
  FLYING = '飞行',
  GROUND = '地面',
  ROCK = '岩石',
  BUG = '虫',
  GHOST = '幽灵',
  ICE = '冰',
  POISON = '毒',
  FAIRY = '妖精',
}

export enum StatusCondition {
  NONE = '无',
  PARALYZED = '麻痹', // Paralysis
  POISONED = '中毒', // Poison
  BADLY_POISONED = '剧毒', // Toxic
  BURNED = '灼伤', // Burn
  FROZEN = '冰冻', // Freeze
  ASLEEP = '睡眠', // Sleep
  CONFUSED = '混乱', // Confusion
  FLINCHED = '畏缩', // Flinch - usually lasts only one turn, applied before target acts
}

export enum Stat {
  HP = 'HP',
  ATTACK = '攻击',
  DEFENSE = '防御',
  SPECIAL_ATTACK = '特攻',
  SPECIAL_DEFENSE = '特防',
  SPEED = '速度',
  ACCURACY = '命中率',
  EVASION = '闪避率',
}

export interface StatStageModifier {
  stat: Stat;
  stage: number; // Typically -6 to +6
}

export interface ActiveStatusCondition {
  condition: StatusCondition;
  duration?: number; // Turns remaining for sleep, confusion, etc.
  sourceMove?: string; // Which move caused this
  toxicCounter?: number; // For badly_poisoned, starts at 1 and increments.
}

export type MoveEffectType =
  | 'STATUS' // Applies a status condition (PARALYZED, POISONED, etc.)
  | 'STAT_CHANGE' // Changes one or more stats (ATTACK up, DEFENSE down, etc.)
  | 'HEAL' // Heals the target (usually SELF)
  | 'DAMAGE_HEAL' // Deals damage and heals user based on damage dealt (e.g., Absorb)
  | 'RECOIL_PERCENT' // User takes recoil damage based on % of damage dealt
  | 'RECOIL_FIXED' // User takes recoil damage based on % of their max HP
  | 'MULTI_HIT' // Move hits multiple times (e.g., Double Slap)
  | 'FLINCH' // Chance to make the target flinch if user moves first
  | 'FIXED_DAMAGE' // Deals a fixed amount of damage (e.g., Dragon Rage)
  | 'OHKO' // One-Hit KO move (e.g., Fissure)
  | 'FIELD_EFFECT' // Modifies the battle field (e.g., Stealth Rock, Tailwind) - advanced
  | 'PRIORITY_CHANGE' // Affects move priority (e.g., Quick Attack is +1) - can be intrinsic to move
  | 'NO_EFFECT'; // No additional effect other than damage.

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
  chance?: number; // Probability of the effect occurring (0.0 to 1.0)
  statusCondition?: StatusCondition; // Which status to apply if type is 'STATUS'
  statChanges?: Array<{ stat: Stat; stage: number }>; // For 'STAT_CHANGE', e.g., [{ stat: Stat.ATTACK, stage: -1 }]
  healPercent?: number; // For 'HEAL', percentage of target's Max HP, or fixed amount if > 1 and is integer.
  damageHealRatio?: number; // For 'DAMAGE_HEAL', percentage of damage dealt that is healed.
  recoilPercent?: number; // For 'RECOIL_PERCENT', percentage of damage dealt taken as recoil.
  recoilFixedPercentMaxHp?: number; // For 'RECOIL_FIXED', percentage of user's max HP taken as recoil.
  fixedDamage?: number; // For 'FIXED_DAMAGE'.
  multiHitMin?: number; // For 'MULTI_HIT'.
  multiHitMax?: number; // For 'MULTI_HIT'.
  effectString?: string; // Chinese description of the effect, e.g., "使对手麻痹"
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
  effects?: MoveEffect[]; // New field for detailed move effects
  accuracy?: number; // Move accuracy (0-100, or null for always-hit)
  priority?: number; // Move priority (default 0)
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

  statusConditions: ActiveStatusCondition[]; // Tracks active statuses like PARALYZED, POISONED
  statStageModifiers: StatStageModifier[]; // Tracks current stat boosts/drops

  isFainted?: boolean;
  isHit?: boolean;
  isPlayerOwned?: boolean;
  instanceId?: string;
}

export enum BattleGameStatus {
  SELECTING_ACTION = '选择行动中',
  PLAYER_ATTACKING = '玩家攻击中',
  ENEMY_ATTACKING = '敌方攻击中',
  PLAYER_WON = '玩家胜利',
  ENEMY_WON = '敌方胜利',
  PROCESSING = '处理中',
  NOT_ENOUGH_PP = 'PP不足',
}

export enum GameMode {
  CUSTOMIZE_RANDOM_START = 'CUSTOMIZE_RANDOM_START',
  ADVENTURE = 'ADVENTURE',
  BATTLE = 'BATTLE',
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
  description?: string; // General flavor text or lore
  effectText?: string; // Concise mechanical effect, e.g., "回复20点HP"
  imageUrl?: string;
  // Battle-specific properties
  canUseInBattle?: boolean;
  targetType?: 'SELF_TEAM' | 'ENEMY' | 'SELF_ACTIVE'; // Defines who the item can target in battle
  effect?: ItemEffect; // More detailed effect definition for battle logic
}

// Example ItemEffect (can be expanded)
export type ItemEffectType =
  | 'HEAL_HP'
  | 'CURE_STATUS'
  | 'STAT_BOOST_TEMP'
  | 'CATCH_POKEMON';
export interface ItemEffect {
  type: ItemEffectType;
  amount?: number; // e.g., HP restored, or stat stage increase
  statusToCure?: StatusCondition;
  // For CATCH_POKEMON
  ballBonus?: number;
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

  // Fields specific to assistant_suggestion type
  suggestedPokemonForConfirmation?: Pokemon;
  suggestedItemForConfirmation?: InventoryItem;
  suggestedLocationDetails?: { newLocation: string; mapData?: string };

  // Field for main AI response that has choices, or an assistant_suggestion that presents choices
  confirmationChoices?: AIStoryChoice[];
  isClickableSuggestion?: boolean; // e.g. for Pokémon card to open detail modal

  // Fields for AI responses that contain structured data (mainly from assistant)
  events?: AIEventTrigger[];
  suggestedFullProfileData?: FullProfileSuggestionData;
}

export interface NPC {
  id: string;
  name: string;
  description?: string;
  relationshipStatus: string;
  profileImageUrl?: string;
  dialogueHistory: ChatHistoryEntry[];
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
  | 'PRESENT_SUGGESTED_POKEMON_DETAILS' // For customization assistant to show details before adding
  | 'PRESENT_SUGGESTED_ITEM_DETAILS' // For customization assistant
  | 'PRESENT_SUGGESTED_LOCATION_DETAILS'; // For customization assistant

export interface AIEventTrigger {
  type: AIEventTriggerType;
  itemDetails?: InventoryItem; // For GIVE_ITEM, PRESENT_SUGGESTED_ITEM_DETAILS
  quantity?: number; // For GIVE_ITEM, UPDATE_MONEY, PRESENT_SUGGESTED_ITEM_DETAILS
  enemyPokemonDetails?: Partial<Pokemon>; // For START_BATTLE
  newObjective?: string; // For UPDATE_OBJECTIVE
  newLocation?: string; // For UPDATE_LOCATION, PRESENT_SUGGESTED_LOCATION_DETAILS
  pokemonDetails?: Partial<Pokemon>; // For ADD_POKEMON_TO_TEAM, PRESENT_SUGGESTED_POKEMON_DETAILS
  mapData?: string; // For UPDATE_LOCATION, UPDATE_AREA_MAP, PRESENT_SUGGESTED_LOCATION_DETAILS
  message?: string; // General message associated with an event
  npcDetails?: Partial<NPC>; // For INTRODUCE_NPC
  npcId?: string; // For UPDATE_NPC_RELATIONSHIP
  newRelationshipStatus?: string; // For UPDATE_NPC_RELATIONSHIP
  profileDetails?: Partial<PlayerProfile>; // For SET_PLAYER_PROFILE
  suggestedLocationDetails?: { newLocation: string; mapData?: string }; // For PRESENT_SUGGESTED_LOCATION_DETAILS
}

// Contains all fields from PlayerProfile, plus objective, location, and money.
// Used by the AI Customization Assistant when suggesting a full profile.
export interface FullProfileSuggestionData extends PlayerProfile {
  objective?: string;
  location?: string;
  money?: number;
  suggestedGameStartTime?: number; // Unix timestamp in milliseconds for game start
}

export interface AIStoryResponse {
  narrative: string; // Main text from AI. Must be Chinese.
  speaker?: string; // Who is saying the narrative (e.g., "旁白", NPC name, "定制助手AI"). Must be Chinese if user-visible.
  imageUrl?: string; // Optional image URL for the current scene or suggestion.
  choices?: AIStoryChoice[]; // Actionable choices for the player. All 'text' fields must be Chinese.
  events?: AIEventTrigger[]; // Game state changes or suggestions. All user-facing text in event details must be Chinese.
  suggestedPlayerReplies?: AIStoryChoice[]; // For NPC chat, suggestions for player input. All 'text' fields must be Chinese.
  itemActionSuggestions?: AIStoryChoice[]; // For battle item usage suggestions.

  // Specific fields for certain actions:
  regeneratedPokemonImageUrl?: string; // For USER_REQUESTS_POKEMON_IMAGE_REGENERATION.
  pokemonImageErrorInstanceId?: string; // Context, client-provided.

  // For AI Customization Assistant (especially for full profile suggestions):
  suggestedFullProfileData?: FullProfileSuggestionData; // All text fields (name, description, objective, location etc.) must be Chinese.
}

// For user manual time input on CustomizeRandomStartScreen
export interface UserDateTimeInput {
  year: number; // e.g., 2024, or direct JS year value like 0 for 1BC, -99 for 100BC
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
}

export interface CustomizedStartData {
  playerProfile: PlayerProfile;
  startingTeam: Pokemon[];
  inventory: InventoryItem[];
  money: number;
  currentLocationDescription: string;
  currentObjective: string;
  userDateTimeInput?: UserDateTimeInput; // Re-added for manual/AI-assisted time input
}

export interface LoadingStatus {
  status: 'idle' | 'loading' | 'retrying_format_error' | 'error';
  message?: string;
}

export interface GameState {
  playerProfile: PlayerProfile;
  playerTeam: Pokemon[];
  inventory: InventoryItem[];
  money: number;
  gameMode: GameMode;
  currentGameTime: number;

  currentAIScene: AIStoryResponse | null; // For main game story.
  aiLoadingStatus: LoadingStatus;
  currentLocationDescription: string;
  currentObjective: string;
  currentAreaMap: string | null;
  globalAreaMap: Record<string, string>;

  currentBattleEnemy?: Pokemon;
  currentBattlePlayerPokemonId?: string;
  battleReturnSegmentWin?: string;
  battleReturnSegmentLose?: string;

  pendingBattleDetails?: {
    enemyPokemon: Pokemon;
    battleReturnSegmentWin: string;
    battleReturnSegmentLose: string;
  };

  chatHistory: ChatHistoryEntry[]; // Main game/event log.
  knownNPCs: NPC[];
  
  // Battle history tracking
  battleHistory: BattleRecord[]; // Detailed battle records

  initialProfileGenerated: boolean;
  // Store for the AI's suggested start time from profile generation (Unix ms timestamp)
  aiSuggestedGameStartTime?: number;

  // Specific state for the AI Customization Assistant
  customizationAssistantResponse: AIStoryResponse | null; // Responses from the assistant.
  assistantChatJustRefreshed?: boolean; // Flag to indicate if the assistant chat was just refreshed/cleared

  // Context for image regeneration
  pokemonInstanceIdToRegenerate?: string;
  pokemonNameToRegenerate?: string;
}

export type GameStateUpdater = React.Dispatch<React.SetStateAction<GameState>>;

export interface StoryChoice {
  text: string;
  nextSegmentId?: string;
  action?: (
    updateGameState: (updater: (prevState: GameState) => GameState) => void
  ) => void;
  disabled?: (gameState: GameState) => boolean;
  actionTag?: string;
  isBattleTrigger?: boolean;
  isAIHandoff?: boolean;
}

export interface BattleTrigger {
  enemyPokemon: Pokemon;
  winSegmentId: string;
  loseSegmentId: string;
}

export interface StorySegment {
  id: string;
  speaker?: string | ((playerProfile: PlayerProfile) => string);
  text:
    | string
    | ((playerProfile: PlayerProfile, playerTeam: Pokemon[]) => string);
  imageUrl?: string;
  choices?: StoryChoice[];
  nextSegmentId?: string;
  onLoad?: (
    updateGameState: (updater: (prevState: GameState) => GameState) => void
  ) => void;
  triggerBattle?: BattleTrigger;
  isAIHandoff?: boolean;
  actionTag?: string;
}

export type AICustomizationScreenActionTag =
  | 'GENERATE_FULL_RANDOM_PROFILE'
  | 'GENERATE_RANDOM_STARTER_POKEMON'
  | 'GENERATE_RANDOM_ITEM'
  | 'GENERATE_RANDOM_PLAYER_DESCRIPTION';

// Deprecated, will be handled by intent classification.
// Keeping for now to avoid breaking existing calls until refactor is complete.
export type AICustomizationAssistantActionTag = 'ASSIST_PROFILE_CUSTOMIZATION';

export type BattleChatMessageType =
  | 'player_command_echo'
  | 'player_action_log'
  | 'enemy_action_log'
  | 'system_message'
  | 'ai_feedback'
  | 'ai_item_action_suggestion';
export interface BattleRecord {
  id: string;
  timestamp: number;
  playerPokemon: string; // Pokemon name
  enemyPokemon: string; // Pokemon name
  location: string;
  outcome: 'win' | 'loss' | 'run' | 'catch';
  battleLog: BattleChatMessage[]; // Detailed battle transcript
  caughtPokemon?: string; // Name of caught Pokemon if applicable
  duration?: number; // Battle duration in milliseconds
}

export interface BattleChatMessage {
  id: string;
  speaker: string;
  text: string;
  timestamp: number;
  type: BattleChatMessageType;
  itemSuggestions?: AIStoryChoice[]; // For AI_ITEM_ACTION_SUGGESTION type
}

export type ParsedBattleActionType =
  | 'USE_MOVE'
  | 'USE_ITEM'
  | 'USE_ITEM_CONFIRMED' // Internal step after AI suggestion or direct click
  | 'SWITCH_POKEMON'
  | 'RUN'
  | 'UNKNOWN'
  | 'AMBIGUOUS'
  | 'INVALID_TARGET'
  | 'INVALID_MOVE'
  | 'INVALID_ITEM'
  | 'NOT_ENOUGH_PP'
  | 'CANNOT_SWITCH_TO_FAINTED_OR_ACTIVE';

export interface ParsedBattleAction {
  actionType: ParsedBattleActionType;
  moveName?: string; // For USE_MOVE
  itemName?: string; // For USE_ITEM and USE_ITEM_CONFIRMED
  selectedItemName?: string; // From AI parsing, to ensure it's the item the AI thought was used
  targetPokemonInstanceId?: string; // For USE_MOVE, USE_ITEM, USE_ITEM_CONFIRMED, SWITCH_POKEMON. Can be "enemy" for items.
  feedbackMessage?: string; // For error/feedback types
  isCatchAttempt?: boolean; // For USE_ITEM_CONFIRMED if item is a Poke Ball
  catchSuccess?: boolean; // For USE_ITEM_CONFIRMED if item is a Poke Ball and successful
}

export interface BattleCommandParseContext {
  playerProfileName: string | undefined;
  activePlayerPokemon: Pokemon | undefined;
  enemyPokemon: Pokemon | undefined;
  playerTeam: Pokemon[];
  inventory: InventoryItem[];
}
