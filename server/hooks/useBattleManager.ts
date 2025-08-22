import { useCallback } from 'react';
import {
  GameState,
  GameMode,
  Pokemon,
  InventoryItem,
  ChatHistoryEntry,
  BattleRecord,
  BattleChatMessage,
  AIEventTrigger,
  BattleTrigger,
} from '../types';
import { STORY_DATA } from '../constants';
import { sanitizePokemonData } from '../utils/dataSanitizers';

type UpdateGameStateFunction = (
  updater: (prevState: GameState) => GameState,
  timeAdvanceOptions?: { minutes?: number; hours?: number }
) => void;

type AdvanceStaticStoryFunction = (segmentId: string) => void;
type TriggerAIStoryFunction = (actionTag: string) => void;

export const useBattleManager = (
  gameState: GameState,
  updateGameState: UpdateGameStateFunction,
  advanceStaticStory: AdvanceStaticStoryFunction,
  triggerAIStory: TriggerAIStoryFunction
) => {
  const startBattle = useCallback(
    (
      battleDetails:
        | BattleTrigger
        | Partial<{
            enemyPokemon: Pokemon;
            battleReturnSegmentWin: string;
            battleReturnSegmentLose: string;
          }> = {}
    ) => {
      updateGameState(prev => {
        // Handle BattleTrigger type conversion
        const normalizedDetails =
          'winSegmentId' in battleDetails
            ? {
                enemyPokemon: battleDetails.enemyPokemon,
                battleReturnSegmentWin: battleDetails.winSegmentId,
                battleReturnSegmentLose: battleDetails.loseSegmentId,
              }
            : battleDetails;

        const details = normalizedDetails.enemyPokemon
          ? normalizedDetails
          : prev.pendingBattleDetails;

        if (details && details.enemyPokemon) {
          const playerPokemonForBattle = prev.playerTeam.find(
            p => !p.isFainted && p.isPlayerOwned
          );
          if (playerPokemonForBattle && playerPokemonForBattle.instanceId) {
            return {
              ...prev,
              gameMode: GameMode.BATTLE,
              currentBattleEnemy: details.enemyPokemon,
              currentBattlePlayerPokemonId: playerPokemonForBattle.instanceId,
              battleReturnSegmentWin: details.battleReturnSegmentWin,
              battleReturnSegmentLose: details.battleReturnSegmentLose,
              pendingBattleDetails: undefined,
              currentAIScene: null,
              aiLoadingStatus: { status: 'idle' },
            };
          } else {
            const noPokemonMsg = '(你没有宝可梦可以战斗！)';
            return {
              ...prev,
              chatHistory: [
                ...prev.chatHistory,
                {
                  id: `battle-err-${Date.now()}`,
                  timestamp: Date.now(),
                  speaker: '系统',
                  narrative: noPokemonMsg,
                  type: 'system',
                },
              ],
              pendingBattleDetails: undefined,
              currentAIScene: {
                narrative: noPokemonMsg,
                choices: [
                  {
                    text: '返回冒险',
                    actionTag: 'USER_REQUESTS_CONTINUATION',
                  },
                ],
              },
            };
          }
        } else {
          const noDetailsMsg = '(战斗数据准备出错。)';
          return {
            ...prev,
            chatHistory: [
              ...prev.chatHistory,
              {
                id: `battle-err-${Date.now()}`,
                timestamp: Date.now(),
                speaker: '系统错误',
                narrative: noDetailsMsg,
                type: 'system',
              },
            ],
            pendingBattleDetails: undefined,
            currentAIScene: {
              narrative: noDetailsMsg,
              choices: [
                { text: '返回冒险', actionTag: 'USER_REQUESTS_CONTINUATION' },
              ],
            },
          };
        }
      });
    },
    [updateGameState]
  );

  const handleBattleEnd = useCallback(
    (
      didPlayerWin: boolean,
      finalPlayerTeamFromBattle: Pokemon[],
      finalInventory: InventoryItem[],
      finalEnemyPokemonState: Pokemon,
      usedRun: boolean,
      caughtPokemon?: Pokemon,
      battleLog?: BattleChatMessage[]
    ) => {
      let resultSegmentId: string;
      const tempNewChatHistory: ChatHistoryEntry[] = [];
      let newPlayerTeamForState = [...finalPlayerTeamFromBattle];

      if (caughtPokemon) {
        const uniqueId = `${caughtPokemon.id || 'pkmn'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newlyCaughtPokemon: Pokemon = {
          ...sanitizePokemonData(caughtPokemon),
          instanceId: uniqueId,
          isPlayerOwned: true,
          currentHp: caughtPokemon.currentHp,
          statusConditions: [],
          statStageModifiers: [],
          isFainted: caughtPokemon.currentHp <= 0,
        };
        newPlayerTeamForState.push(newlyCaughtPokemon);
        tempNewChatHistory.push({
          id: `catch-success-msg-${Date.now()}`,
          timestamp: Date.now(),
          speaker: '系统',
          narrative: `成功捕捉了 ${newlyCaughtPokemon.name}！它已加入你的队伍。`,
          type: 'system',
        });
        resultSegmentId = STORY_DATA['PLAYER_CAUGHT_POKEMON_SUCCESS']
          ? 'PLAYER_CAUGHT_POKEMON_SUCCESS'
          : 'BATTLE_WON_DEFAULT';
      } else if (didPlayerWin && !usedRun) {
        const baseXP = finalEnemyPokemonState.level * 25 + 50;
        tempNewChatHistory.push({
          id: `xp-gain-msg-${Date.now()}`,
          timestamp: Date.now(),
          speaker: '系统',
          narrative: `战斗胜利！队伍中的宝可梦获得了 ${baseXP} 点经验值！`,
          type: 'system',
        });

        newPlayerTeamForState = newPlayerTeamForState.map(pokemon => {
          if (!pokemon.isFainted && pokemon.isPlayerOwned) {
            const updatedPokemon = { ...pokemon };
            updatedPokemon.currentXp += baseXP;
            tempNewChatHistory.push({
              id: `xp-${updatedPokemon.instanceId}-${Date.now()}`,
              timestamp: Date.now(),
              speaker: updatedPokemon.name,
              narrative: `获得了 ${baseXP} 点经验值。`,
              type: 'system',
            });

            while (updatedPokemon.currentXp >= updatedPokemon.xpToNextLevel) {
              updatedPokemon.currentXp -= updatedPokemon.xpToNextLevel;
              const oldLevel = updatedPokemon.level;
              updatedPokemon.level += 1;
              const newLevel = updatedPokemon.level;

              tempNewChatHistory.push({
                id: `levelup-${updatedPokemon.instanceId}-${newLevel}-${Date.now()}`,
                timestamp: Date.now(),
                speaker: updatedPokemon.name,
                narrative: `${updatedPokemon.name} 从 ${oldLevel}级 升到了 ${newLevel} 级！`,
                type: 'system',
              });

              const oldStats = {
                maxHp: updatedPokemon.maxHp,
                attack: updatedPokemon.attack,
                defense: updatedPokemon.defense,
                specialAttack: updatedPokemon.specialAttack,
                specialDefense: updatedPokemon.specialDefense,
                speed: updatedPokemon.speed,
              };
              updatedPokemon.maxHp += Math.floor(Math.random() * 4) + 2;
              updatedPokemon.attack += Math.floor(Math.random() * 3) + 1;
              updatedPokemon.defense += Math.floor(Math.random() * 3) + 1;
              updatedPokemon.specialAttack += Math.floor(Math.random() * 3) + 1;
              updatedPokemon.specialDefense +=
                Math.floor(Math.random() * 3) + 1;
              updatedPokemon.speed += Math.floor(Math.random() * 3) + 1;
              updatedPokemon.currentHp = updatedPokemon.maxHp;

              let statIncreaseNarrative = `${updatedPokemon.name} 的能力提升了：`;
              if (updatedPokemon.maxHp > oldStats.maxHp)
                statIncreaseNarrative += ` 最大HP+${updatedPokemon.maxHp - oldStats.maxHp}`;
              if (updatedPokemon.attack > oldStats.attack)
                statIncreaseNarrative += ` 攻击+${updatedPokemon.attack - oldStats.attack}`;
              if (updatedPokemon.defense > oldStats.defense)
                statIncreaseNarrative += ` 防御+${updatedPokemon.defense - oldStats.defense}`;
              if (updatedPokemon.specialAttack > oldStats.specialAttack)
                statIncreaseNarrative += ` 特攻+${updatedPokemon.specialAttack - oldStats.specialAttack}`;
              if (updatedPokemon.specialDefense > oldStats.specialDefense)
                statIncreaseNarrative += ` 特防+${updatedPokemon.specialDefense - oldStats.specialDefense}`;
              if (updatedPokemon.speed > oldStats.speed)
                statIncreaseNarrative += ` 速度+${updatedPokemon.speed - oldStats.speed}`;

              tempNewChatHistory.push({
                id: `stats-up-${updatedPokemon.instanceId}-${newLevel}-${Date.now()}`,
                timestamp: Date.now(),
                speaker: '系统',
                narrative: statIncreaseNarrative,
                type: 'system',
              });

              updatedPokemon.xpToNextLevel =
                Math.floor(Math.pow(newLevel, 2.8)) + newLevel * 25 + 75;
            }
            return updatedPokemon;
          }
          return pokemon;
        });
        resultSegmentId =
          gameState.battleReturnSegmentWin || 'BATTLE_WON_DEFAULT';
      } else if (usedRun) {
        resultSegmentId = 'PLAYER_RAN_AWAY';
      } else {
        resultSegmentId =
          gameState.battleReturnSegmentLose || 'BATTLE_LOST_DEFAULT';
      }

      const battleRecord: BattleRecord = {
        id: `battle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        playerPokemon:
          finalPlayerTeamFromBattle.find(p => !p.isFainted)?.name || '未知',
        enemyPokemon: finalEnemyPokemonState.name,
        location: gameState.currentLocationDescription,
        outcome: caughtPokemon
          ? 'catch'
          : usedRun
            ? 'run'
            : didPlayerWin
              ? 'win'
              : 'loss',
        battleLog: battleLog || [],
        caughtPokemon: caughtPokemon?.name,
        duration:
          battleLog && battleLog.length > 0
            ? battleLog[battleLog.length - 1].timestamp - battleLog[0].timestamp
            : undefined,
      };

      updateGameState(
        prev => ({
          ...prev,
          playerTeam: newPlayerTeamForState.map(p => sanitizePokemonData(p)),
          inventory: finalInventory,
          gameMode: GameMode.ADVENTURE,
          currentBattleEnemy: undefined,
          currentBattlePlayerPokemonId: undefined,
          currentAIScene: null,
          aiLoadingStatus: { status: 'idle' },
          customizationAssistantResponse: null,
          chatHistory: [...prev.chatHistory, ...tempNewChatHistory],
          battleHistory: [...(prev.battleHistory || []), battleRecord],
        }),
        {
          minutes:
            Math.floor(
              Math.random() * (didPlayerWin || caughtPokemon ? 61 : 91)
            ) + (didPlayerWin || caughtPokemon ? 15 : 30),
        }
      );

      if (STORY_DATA[resultSegmentId]) {
        advanceStaticStory(resultSegmentId);
      } else {
        updateGameState(prev => ({
          ...prev,
          chatHistory: [
            ...prev.chatHistory,
            {
              id: `${Date.now()}`,
              timestamp: Date.now(),
              speaker: '系统警告',
              narrative: `战斗后剧情片段 "${resultSegmentId}" 未找到。将使用默认后续。`,
              type: 'system',
            },
          ],
        }));
        let fallbackActionTag = 'PLAYER_ESCAPED_BATTLE_CONTINUE';
        if (caughtPokemon) {
          fallbackActionTag = 'PLAYER_CAUGHT_POKEMON_CONTINUE_ADVENTURE';
        } else if (!usedRun) {
          fallbackActionTag = didPlayerWin
            ? 'PLAYER_WON_BATTLE'
            : 'PLAYER_LOST_BATTLE';
        }
        triggerAIStory(fallbackActionTag);
      }
    },
    [gameState, updateGameState, advanceStaticStory, triggerAIStory]
  );

  const processBattleEvent = useCallback(
    (currentState: GameState, event: AIEventTrigger): GameState => {
      if (event.type === 'START_BATTLE' && event.enemyPokemonDetails) {
        const enemyFromAI = sanitizePokemonData(event.enemyPokemonDetails);
        return {
          ...currentState,
          pendingBattleDetails: {
            enemyPokemon: {
              ...enemyFromAI,
              currentHp: enemyFromAI.maxHp,
              isFainted: false,
              instanceId: `${enemyFromAI.id}-enemy-${Date.now()}`,
            },
            battleReturnSegmentWin: 'BATTLE_WON_DEFAULT',
            battleReturnSegmentLose: 'BATTLE_LOST_DEFAULT',
          },
        };
      }
      return currentState;
    },
    []
  );

  return {
    startBattle,
    handleBattleEnd,
    processBattleEvent,
  };
};
