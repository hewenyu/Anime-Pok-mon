import { PlayerProfile, Pokemon, PokemonType, PokemonMoveInstance, GameState } from '../types';

export const STORY_SEGMENTS: Record<string, any> = {
  INITIAL_PROFILE_PREPARATION: {
    id: 'INITIAL_PROFILE_PREPARATION',
    speaker: '系统',
    text: '正在为你生成初始冒险设定，请稍候...',
    isAIHandoff: true,
    actionTag: 'GENERATE_FULL_RANDOM_PROFILE',
  },
  BATTLE_WON_DEFAULT: {
    id: 'BATTLE_WON_DEFAULT',
    speaker: '系统',
    text: '你赢得了战斗！接下来会发生什么呢？',
    isAIHandoff: true,
    actionTag: 'PLAYER_WON_BATTLE',
  },
  BATTLE_LOST_DEFAULT: {
    id: 'BATTLE_LOST_DEFAULT',
    speaker: '系统',
    text: '你在战斗中失利了... 但冒险还将继续。',
    onLoad: updateGameState => {
      updateGameState(prev => ({
        ...prev,
        playerTeam: prev.playerTeam.map(p => ({
          ...p,
          // currentHp 和 isFainted 状态在战斗结束后应保持原样。
          // 不在此处自动恢复HP或清除昏厥状态。
          statStageModifiers: [], // 清除临时的能力等级变化
          statusConditions: [], // 清除所有异常状态 (或根据需要保留持久状态)
        })),
      }));
    },
    isAIHandoff: true,
    actionTag: 'PLAYER_LOST_BATTLE',
  },
  PLAYER_RAN_AWAY: {
    id: 'PLAYER_RAN_AWAY',
    speaker: '系统',
    text: '你成功从战斗中脱离了。接下来做什么？',
    isAIHandoff: true,
    actionTag: 'PLAYER_ESCAPED_BATTLE_CONTINUE',
  },
  CONTINUE_AFTER_IMAGE_REGEN: {
    id: 'CONTINUE_AFTER_IMAGE_REGEN',
    speaker: '系统',
    text: '图片已尝试更新。',
    isAIHandoff: true,
    actionTag: 'USER_ACKNOWLEDGED_IMAGE_REGEN',
  },
  ACKNOWLEDGE_AI_FORMAT_ERROR: {
    id: 'ACKNOWLEDGE_AI_FORMAT_ERROR',
    speaker: '系统消息',
    text: 'AI响应的格式似乎有些问题，导致内容无法正确显示。这通常是临时情况，请尝试重新操作或简化您的请求。',
    isAIHandoff: true,
    actionTag: 'CONTINUE_AFTER_STATIC_SEGMENT',
  },
  ACKNOWLEDGE_BATTLE_START: {
    id: 'ACKNOWLEDGE_BATTLE_START',
    speaker: '系统',
    text: '战斗一触即发！',
    // This segment is primarily a placeholder for the actionTag.
    // Game logic in useGameLogic.ts for ACKNOWLEDGE_BATTLE_START will handle transition.
  },
  CONFIRM_STATIC_BATTLE_SEGMENT: {
    id: 'CONFIRM_STATIC_BATTLE_SEGMENT',
    speaker: (playerProfile: PlayerProfile) => playerProfile.name || '你',
    text: (_playerProfile: PlayerProfile, _playerTeam: Pokemon[]) =>
      '战斗即将开始！',
    choices: [{ text: '确认迎战', actionTag: 'CONFIRMED_STATIC_BATTLE_FINAL' }],
  },
};

// Represents the "Struggle" move used when a Pokémon has no PP left.
export const STRUGGLE_MOVE: PokemonMoveInstance = {
  name: '挣扎',
  power: 50,
  type: PokemonType.NORMAL,
  category: '物理',
  basePP: 1,
  currentPP: 1,
  description:
    '当所有招式都无法使用时，使用者进行拼命的攻击。也会对自身造成伤害。',
  effects: [
    {
      type: 'RECOIL_FIXED',
      target: 'SELF',
      recoilFixedPercentMaxHp: 0.25,
      effectString: '自身承受最大HP的1/4反作用力伤害',
    },
  ],
  accuracy: null,
  priority: 0,
};

// Default catch rate for simplification if not provided by AI/item data
export const DEFAULT_POKEMON_CATCH_RATE = 45; // Example: Pidgey, Rattata
export const DEFAULT_POKEBALL_BONUS = 1;
