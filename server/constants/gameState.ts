import { GameState, GameMode } from '../types';

// Initial state for the game.
export const INITIAL_GAME_STATE: GameState = {
  playerProfile: {
    name: undefined,
    gender: undefined,
    age: undefined,
    description: undefined,
    stamina: 100,
    maxStamina: 100,
    energy: 100,
    maxEnergy: 100,
    healthStatus: '健康',
  },
  playerTeam: [],
  inventory: [
    // Example items for testing
    {
      id: 'potion-1',
      name: '伤药',
      quantity: 3,
      description: '回复少量HP。',
      effectText: '回复20HP',
      canUseInBattle: true,
      targetType: 'SELF_TEAM',
      effect: { type: 'HEAL_HP', amount: 20 },
    },
    {
      id: 'pokeball-1',
      name: '精灵球',
      quantity: 5,
      description: '用于捕捉宝可梦。',
      effectText: '尝试捕捉宝可梦',
      canUseInBattle: true,
      targetType: 'ENEMY',
      effect: { type: 'CATCH_POKEMON', ballBonus: 1 },
    },
    {
      id: 'superpotion-1',
      name: '好伤药',
      quantity: 1,
      description: '回复中量HP。',
      effectText: '回复50HP',
      canUseInBattle: true,
      targetType: 'SELF_TEAM',
      effect: { type: 'HEAL_HP', amount: 50 },
    },
  ],
  money: 0,
  gameMode: GameMode.MAIN_MENU,
  currentGameTime: new Date().getTime(), // Default to current time, will be set by user input, AI, or fallback
  aiSuggestedGameStartTime: undefined, // Store AI's suggestion for full profile
  currentAIScene: null,
  aiLoadingStatus: { status: 'idle' },
  currentLocationDescription: '未知',
  currentObjective: '正在生成初始身份...',
  currentAreaMap: null,
  globalAreaMap: {},
  pendingBattleDetails: undefined,
  chatHistory: [],
  knownNPCs: [],
  battleHistory: [], // Battle records for persistence
  initialProfileGenerated: false,
  customizationAssistantResponse: null,
  assistantChatJustRefreshed: false,
  pokemonInstanceIdToRegenerate: undefined,
  pokemonNameToRegenerate: undefined,
};