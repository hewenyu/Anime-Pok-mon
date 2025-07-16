import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Pokemon,
  InventoryItem,
  BattleChatMessage,
  BattleChatMessageType,
  ParsedBattleAction,
  BattleCommandParseContext,
  StatusCondition,
  PokemonMoveInstance as Move,
  LoadingStatus,
  AIStoryChoice,
} from '../types';
import PokemonCard from './PokemonCard';
import ActionButton from './ActionButton';
import TypeBadge from './TypeBadge';
import {
  calculateDamage,
  checkCanPokemonMove,
  applyMoveEffects,
  processEndOfTurnStatus,
  applyItemEffects,
} from '../services/battleService';
import { STATUS_CONDITION_INFO } from '../constants';
import {
  parsePlayerBattleCommandStream,
  OnRetryCallback,
  OnStreamCallback,
  fetchBattleItemActionSuggestionsStream,
} from '../services/geminiService';

type BattleScreen =
  | 'MAIN_MENU'
  | 'SELECT_MOVE'
  | 'SELECT_POKEMON'
  | 'SELECT_ITEM'
  | 'ACTION_INFO'
  | 'FORCED_SWITCH'
  | 'BATTLE_OVER_CHOICES';

interface BattleViewProps {
  playerTeam: Pokemon[];
  inventory: InventoryItem[];
  initialEnemyPokemon: Pokemon;
  initialPlayerPokemonInstanceId: string;
  onBattleEnd: (
    didPlayerWin: boolean,
    finalPlayerTeam: Pokemon[],
    finalInventory: InventoryItem[],
    finalEnemyPokemon: Pokemon,
    usedRun: boolean,
    caughtPokemon?: Pokemon // Added from types.ts for explicit catch handling
  ) => void;
  playerProfileName: string | undefined;
  onRegeneratePokemonImage: (instanceId: string) => void;
}

const sanitizeBattlePokemon = (pokemon: Pokemon): Pokemon => ({
  ...pokemon,
  statusConditions: pokemon.statusConditions || [],
  statStageModifiers: pokemon.statStageModifiers || [],
  isHit: false,
  isFainted: pokemon.currentHp <= 0,
});

const BattleView: React.FC<BattleViewProps> = ({
  playerTeam: initialPlayerTeam,
  inventory: initialInventoryFromProps,
  initialEnemyPokemon,
  initialPlayerPokemonInstanceId,
  onBattleEnd,
  playerProfileName,
  onRegeneratePokemonImage,
}) => {
  const [playerTeam, setPlayerTeam] = useState<Pokemon[]>(
    initialPlayerTeam.map(sanitizeBattlePokemon)
  );
  const [currentInventory, setCurrentInventory] = useState<InventoryItem[]>([
    ...initialInventoryFromProps,
  ]);
  const [enemyPokemon, setEnemyPokemon] = useState<Pokemon>(
    sanitizeBattlePokemon(initialEnemyPokemon)
  );
  const [activePlayerPokemon, setActivePlayerPokemon] = useState<
    Pokemon | undefined
  >(
    playerTeam.find(
      p => p.instanceId === initialPlayerPokemonInstanceId && !p.isFainted
    ) || playerTeam.find(p => !p.isFainted)
  );
  const [currentScreen, setCurrentScreen] = useState<BattleScreen>('MAIN_MENU');
  const [battleLog, setBattleLog] = useState<BattleChatMessage[]>([]);
  const [, setSelectedMove] = useState<Move | null>(null);

  const [commandParseLoadingStatus, setCommandParseLoadingStatus] =
    useState<LoadingStatus>({ status: 'idle' });
  const [playerInput, setPlayerInput] = useState('');
  const [isProcessingTurn, setIsProcessingTurn] = useState(false);
  const [battleOutcome, setBattleOutcome] = useState<
    'win' | 'loss' | 'run' | null
  >(null);
  const [pokemonWasCaught, setPokemonWasCaught] = useState<Pokemon | null>(
    null
  ); // Store caught Pokemon data

  const [selectedItemForAISuggestion, setSelectedItemForAISuggestion] =
    useState<InventoryItem | null>(null);
  const [itemActionSuggestions, setItemActionSuggestions] = useState<
    AIStoryChoice[] | null
  >(null);
  const [itemSubActionLoading, setItemSubActionLoading] =
    useState<LoadingStatus>({ status: 'idle' });

  const battleLogRef = useRef<HTMLDivElement>(null);

  const addBattleLogEntry = useCallback(
    (
      text: string,
      speaker: string = '系统',
      type: BattleChatMessageType = 'system_message',
      itemSuggestions?: AIStoryChoice[]
    ) => {
      setBattleLog(prevLog => [
        ...prevLog,
        {
          id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          text,
          speaker,
          timestamp: Date.now(),
          type,
          itemSuggestions,
        },
      ]);
    },
    []
  );

  useEffect(() => {
    if (battleLogRef.current) {
      battleLogRef.current.scrollTop = battleLogRef.current.scrollHeight;
    }
  }, [battleLog]);

  useEffect(() => {
    if (battleOutcome) return; // If outcome is already set, battle is ending.

    if (!activePlayerPokemon || activePlayerPokemon.isFainted) {
      const nextAvailablePokemon = playerTeam.find(
        p => p.instanceId !== activePlayerPokemon?.instanceId && !p.isFainted
      );
      if (nextAvailablePokemon) {
        addBattleLogEntry(
          `${activePlayerPokemon?.name || '宝可梦'}倒下了！请选择下一只宝可梦。`
        );
        setActivePlayerPokemon(nextAvailablePokemon);
        setCurrentScreen('FORCED_SWITCH');
      } else {
        addBattleLogEntry('你所有的宝可梦都失去了战斗能力！');
        setBattleOutcome('loss');
        setCurrentScreen('BATTLE_OVER_CHOICES');
      }
    }
  }, [activePlayerPokemon, playerTeam, addBattleLogEntry, battleOutcome]);

  useEffect(() => {
    if (battleOutcome) return;

    if (enemyPokemon.isFainted && !pokemonWasCaught) {
      // Only a win if not caught
      addBattleLogEntry(`敌方的 ${enemyPokemon.name} 倒下了！你赢得了战斗！`);
      setBattleOutcome('win');
      setCurrentScreen('BATTLE_OVER_CHOICES');
    }
  }, [enemyPokemon, addBattleLogEntry, battleOutcome, pokemonWasCaught]);

  useEffect(() => {
    // Log current PPs when returning to main menu, to help debug PP issues
    if (
      currentScreen === 'MAIN_MENU' &&
      activePlayerPokemon &&
      !isProcessingTurn
    ) {
      console.log(
        `[BattleView PP Check] ${activePlayerPokemon.name}'s moves after turn:`
      );
      activePlayerPokemon.moves.forEach(move => {
        console.log(`  - ${move.name}: ${move.currentPP}/${move.basePP} PP`);
      });
    }
  }, [currentScreen, activePlayerPokemon, isProcessingTurn]);

  const updatePokemonState = useCallback(
    (
      instanceId: string,
      updates: Partial<Pokemon>,
      isEnemy: boolean = false
    ) => {
      if (isEnemy) {
        setEnemyPokemon(prev => ({
          ...prev,
          ...updates,
          isFainted:
            (updates.currentHp !== undefined && updates.currentHp <= 0) ||
            prev.isFainted,
        }));
      } else {
        setPlayerTeam(prevTeam =>
          prevTeam.map(p =>
            p.instanceId === instanceId
              ? {
                  ...p,
                  ...updates,
                  isFainted:
                    (updates.currentHp !== undefined &&
                      updates.currentHp <= 0) ||
                    p.isFainted,
                }
              : p
          )
        );
        if (activePlayerPokemon?.instanceId === instanceId) {
          setActivePlayerPokemon(prevActive =>
            prevActive
              ? {
                  ...prevActive,
                  ...updates,
                  isFainted:
                    (updates.currentHp !== undefined &&
                      updates.currentHp <= 0) ||
                    prevActive.isFainted,
                }
              : undefined
          );
        }
      }
    },
    [activePlayerPokemon]
  );

  const handlePlayerMoveSelection = (move: Move) => {
    if (move.currentPP <= 0) {
      addBattleLogEntry(`${move.name} 的PP不足！`);
      return;
    }
    setSelectedMove(move);
    setCurrentScreen('ACTION_INFO');
    setTimeout(
      () => processTurn({ actionType: 'USE_MOVE', moveName: move.name }),
      100
    );
  };

  const handleSwitchPokemon = (pokemonInstanceId: string) => {
    const targetPokemon = playerTeam.find(
      p => p.instanceId === pokemonInstanceId
    );
    if (
      targetPokemon &&
      !targetPokemon.isFainted &&
      targetPokemon.instanceId !== activePlayerPokemon?.instanceId
    ) {
      addBattleLogEntry(
        `${playerProfileName || '你'}换上了 ${targetPokemon.name}！`
      );
      setActivePlayerPokemon(targetPokemon);
      setCurrentScreen('ACTION_INFO');
      setTimeout(
        () =>
          processTurn({
            actionType: 'SWITCH_POKEMON',
            targetPokemonInstanceId: pokemonInstanceId,
          }),
        100
      );
    } else if (targetPokemon?.isFainted) {
      addBattleLogEntry(`${targetPokemon.name} 已经倒下了，无法战斗！`);
    } else if (targetPokemon?.instanceId === activePlayerPokemon?.instanceId) {
      addBattleLogEntry(`${targetPokemon.name} 已经在场上了！`);
    }
  };

  const handleRunAction = () => {
    addBattleLogEntry('你尝试逃跑...');
    setTimeout(() => {
      addBattleLogEntry('成功逃跑了！');
      setBattleOutcome('run');
      setCurrentScreen('BATTLE_OVER_CHOICES');
    }, 1000);
  };

  const handleItemSelectionForAISuggestions = async (item: InventoryItem) => {
    if (!activePlayerPokemon) return;
    setSelectedItemForAISuggestion(item);
    setItemActionSuggestions(null);
    setItemSubActionLoading({
      status: 'loading',
      message: `正在获取 ${item.name} 的使用建议...`,
    });
    addBattleLogEntry(
      `正在为 ${item.name} 获取使用建议...`,
      '系统',
      'ai_item_action_suggestion'
    );

    const handleStreamCallback: OnStreamCallback = (
      _partialResponse: string
    ) => {
      setItemSubActionLoading({
        status: 'loading',
        message: `AI正在分析 ${item.name} 用法... (流式传输)`,
      });
    };

    const aiResponse = await fetchBattleItemActionSuggestionsStream(
      item.name,
      activePlayerPokemon,
      enemyPokemon,
      playerTeam.filter(
        p => p.instanceId !== activePlayerPokemon.instanceId && !p.isFainted
      ),
      handleStreamCallback
    );

    if (
      aiResponse &&
      aiResponse.itemActionSuggestions &&
      aiResponse.itemActionSuggestions.length > 0
    ) {
      setItemActionSuggestions(aiResponse.itemActionSuggestions);
      addBattleLogEntry(
        aiResponse.narrative || `可以这样使用 ${item.name}:`,
        '系统',
        'ai_item_action_suggestion',
        aiResponse.itemActionSuggestions
      );
    } else {
      addBattleLogEntry(
        aiResponse.narrative || `${item.name} 当前似乎无法有效使用。`,
        '系统',
        'ai_item_action_suggestion'
      );
    }
    setItemSubActionLoading({ status: 'idle' });
  };

  const handleItemActionSuggestion = (
    choice: AIStoryChoice,
    itemUsed: InventoryItem
  ) => {
    const parts = choice.actionTag.split(':');
    if (parts.length === 3 && parts[0] === 'USE_ITEM_ON_TARGET') {
      const itemNameFromTag = parts[1];
      const targetId = parts[2];

      if (itemUsed.name !== itemNameFromTag) {
        console.warn(
          `Item name mismatch in suggestion: expected ${itemUsed.name}, got ${itemNameFromTag}. Using ${itemUsed.name}.`
        );
      }

      addBattleLogEntry(
        `${playerProfileName || '你'}决定 ${choice.text}`,
        playerProfileName || '玩家',
        'player_action_log'
      );
      setCurrentScreen('ACTION_INFO');
      setTimeout(
        () =>
          processTurn({
            actionType: 'USE_ITEM_CONFIRMED',
            itemName: itemUsed.name,
            targetPokemonInstanceId: targetId,
            isCatchAttempt: itemUsed.effect?.type === 'CATCH_POKEMON',
          }),
        100
      );
    } else {
      addBattleLogEntry('AI道具建议的格式无法识别。', '系统', 'ai_feedback');
    }
    setSelectedItemForAISuggestion(null);
    setItemActionSuggestions(null);
  };

  const triggerHitAnimation = (instanceId: string, isEnemy: boolean) => {
    if (isEnemy) {
      setEnemyPokemon(prev => ({ ...prev, isHit: true }));
      setTimeout(
        () => setEnemyPokemon(prev => ({ ...prev, isHit: false })),
        300
      );
    } else {
      setPlayerTeam(prevTeam =>
        prevTeam.map(p =>
          p.instanceId === instanceId ? { ...p, isHit: true } : p
        )
      );
      if (activePlayerPokemon?.instanceId === instanceId) {
        setActivePlayerPokemon(prevActive =>
          prevActive ? { ...prevActive, isHit: true } : undefined
        );
      }
      setTimeout(() => {
        setPlayerTeam(prevTeam =>
          prevTeam.map(p =>
            p.instanceId === instanceId ? { ...p, isHit: false } : p
          )
        );
        if (activePlayerPokemon?.instanceId === instanceId) {
          setActivePlayerPokemon(prevActive =>
            prevActive ? { ...prevActive, isHit: false } : undefined
          );
        }
      }, 300);
    }
  };

  const processTurn = async (playerAction: ParsedBattleAction) => {
    if (!activePlayerPokemon || isProcessingTurn || battleOutcome) return;
    setIsProcessingTurn(true);

    let currentPlayerPokemon = activePlayerPokemon;
    let currentEnemyPokemon = enemyPokemon;
    let enemyTurnSkipped = false;

    if (
      playerAction.actionType === 'SWITCH_POKEMON' &&
      playerAction.targetPokemonInstanceId
    ) {
      // Player switched, enemy gets a turn. ActivePlayerPokemon already updated by handleSwitchPokemon
    } else if (
      playerAction.actionType === 'USE_MOVE' &&
      playerAction.moveName
    ) {
      const playerMove = currentPlayerPokemon.moves.find(
        m => m.name === playerAction.moveName
      );
      if (!playerMove) {
        addBattleLogEntry(
          `错误：${currentPlayerPokemon.name} 似乎不记得招式 ${playerAction.moveName}。`,
          '系统'
        );
        setIsProcessingTurn(false);
        setCurrentScreen('MAIN_MENU');
        return;
      }

      addBattleLogEntry(
        `${currentPlayerPokemon.name} 使用了 ${playerMove.name}!`,
        playerProfileName || '玩家',
        'player_action_log'
      );
      const newPlayerMoves = currentPlayerPokemon.moves.map(
        m =>
          m.name === playerMove.name
            ? { ...m, currentPP: Math.max(0, m.currentPP - 1) }
            : m // Robust PP deduction
      );
      updatePokemonState(currentPlayerPokemon.instanceId, {
        moves: newPlayerMoves,
      });
      currentPlayerPokemon = { ...currentPlayerPokemon, moves: newPlayerMoves };

      const playerPreMoveCheck = checkCanPokemonMove(currentPlayerPokemon);
      if (playerPreMoveCheck.wokeUp)
        addBattleLogEntry(playerPreMoveCheck.reason!, '系统');
      if (playerPreMoveCheck.thawedOut)
        addBattleLogEntry(playerPreMoveCheck.reason!, '系统');
      if (playerPreMoveCheck.snapOutOfConfusion)
        addBattleLogEntry(playerPreMoveCheck.reason!, '系统');

      if (
        playerPreMoveCheck.wokeUp ||
        playerPreMoveCheck.thawedOut ||
        playerPreMoveCheck.snapOutOfConfusion
      ) {
        const statusToUpdate = playerTeam.find(
          p => p.instanceId === currentPlayerPokemon.instanceId
        );
        if (statusToUpdate) {
          let newStatusConditions = [...statusToUpdate.statusConditions];
          if (playerPreMoveCheck.wokeUp)
            newStatusConditions = newStatusConditions.filter(
              sc => sc.condition !== StatusCondition.ASLEEP
            );
          if (playerPreMoveCheck.thawedOut)
            newStatusConditions = newStatusConditions.filter(
              sc => sc.condition !== StatusCondition.FROZEN
            );
          if (playerPreMoveCheck.snapOutOfConfusion)
            newStatusConditions = newStatusConditions.filter(
              sc => sc.condition !== StatusCondition.CONFUSED
            );
          updatePokemonState(currentPlayerPokemon.instanceId, {
            statusConditions: newStatusConditions,
          });
          currentPlayerPokemon = {
            ...currentPlayerPokemon,
            statusConditions: newStatusConditions,
          };
        }
      }

      if (!playerPreMoveCheck.canMove) {
        addBattleLogEntry(playerPreMoveCheck.reason!, '系统');
        if (playerPreMoveCheck.hitSelfDamage) {
          triggerHitAnimation(currentPlayerPokemon.instanceId, false);
          const newHp = Math.max(
            0,
            currentPlayerPokemon.currentHp - playerPreMoveCheck.hitSelfDamage
          );
          updatePokemonState(currentPlayerPokemon.instanceId, {
            currentHp: newHp,
          });
          currentPlayerPokemon = {
            ...currentPlayerPokemon,
            currentHp: newHp,
            isFainted: newHp <= 0,
          };
          if (currentPlayerPokemon.isFainted) {
            addBattleLogEntry(
              `${currentPlayerPokemon.name} 在混乱中击倒了自己!`,
              '系统'
            );
          }
        }
      } else {
        const moveToUse = playerPreMoveCheck.moveToUse || playerMove;
        const damageResult = calculateDamage(
          currentPlayerPokemon,
          currentEnemyPokemon,
          moveToUse
        );
        if (damageResult.damage > 0)
          triggerHitAnimation(currentEnemyPokemon.instanceId, true);

        const newEnemyHp = Math.max(
          0,
          currentEnemyPokemon.currentHp - damageResult.damage
        );
        updatePokemonState(
          currentEnemyPokemon.instanceId,
          { currentHp: newEnemyHp },
          true
        );
        currentEnemyPokemon = {
          ...currentEnemyPokemon,
          currentHp: newEnemyHp,
          isFainted: newEnemyHp <= 0,
        };

        if (damageResult.effectivenessText)
          addBattleLogEntry(damageResult.effectivenessText);
        if (damageResult.damage > 0)
          addBattleLogEntry(
            `${currentEnemyPokemon.name} 受到了 ${damageResult.damage} 点伤害。`
          );
        else if (
          moveToUse.category !== '变化' &&
          damageResult.effectivenessFactor > 0
        )
          addBattleLogEntry(`${currentEnemyPokemon.name} 没有受到伤害!`);

        if (currentEnemyPokemon.isFainted) {
          // fainted check useEffect will handle
        } else {
          const effectsResult = applyMoveEffects(
            currentPlayerPokemon,
            currentEnemyPokemon,
            moveToUse,
            damageResult.damage
          );
          effectsResult.messages.forEach(msg => addBattleLogEntry(msg));
          if (effectsResult.attackerUpdate) {
            updatePokemonState(
              currentPlayerPokemon.instanceId,
              effectsResult.attackerUpdate
            );
            currentPlayerPokemon = {
              ...currentPlayerPokemon,
              ...effectsResult.attackerUpdate,
            };
          }
          if (effectsResult.defenderUpdate) {
            updatePokemonState(
              currentEnemyPokemon.instanceId,
              effectsResult.defenderUpdate,
              true
            );
            currentEnemyPokemon = {
              ...currentEnemyPokemon,
              ...effectsResult.defenderUpdate,
            };
          }
          if (
            effectsResult.recoilDamageTaken &&
            currentPlayerPokemon.currentHp <= 0
          ) {
            addBattleLogEntry(
              `${currentPlayerPokemon.name} 因为反作用力倒下了!`,
              '系统'
            );
            currentPlayerPokemon = { ...currentPlayerPokemon, isFainted: true };
          }
          if (currentEnemyPokemon.isFainted || currentPlayerPokemon.isFainted) {
            // fainted check useEffects will handle
          }
        }
      }
    } else if (
      playerAction.actionType === 'USE_ITEM_CONFIRMED' &&
      playerAction.itemName &&
      playerAction.targetPokemonInstanceId
    ) {
      const itemToUse = currentInventory.find(
        i => i.name === playerAction.itemName
      );
      if (!itemToUse || itemToUse.quantity <= 0) {
        addBattleLogEntry(`你没有 ${playerAction.itemName} 了。`);
        enemyTurnSkipped = true;
      } else {
        let targetPokemon: Pokemon | undefined;
        let isTargetEnemy = false;
        if (playerAction.targetPokemonInstanceId === 'enemy') {
          targetPokemon = currentEnemyPokemon;
          isTargetEnemy = true;
        } else {
          targetPokemon = playerTeam.find(
            p => p.instanceId === playerAction.targetPokemonInstanceId
          );
        }

        if (!targetPokemon) {
          addBattleLogEntry(`找不到目标使用 ${itemToUse.name}。`);
          enemyTurnSkipped = true;
        } else {
          addBattleLogEntry(
            `${playerProfileName || '你'}使用了 ${itemToUse.name} 在 ${targetPokemon.name} 身上!`,
            playerProfileName || '玩家',
            'player_action_log'
          );
          const itemApplicationResult = applyItemEffects(
            itemToUse,
            targetPokemon,
            isTargetEnemy ? undefined : currentPlayerPokemon
          );
          itemApplicationResult.messages.forEach(msg => addBattleLogEntry(msg));

          if (itemApplicationResult.success) {
            if (itemApplicationResult.updatedTarget) {
              updatePokemonState(
                targetPokemon.instanceId!,
                itemApplicationResult.updatedTarget,
                isTargetEnemy
              );
              if (isTargetEnemy)
                currentEnemyPokemon = {
                  ...currentEnemyPokemon,
                  ...itemApplicationResult.updatedTarget,
                };
              else if (
                targetPokemon.instanceId === currentPlayerPokemon.instanceId
              )
                currentPlayerPokemon = {
                  ...currentPlayerPokemon,
                  ...itemApplicationResult.updatedTarget,
                };
            }
            if (itemApplicationResult.updatedUser && !isTargetEnemy) {
              updatePokemonState(
                currentPlayerPokemon.instanceId,
                itemApplicationResult.updatedUser
              );
              currentPlayerPokemon = {
                ...currentPlayerPokemon,
                ...itemApplicationResult.updatedUser,
              };
            }

            const newInventory = currentInventory
              .map(i =>
                i.id === itemToUse.id ? { ...i, quantity: i.quantity - 1 } : i
              )
              .filter(i => i.quantity > 0);
            setCurrentInventory(newInventory);

            if (itemApplicationResult.enemyCaught) {
              addBattleLogEntry(`成功捕捉了 ${targetPokemon.name}!`);
              setPokemonWasCaught(targetPokemon); // Store the caught Pokemon data
              setBattleOutcome('win'); // Treat catch as a win for outcome purposes
              setCurrentScreen('BATTLE_OVER_CHOICES');
              setIsProcessingTurn(false);
              return;
            }

            if (
              currentEnemyPokemon.isFainted ||
              currentPlayerPokemon.isFainted
            ) {
              // fainted check useEffect will handle
            }
          }
        }
      }
    } else if (playerAction.actionType === 'RUN') {
      setIsProcessingTurn(false);
      return;
    }

    if (
      currentEnemyPokemon.isFainted ||
      currentPlayerPokemon.isFainted ||
      battleOutcome
    ) {
      setIsProcessingTurn(false);
      return;
    }
    if (enemyTurnSkipped) {
      setCurrentScreen('MAIN_MENU');
      setSelectedMove(null);
      setIsProcessingTurn(false);
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    const playerAfterOwnAction = playerTeam.find(
      p => p.instanceId === currentPlayerPokemon.instanceId
    );
    if (
      !playerAfterOwnAction ||
      playerAfterOwnAction.isFainted ||
      battleOutcome
    ) {
      setIsProcessingTurn(false);
      return;
    }

    addBattleLogEntry(' ', '分隔符');
    const enemyMoves = currentEnemyPokemon.moves.filter(m => m.currentPP > 0);
    if (enemyMoves.length > 0 && !currentEnemyPokemon.isFainted) {
      const enemyPreMoveCheck = checkCanPokemonMove(currentEnemyPokemon);
      if (enemyPreMoveCheck.wokeUp)
        addBattleLogEntry(enemyPreMoveCheck.reason!, '系统');
      if (enemyPreMoveCheck.thawedOut)
        addBattleLogEntry(enemyPreMoveCheck.reason!, '系统');
      if (enemyPreMoveCheck.snapOutOfConfusion)
        addBattleLogEntry(enemyPreMoveCheck.reason!, '系统');

      if (
        enemyPreMoveCheck.wokeUp ||
        enemyPreMoveCheck.thawedOut ||
        enemyPreMoveCheck.snapOutOfConfusion
      ) {
        let newStatusConditions = [...currentEnemyPokemon.statusConditions];
        if (enemyPreMoveCheck.wokeUp)
          newStatusConditions = newStatusConditions.filter(
            sc => sc.condition !== StatusCondition.ASLEEP
          );
        if (enemyPreMoveCheck.thawedOut)
          newStatusConditions = newStatusConditions.filter(
            sc => sc.condition !== StatusCondition.FROZEN
          );
        if (enemyPreMoveCheck.snapOutOfConfusion)
          newStatusConditions = newStatusConditions.filter(
            sc => sc.condition !== StatusCondition.CONFUSED
          );
        updatePokemonState(
          currentEnemyPokemon.instanceId,
          { statusConditions: newStatusConditions },
          true
        );
        currentEnemyPokemon = {
          ...currentEnemyPokemon,
          statusConditions: newStatusConditions,
        };
      }

      if (!enemyPreMoveCheck.canMove) {
        addBattleLogEntry(
          enemyPreMoveCheck.reason!,
          '系统',
          'enemy_action_log'
        );
        if (enemyPreMoveCheck.hitSelfDamage) {
          triggerHitAnimation(currentEnemyPokemon.instanceId, true);
          const newHp = Math.max(
            0,
            currentEnemyPokemon.currentHp - enemyPreMoveCheck.hitSelfDamage
          );
          updatePokemonState(
            currentEnemyPokemon.instanceId,
            { currentHp: newHp },
            true
          );
          currentEnemyPokemon = {
            ...currentEnemyPokemon,
            currentHp: newHp,
            isFainted: newHp <= 0,
          };
          if (currentEnemyPokemon.isFainted) {
            addBattleLogEntry(
              `敌方 ${currentEnemyPokemon.name} 在混乱中击倒了自己!`,
              '系统'
            );
          }
        }
      } else {
        const enemyMoveToUse =
          enemyPreMoveCheck.moveToUse ||
          enemyMoves[Math.floor(Math.random() * enemyMoves.length)];
        const newEnemyMoves = currentEnemyPokemon.moves.map(
          m =>
            m.name === enemyMoveToUse.name
              ? { ...m, currentPP: Math.max(0, m.currentPP - 1) }
              : m // Robust PP deduction
        );
        updatePokemonState(
          currentEnemyPokemon.instanceId,
          { moves: newEnemyMoves },
          true
        );
        currentEnemyPokemon = { ...currentEnemyPokemon, moves: newEnemyMoves };

        addBattleLogEntry(
          `敌方 ${currentEnemyPokemon.name} 使用了 ${enemyMoveToUse.name}!`,
          '敌方',
          'enemy_action_log'
        );

        let activePlayerForEnemyAttack = playerTeam.find(
          p => p.instanceId === currentPlayerPokemon.instanceId
        );
        if (
          playerAction.actionType === 'SWITCH_POKEMON' &&
          playerAction.targetPokemonInstanceId
        ) {
          activePlayerForEnemyAttack = playerTeam.find(
            p => p.instanceId === playerAction.targetPokemonInstanceId
          );
          if (activePlayerForEnemyAttack)
            currentPlayerPokemon = activePlayerForEnemyAttack;
        }

        if (
          activePlayerForEnemyAttack &&
          !activePlayerForEnemyAttack.isFainted
        ) {
          const damageResult = calculateDamage(
            currentEnemyPokemon,
            activePlayerForEnemyAttack,
            enemyMoveToUse
          );
          if (damageResult.damage > 0)
            triggerHitAnimation(activePlayerForEnemyAttack.instanceId, false);

          const newPlayerHp = Math.max(
            0,
            activePlayerForEnemyAttack.currentHp - damageResult.damage
          );
          updatePokemonState(activePlayerForEnemyAttack.instanceId, {
            currentHp: newPlayerHp,
          });
          currentPlayerPokemon = {
            ...currentPlayerPokemon,
            currentHp: newPlayerHp,
            isFainted: newPlayerHp <= 0,
          };

          if (damageResult.effectivenessText)
            addBattleLogEntry(damageResult.effectivenessText);
          if (damageResult.damage > 0)
            addBattleLogEntry(
              `${activePlayerForEnemyAttack.name} 受到了 ${damageResult.damage} 点伤害。`
            );
          else if (
            enemyMoveToUse.category !== '变化' &&
            damageResult.effectivenessFactor > 0
          )
            addBattleLogEntry(
              `${activePlayerForEnemyAttack.name} 没有受到伤害!`
            );

          if (currentPlayerPokemon.isFainted) {
            // fainted check useEffect will handle
          } else {
            const effectsResult = applyMoveEffects(
              currentEnemyPokemon,
              activePlayerForEnemyAttack,
              enemyMoveToUse,
              damageResult.damage
            );
            effectsResult.messages.forEach(msg => addBattleLogEntry(msg));
            if (effectsResult.attackerUpdate) {
              updatePokemonState(
                currentEnemyPokemon.instanceId,
                effectsResult.attackerUpdate,
                true
              );
              currentEnemyPokemon = {
                ...currentEnemyPokemon,
                ...effectsResult.attackerUpdate,
              };
            }
            if (effectsResult.defenderUpdate) {
              updatePokemonState(
                activePlayerForEnemyAttack.instanceId,
                effectsResult.defenderUpdate
              );
              currentPlayerPokemon = {
                ...currentPlayerPokemon,
                ...effectsResult.defenderUpdate,
              };
            }
            if (
              effectsResult.recoilDamageTaken &&
              currentEnemyPokemon.currentHp <= 0
            ) {
              addBattleLogEntry(
                `敌方 ${currentEnemyPokemon.name} 因为反作用力倒下了!`,
                '系统'
              );
              currentEnemyPokemon = { ...currentEnemyPokemon, isFainted: true };
            }
          }
        }
      }
    } else if (!currentEnemyPokemon.isFainted) {
      addBattleLogEntry(
        `敌方 ${currentEnemyPokemon.name} 无法行动！`,
        '系统',
        'enemy_action_log'
      );
    }

    if (
      currentEnemyPokemon.isFainted ||
      currentPlayerPokemon.isFainted ||
      battleOutcome
    ) {
      setIsProcessingTurn(false);
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    addBattleLogEntry(' ', '分隔符');
    const playerForEOT = playerTeam.find(
      p => p.instanceId === currentPlayerPokemon.instanceId
    );
    if (playerForEOT && !playerForEOT.isFainted) {
      const playerEndOfTurnResult = processEndOfTurnStatus(playerForEOT);
      playerEndOfTurnResult.messages.forEach(msg => addBattleLogEntry(msg));
      if (playerEndOfTurnResult.pokemonUpdate) {
        updatePokemonState(
          playerForEOT.instanceId,
          playerEndOfTurnResult.pokemonUpdate
        );
        currentPlayerPokemon = {
          ...currentPlayerPokemon,
          ...playerEndOfTurnResult.pokemonUpdate,
        };
      }
    }
    if (currentPlayerPokemon.isFainted || battleOutcome) {
      setIsProcessingTurn(false);
      return;
    }

    const enemyForEOT = enemyPokemon;
    if (enemyForEOT && !enemyForEOT.isFainted) {
      const enemyEndOfTurnResult = processEndOfTurnStatus(enemyForEOT);
      enemyEndOfTurnResult.messages.forEach(msg => addBattleLogEntry(msg));
      if (enemyEndOfTurnResult.pokemonUpdate) {
        updatePokemonState(
          enemyForEOT.instanceId,
          enemyEndOfTurnResult.pokemonUpdate,
          true
        );
        currentEnemyPokemon = {
          ...currentEnemyPokemon,
          ...enemyEndOfTurnResult.pokemonUpdate,
        };
      }
    }
    if (currentEnemyPokemon.isFainted || battleOutcome) {
      setIsProcessingTurn(false);
      return;
    }

    setCurrentScreen('MAIN_MENU');
    setSelectedMove(null);
    setSelectedItemForAISuggestion(null);
    setItemActionSuggestions(null);
    setIsProcessingTurn(false);
  };

  const handlePlayerInputCommand = async () => {
    if (
      !playerInput.trim() ||
      !activePlayerPokemon ||
      commandParseLoadingStatus.status !== 'idle' ||
      battleOutcome
    )
      return;

    setCommandParseLoadingStatus({
      status: 'loading',
      message: '正在解析指令...',
    });
    addBattleLogEntry(
      `${playerProfileName || '玩家'} 指令: "${playerInput}"`,
      playerProfileName || '玩家',
      'player_command_echo'
    );

    const context: BattleCommandParseContext = {
      playerProfileName: playerProfileName,
      activePlayerPokemon: activePlayerPokemon,
      enemyPokemon: enemyPokemon,
      playerTeam: playerTeam,
      inventory: currentInventory,
    };

    const handleRetryCallback: OnRetryCallback = (attempt, maxAttempts) => {
      setCommandParseLoadingStatus({
        status: 'retrying_format_error',
        message: `解析指令格式错误，重试中 (${attempt}/${maxAttempts})...`,
      });
      addBattleLogEntry(
        `AI解析指令格式错误，正在重试 (尝试 ${attempt}/${maxAttempts})...`,
        '系统',
        'ai_feedback'
      );
    };

    const handleStreamCallback: OnStreamCallback = (
      _partialResponse: string
    ) => {
      setCommandParseLoadingStatus({
        status: 'loading',
        message: 'AI正在解析指令中... (流式传输)',
      });
    };

    const parsedAction = await parsePlayerBattleCommandStream(
      playerInput,
      context,
      handleStreamCallback,
      handleRetryCallback
    );
    setPlayerInput('');

    if (
      parsedAction.actionType === 'UNKNOWN' ||
      parsedAction.feedbackMessage?.includes('AI对战斗指令的响应格式似乎有问题')
    ) {
      setCommandParseLoadingStatus({
        status: 'error',
        message: parsedAction.feedbackMessage || 'AI解析指令失败。',
      });
    } else {
      setCommandParseLoadingStatus({ status: 'idle' });
    }

    switch (parsedAction.actionType) {
      case 'USE_MOVE': {
        const moveInstance = activePlayerPokemon.moves.find(
          m => m.name === parsedAction.moveName
        );
        if (moveInstance) {
          if (moveInstance.currentPP > 0) {
            handlePlayerMoveSelection(moveInstance);
          } else {
            addBattleLogEntry(
              `${activePlayerPokemon.name} 的 ${moveInstance.name} PP不足!`
            );
          }
        } else {
          addBattleLogEntry(
            `${activePlayerPokemon.name} 并没有学会 ${parsedAction.moveName}。`
          );
        }
        break;
      }
      case 'SWITCH_POKEMON':
        if (parsedAction.targetPokemonInstanceId) {
          handleSwitchPokemon(parsedAction.targetPokemonInstanceId);
        } else {
          addBattleLogEntry('AI未能正确解析切换目标。');
        }
        break;
      case 'RUN':
        handleRunAction();
        break;
      case 'USE_ITEM': {
        const itemFromInventory = currentInventory.find(
          i =>
            i.name === (parsedAction.selectedItemName || parsedAction.itemName)
        );
        if (itemFromInventory && parsedAction.targetPokemonInstanceId) {
          if (itemFromInventory.quantity > 0) {
            setCurrentScreen('ACTION_INFO');
            setTimeout(
              () =>
                processTurn({
                  actionType: 'USE_ITEM_CONFIRMED',
                  itemName: itemFromInventory.name,
                  targetPokemonInstanceId: parsedAction.targetPokemonInstanceId,
                  isCatchAttempt:
                    itemFromInventory.effect?.type === 'CATCH_POKEMON',
                }),
              100
            );
          } else {
            addBattleLogEntry(`你没有 ${itemFromInventory.name} 了。`);
          }
        } else if (!itemFromInventory) {
          addBattleLogEntry(
            parsedAction.feedbackMessage ||
              `你没有 ${parsedAction.itemName || parsedAction.selectedItemName}。`
          );
        } else {
          addBattleLogEntry(
            parsedAction.feedbackMessage || '请指定使用道具的目标。'
          );
        }
        break;
      }
      case 'UNKNOWN':
      case 'AMBIGUOUS':
      case 'INVALID_TARGET':
      case 'INVALID_MOVE':
      case 'INVALID_ITEM':
      case 'NOT_ENOUGH_PP':
      case 'CANNOT_SWITCH_TO_FAINTED_OR_ACTIVE':
        addBattleLogEntry(
          parsedAction.feedbackMessage || '无法理解的指令或无效操作。',
          '系统',
          'ai_feedback'
        );
        break;
      default:
        addBattleLogEntry('AI返回了未知的指令类型。', '系统', 'ai_feedback');
    }
  };

  if (!activePlayerPokemon && currentScreen !== 'BATTLE_OVER_CHOICES') {
    return (
      <div className="w-full h-full flex items-center justify-center battle-view-background text-xl p-4">
        没有可战斗的宝可梦！正在结束战斗...
      </div>
    );
  }
  if (!activePlayerPokemon && currentScreen === 'BATTLE_OVER_CHOICES') {
    return (
      <div className="w-full h-full flex items-center justify-center battle-view-background text-xl p-4">
        战斗已结束。
      </div>
    );
  }

  const renderScreenContent = () => {
    if (currentScreen === 'BATTLE_OVER_CHOICES') {
      let message = '战斗结束！';
      if (battleOutcome === 'win')
        message = pokemonWasCaught
          ? `${pokemonWasCaught.name} 被成功捕捉了！`
          : '你胜利了！';
      else if (battleOutcome === 'loss') message = '你失败了...';
      else if (battleOutcome === 'run') message = '你成功逃跑了！';

      return (
        <div className="p-4 text-center">
          <p className="text-xl font-bold my-4 text-purple-700">{message}</p>
          <ActionButton
            onClick={() => {
              if (battleOutcome) {
                // Pass the caught Pokémon if one exists
                onBattleEnd(
                  battleOutcome === 'win',
                  playerTeam,
                  currentInventory,
                  enemyPokemon,
                  battleOutcome === 'run',
                  pokemonWasCaught || undefined
                );
              }
            }}
            variant="primary"
          >
            继续冒险
          </ActionButton>
        </div>
      );
    }
    if (!activePlayerPokemon) {
      return (
        <p className="text-center text-xl font-bold my-8 text-purple-700">
          错误：没有激活的宝可梦。
        </p>
      );
    }

    const mainActions = [
      {
        label: '招式',
        screen: 'SELECT_MOVE',
        variant: 'primary' as 'primary' | 'secondary' | 'move',
      },
      {
        label: '道具',
        screen: 'SELECT_ITEM',
        variant: 'secondary' as 'primary' | 'secondary' | 'move',
      },
      {
        label: '队伍',
        screen: 'SELECT_POKEMON',
        variant: 'secondary' as 'primary' | 'secondary' | 'move',
      },
      {
        label: '逃跑',
        action: handleRunAction,
        variant: 'secondary' as 'primary' | 'secondary' | 'move',
      },
    ];

    switch (currentScreen) {
      case 'MAIN_MENU':
        return (
          <div className="grid grid-cols-2 gap-3 p-2">
            {mainActions.map((actionConfig, index) => (
              <ActionButton
                key={actionConfig.label}
                onClick={() =>
                  actionConfig.screen
                    ? setCurrentScreen(actionConfig.screen as BattleScreen)
                    : actionConfig.action!()
                }
                variant={actionConfig.variant}
                disabled={
                  isProcessingTurn ||
                  commandParseLoadingStatus.status !== 'idle' ||
                  itemSubActionLoading.status !== 'idle'
                }
                className={
                  mainActions.length % 2 !== 0 &&
                  index === mainActions.length - 1
                    ? 'col-span-2'
                    : ''
                }
              >
                {actionConfig.label}
              </ActionButton>
            ))}
          </div>
        );
      case 'SELECT_MOVE':
        return (
          <div className="grid grid-cols-2 gap-3 p-2">
            {activePlayerPokemon.moves.map(move => (
              <ActionButton
                key={move.name}
                onClick={() => handlePlayerMoveSelection(move)}
                disabled={
                  move.currentPP <= 0 ||
                  isProcessingTurn ||
                  commandParseLoadingStatus.status !== 'idle' ||
                  itemSubActionLoading.status !== 'idle'
                }
                moveType={move.type}
                className="flex flex-col items-start text-left text-sm h-auto py-2 px-3"
              >
                <div className="w-full flex justify-between items-baseline">
                  <span className="font-semibold text-base">{move.name}</span>
                  <TypeBadge type={move.type} />
                </div>
                <div className="text-xs opacity-80 w-full flex justify-between mt-1">
                  <span>
                    威力: {move.power || '--'} | {move.category}
                  </span>
                  <span>
                    PP: {move.currentPP}/{move.basePP}
                  </span>
                </div>
              </ActionButton>
            ))}
            <ActionButton
              onClick={() => setCurrentScreen('MAIN_MENU')}
              variant="secondary"
              className="col-span-2"
              disabled={
                isProcessingTurn ||
                commandParseLoadingStatus.status !== 'idle' ||
                itemSubActionLoading.status !== 'idle'
              }
            >
              返回
            </ActionButton>
          </div>
        );
      case 'SELECT_POKEMON':
        return (
          <div className="p-2 space-y-2">
            {playerTeam.map(p => (
              <button
                key={p.instanceId}
                onClick={() => handleSwitchPokemon(p.instanceId!)}
                disabled={
                  p.isFainted ||
                  p.instanceId === activePlayerPokemon.instanceId ||
                  isProcessingTurn ||
                  commandParseLoadingStatus.status !== 'idle' ||
                  itemSubActionLoading.status !== 'idle'
                }
                className={`w-full p-2 rounded-md text-left transition-colors duration-150 flex items-center gap-3 battle-action-button-pokemon-select
                            ${p.isFainted ? 'opacity-60 cursor-not-allowed' : ''}
                            ${p.instanceId === activePlayerPokemon.instanceId ? 'active' : ''}
                            disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="w-10 h-10 object-contain bg-purple-100/50 rounded-sm p-0.5"
                  style={{ imageRendering: 'pixelated' }}
                />
                <div className="flex-grow">
                  <span className="font-semibold">{p.name}</span> Lv.{p.level}
                  <div className="text-xs">
                    HP: {p.currentHp}/{p.maxHp} {p.isFainted ? '(已倒下)' : ''}
                  </div>
                  {p.statusConditions.length > 0 && (
                    <div className="text-xs flex gap-1 mt-0.5">
                      {p.statusConditions.map(sc => {
                        const condInfo = STATUS_CONDITION_INFO[sc.condition];
                        return (
                          <span
                            key={sc.condition}
                            className={`px-1 text-[0.6rem] rounded ${condInfo.colorClass?.replace('dark:', '')}`}
                          >
                            {condInfo.shortName}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </button>
            ))}
            <ActionButton
              onClick={() => setCurrentScreen('MAIN_MENU')}
              variant="secondary"
              disabled={
                isProcessingTurn ||
                commandParseLoadingStatus.status !== 'idle' ||
                itemSubActionLoading.status !== 'idle'
              }
            >
              返回
            </ActionButton>
          </div>
        );
      case 'SELECT_ITEM':
        return (
          <div className="p-2 space-y-2">
            {currentInventory
              .filter(i => i.canUseInBattle)
              .map(item => (
                <div key={item.id}>
                  <button
                    onClick={() => handleItemSelectionForAISuggestions(item)}
                    disabled={
                      isProcessingTurn ||
                      commandParseLoadingStatus.status !== 'idle' ||
                      itemSubActionLoading.status !== 'idle'
                    }
                    className={`w-full p-2 rounded-md text-left transition-colors duration-150 flex items-center justify-between gap-3 battle-action-button-item-select ${selectedItemForAISuggestion?.id === item.id ? 'active' : ''} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center gap-2">
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-6 h-6 object-contain bg-gray-100/50 rounded-sm p-0.5"
                        />
                      )}
                      <span>{item.name}</span>
                    </div>
                    <span className="text-xs">x{item.quantity}</span>
                  </button>
                  {selectedItemForAISuggestion?.id === item.id &&
                    itemActionSuggestions && (
                      <div className="item-suggestion-container ml-4 space-y-1">
                        {itemActionSuggestions.map(suggestion => (
                          <ActionButton
                            key={suggestion.actionTag}
                            onClick={() =>
                              handleItemActionSuggestion(
                                suggestion,
                                selectedItemForAISuggestion
                              )
                            }
                            variant="secondary"
                            className="text-xs py-1 px-2 w-full"
                            disabled={
                              itemSubActionLoading.status !== 'idle' ||
                              isProcessingTurn
                            }
                          >
                            {suggestion.text}
                          </ActionButton>
                        ))}
                      </div>
                    )}
                  {selectedItemForAISuggestion?.id === item.id &&
                    itemSubActionLoading.status === 'loading' && (
                      <p className="ml-4 text-xs text-purple-500 italic animate-pulse">
                        {itemSubActionLoading.message}
                      </p>
                    )}
                </div>
              ))}
            {currentInventory.filter(i => i.canUseInBattle).length === 0 && (
              <p className="text-center text-sm text-gray-500">
                没有可以在战斗中使用的道具。
              </p>
            )}
            <ActionButton
              onClick={() => {
                setCurrentScreen('MAIN_MENU');
                setSelectedItemForAISuggestion(null);
                setItemActionSuggestions(null);
              }}
              variant="secondary"
              disabled={
                isProcessingTurn ||
                commandParseLoadingStatus.status !== 'idle' ||
                itemSubActionLoading.status !== 'idle'
              }
            >
              返回
            </ActionButton>
          </div>
        );
      case 'FORCED_SWITCH':
        return (
          <div className="p-3 text-center">
            <p className="mb-3 text-lg text-purple-700">
              {activePlayerPokemon?.name || '宝可梦'}倒下了！选择下一只宝可梦：
            </p>
            <div className="space-y-2">
              {playerTeam
                .filter(p => !p.isFainted)
                .map(p => (
                  <button
                    key={p.instanceId}
                    onClick={() => {
                      addBattleLogEntry(
                        `${playerProfileName || '你'}换上了 ${p.name}！`
                      );
                      setActivePlayerPokemon(p);
                      setCurrentScreen('MAIN_MENU');
                      setIsProcessingTurn(false);
                    }}
                    className={`w-full p-2 rounded-md text-left transition-colors duration-150 flex items-center gap-3 battle-action-button-pokemon-select`}
                  >
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-10 h-10 object-contain bg-purple-100/50 rounded-sm p-0.5"
                      style={{ imageRendering: 'pixelated' }}
                    />
                    <div className="flex-grow">
                      <span className="font-semibold">{p.name}</span> Lv.
                      {p.level}
                      <div className="text-xs">
                        HP: {p.currentHp}/{p.maxHp}
                      </div>
                    </div>
                  </button>
                ))}
              {playerTeam.filter(p => !p.isFainted).length === 0 && (
                <p className="text-red-500">没有其他可战斗的宝可梦了！</p>
              )}
            </div>
          </div>
        );
      case 'ACTION_INFO':
        return (
          <p className="text-center p-4 text-purple-500 italic animate-pulse">
            处理中...
          </p>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen battle-view-background font-sans">
      <div className="flex-grow flex flex-col justify-end items-center p-2 md:p-4 relative">
        {enemyPokemon && (
          <PokemonCard
            pokemon={enemyPokemon}
            isPlayerCard={false}
            isBattleCard={true}
            onRegenerateImage={onRegeneratePokemonImage}
          />
        )}
      </div>

      <div className="flex-grow flex flex-col justify-start items-center p-2 md:p-4 relative">
        {activePlayerPokemon && (
          <PokemonCard
            pokemon={activePlayerPokemon}
            isPlayerCard={true}
            isBattleCard={true}
            onRegenerateImage={onRegeneratePokemonImage}
          />
        )}
      </div>

      <div className="h-[45%] md:h-[40%] flex flex-col md:flex-row border-t-2 border-purple-300/50 shadow-lg">
        <div
          ref={battleLogRef}
          className="battle-panel-base md:w-3/5 lg:w-3/5 p-2 custom-scrollbar overflow-y-auto order-1 md:order-1 border-b-2 md:border-b-0 md:border-r-2 border-purple-300/50"
        >
          <div className="space-y-1.5">
            {' '}
            {/* Inner div for messages */}
            {battleLog.map(
              (
                msg // Removed .slice().reverse()
              ) =>
                msg.text === ' ' && msg.speaker === '分隔符' ? (
                  <hr key={msg.id} className="battle-log-separator my-1.5" />
                ) : (
                  <div key={msg.id}>
                    <p
                      className={`text-sm animate-message-appear ${
                        msg.type === 'player_action_log' ||
                        msg.type === 'player_command_echo'
                          ? 'battle-log-message-player'
                          : msg.type === 'enemy_action_log'
                            ? 'battle-log-message-enemy'
                            : msg.type === 'ai_feedback'
                              ? 'battle-log-message-ai-feedback'
                              : msg.type === 'ai_item_action_suggestion'
                                ? 'battle-log-message-ai-item-suggestion'
                                : 'battle-log-message-system'
                      }`}
                    >
                      {msg.speaker !== '系统' && msg.speaker !== '分隔符' && (
                        <span className="font-semibold">{msg.speaker}: </span>
                      )}
                      {msg.text}
                    </p>
                    {msg.type === 'ai_item_action_suggestion' &&
                      msg.itemSuggestions &&
                      selectedItemForAISuggestion && (
                        <div className="item-suggestion-container ml-4 space-y-1">
                          {msg.itemSuggestions.map(suggestion => (
                            <ActionButton
                              key={suggestion.actionTag}
                              onClick={() =>
                                handleItemActionSuggestion(
                                  suggestion,
                                  selectedItemForAISuggestion
                                )
                              }
                              variant="secondary"
                              className="text-xs py-1 px-2 w-auto"
                              disabled={
                                itemSubActionLoading.status !== 'idle' ||
                                isProcessingTurn
                              }
                            >
                              {suggestion.text}
                            </ActionButton>
                          ))}
                        </div>
                      )}
                  </div>
                )
            )}
            {(commandParseLoadingStatus.status !== 'idle' ||
              itemSubActionLoading.status !== 'idle') && (
              <p className="text-sm battle-log-message-player italic animate-pulse">
                {commandParseLoadingStatus.message ||
                  itemSubActionLoading.message ||
                  '处理中...'}
              </p>
            )}
          </div>
        </div>
        <div className="battle-panel-base md:w-2/5 lg:w-2/5 p-2 flex flex-col md:border-t-0 border-purple-300/50 order-2 md:order-2">
          {currentScreen !== 'ACTION_INFO' &&
            currentScreen !== 'BATTLE_OVER_CHOICES' &&
            currentScreen !== 'FORCED_SWITCH' && (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handlePlayerInputCommand();
                }}
                className="mb-2 flex gap-2"
              >
                <input
                  type="text"
                  value={playerInput}
                  onChange={e => setPlayerInput(e.target.value)}
                  placeholder="输入战斗指令 (例如: 使用电光一闪)"
                  className="input-field flex-grow text-sm"
                  disabled={
                    commandParseLoadingStatus.status !== 'idle' ||
                    isProcessingTurn ||
                    itemSubActionLoading.status !== 'idle'
                  }
                />
                <button
                  type="submit"
                  className="choice-button secondary px-4 text-sm"
                  disabled={
                    commandParseLoadingStatus.status !== 'idle' ||
                    isProcessingTurn ||
                    itemSubActionLoading.status !== 'idle' ||
                    !playerInput.trim()
                  }
                >
                  发送
                </button>
              </form>
            )}
          <div className="flex-grow overflow-y-auto custom-scrollbar">
            {renderScreenContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BattleView;
