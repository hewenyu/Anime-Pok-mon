import {
  Pokemon,
  PokemonType,
  PokemonMoveInstance,
  StatusCondition,
  Stat,
  ActiveStatusCondition,
  StatStageModifier,
  InventoryItem,
} from '../types';
import {
  TYPE_EFFECTIVENESS,
  STAT_STAGE_MULTIPLIERS,
  STRUGGLE_MOVE,
  DEFAULT_POKEBALL_BONUS,
  STATUS_CONDITION_INFO,
} from '../constants';

interface DamageCalculationResult {
  damage: number;
  effectivenessFactor: number;
  effectivenessText: string;
  criticalHit?: boolean; // Future use
}

const SELF_HIT_CONFUSION_POWER = 40;

// Helper function to get modified stat based on stages
const getModifiedStat = (
  baseStat: number,
  statType: Stat,
  statStages: StatStageModifier[]
): number => {
  const stageMod = statStages.find(mod => mod.stat === statType);
  const stage = stageMod ? stageMod.stage : 0;
  return Math.floor(baseStat * STAT_STAGE_MULTIPLIERS[stage]);
};

export const calculateDamage = (
  attacker: Pokemon,
  defender: Pokemon,
  move: PokemonMoveInstance,
  isConfusionSelfHit: boolean = false
): DamageCalculationResult => {
  const attackerLevel = attacker.level;

  if (isConfusionSelfHit) {
    // Confusion self-hit: 40 power, typeless, physical, no STAB, no effectiveness, no random variance
    const attackStatValue = getModifiedStat(
      attacker.attack,
      Stat.ATTACK,
      attacker.statStageModifiers
    );
    const defenseStatValue = getModifiedStat(
      attacker.defense,
      Stat.DEFENSE,
      attacker.statStageModifiers
    ); // Hits self defense
    const baseDamage =
      (((2 * attackerLevel) / 5 + 2) *
        SELF_HIT_CONFUSION_POWER *
        attackStatValue) /
        defenseStatValue /
        50 +
      2;
    const finalDamage = Math.max(1, Math.floor(baseDamage));
    return {
      damage: finalDamage,
      effectivenessFactor: 1,
      effectivenessText: '',
    };
  }

  const movePower = move.power;
  if (move.category === '变化' || movePower === 0) {
    let effectivenessFactor = 1;
    let effectivenessText = '';
    if (move.type && defender.types) {
      defender.types.forEach(defenderType => {
        const moveEffectivenessOnType =
          TYPE_EFFECTIVENESS[move.type]?.[defenderType];
        if (moveEffectivenessOnType !== undefined) {
          effectivenessFactor *= moveEffectivenessOnType;
        }
      });
      if (effectivenessFactor === 0) {
        effectivenessText = '对 ' + defender.name + ' 没有效果...';
      }
    }
    return {
      damage: 0,
      effectivenessFactor: effectivenessFactor,
      effectivenessText: effectivenessText,
    };
  }

  let attackStatValue: number;
  let defenseStatValue: number;

  if (move.category === '物理') {
    attackStatValue = getModifiedStat(
      attacker.attack,
      Stat.ATTACK,
      attacker.statStageModifiers
    );
    if (
      attacker.statusConditions.some(
        sc => sc.condition === StatusCondition.BURNED
      )
    ) {
      attackStatValue = Math.floor(attackStatValue / 2);
    }
    defenseStatValue = getModifiedStat(
      defender.defense,
      Stat.DEFENSE,
      defender.statStageModifiers
    );
  } else {
    // Special
    attackStatValue = getModifiedStat(
      attacker.specialAttack,
      Stat.SPECIAL_ATTACK,
      attacker.statStageModifiers
    );
    defenseStatValue = getModifiedStat(
      defender.specialDefense,
      Stat.SPECIAL_DEFENSE,
      defender.statStageModifiers
    );
  }

  attackStatValue = Math.max(1, attackStatValue);
  defenseStatValue = Math.max(1, defenseStatValue);

  let baseDamage =
    (((2 * attackerLevel) / 5 + 2) * movePower * attackStatValue) /
      defenseStatValue /
      50 +
    2;

  if (attacker.types.includes(move.type)) {
    baseDamage *= 1.5;
  }

  let effectivenessFactor = 1;
  defender.types.forEach(defenderType => {
    const moveEffectivenessOnType =
      TYPE_EFFECTIVENESS[move.type]?.[defenderType];
    if (moveEffectivenessOnType !== undefined) {
      effectivenessFactor *= moveEffectivenessOnType;
    }
  });
  baseDamage *= effectivenessFactor;

  const randomVariance = Math.random() * (1.0 - 0.85) + 0.85;
  baseDamage *= randomVariance;

  const finalDamage =
    effectivenessFactor === 0 ? 0 : Math.max(1, Math.floor(baseDamage));

  let effectivenessText = '';
  if (effectivenessFactor === 0)
    effectivenessText = '对 ' + defender.name + ' 没有效果...';
  else if (effectivenessFactor < 1 && effectivenessFactor > 0)
    effectivenessText = '对 ' + defender.name + ' 效果不佳.';
  else if (effectivenessFactor > 1)
    effectivenessText = '对 ' + defender.name + ' 效果绝佳!';

  return {
    damage: finalDamage,
    effectivenessFactor: effectivenessFactor,
    effectivenessText: effectivenessText,
  };
};

export interface PreMoveCheckResult {
  canMove: boolean;
  reason?: string;
  moveToUse?: PokemonMoveInstance;
  hitSelfDamage?: number; // Damage if confused and hits self
  snapOutOfConfusion?: boolean;
  wokeUp?: boolean;
  thawedOut?: boolean;
}

export const checkCanPokemonMove = (pokemon: Pokemon): PreMoveCheckResult => {
  const modifiablePokemon = {
    ...pokemon,
    statusConditions: [...pokemon.statusConditions],
  }; // Operate on a copy

  const flinchStatus = modifiablePokemon.statusConditions.find(
    sc => sc.condition === StatusCondition.FLINCHED
  );
  if (flinchStatus) {
    // Flinch is consumed for this turn. It will be cleared in processEndOfTurnStatus.
    return { canMove: false, reason: `${pokemon.name} 畏缩了，无法行动！` };
  }

  const asleepStatusIndex = modifiablePokemon.statusConditions.findIndex(
    sc => sc.condition === StatusCondition.ASLEEP
  );
  if (asleepStatusIndex > -1) {
    const asleepStatus = {
      ...modifiablePokemon.statusConditions[asleepStatusIndex],
    };
    asleepStatus.duration = (asleepStatus.duration || 1) - 1;
    if (asleepStatus.duration <= 0) {
      modifiablePokemon.statusConditions.splice(asleepStatusIndex, 1);
      return {
        canMove: true,
        reason: `${pokemon.name} 醒来了！`,
        wokeUp: true,
        moveToUse: undefined,
      }; // Return moveToUse: undefined to allow normal move selection.
    } else {
      modifiablePokemon.statusConditions[asleepStatusIndex] = asleepStatus;
      // Update the original pokemon's status for duration change. This part is tricky without direct state mutation.
      // For now, we'll rely on the BattleView to update the pokemon state based on the result.
      return { canMove: false, reason: `${pokemon.name} 睡得很香。` };
    }
  }

  const frozenStatus = modifiablePokemon.statusConditions.find(
    sc => sc.condition === StatusCondition.FROZEN
  );
  if (frozenStatus) {
    if (Math.random() < 0.2) {
      // 20% chance to thaw
      modifiablePokemon.statusConditions =
        modifiablePokemon.statusConditions.filter(
          sc => sc.condition !== StatusCondition.FROZEN
        );
      return {
        canMove: true,
        reason: `${pokemon.name} 解冻了！`,
        thawedOut: true,
        moveToUse: undefined,
      };
    } else {
      return { canMove: false, reason: `${pokemon.name} 被冻住了！` };
    }
  }

  if (
    modifiablePokemon.statusConditions.some(
      sc => sc.condition === StatusCondition.PARALYZED
    )
  ) {
    if (Math.random() < 0.25) {
      return { canMove: false, reason: `${pokemon.name} 麻痹了，无法行动！` };
    }
  }

  const confusedStatusIndex = modifiablePokemon.statusConditions.findIndex(
    sc => sc.condition === StatusCondition.CONFUSED
  );
  if (confusedStatusIndex > -1) {
    const confusedStatus = {
      ...modifiablePokemon.statusConditions[confusedStatusIndex],
    };
    confusedStatus.duration = (confusedStatus.duration || 1) - 1;
    const message = `${pokemon.name} 混乱了！`;
    if (confusedStatus.duration <= 0) {
      modifiablePokemon.statusConditions.splice(confusedStatusIndex, 1);
      return {
        canMove: true,
        reason: message + ` ${pokemon.name} 恢复清醒了！`,
        snapOutOfConfusion: true,
        moveToUse: undefined,
      };
    } else {
      modifiablePokemon.statusConditions[confusedStatusIndex] = confusedStatus;
      // Update pokemon's status for duration change.
      if (Math.random() < 1 / 3) {
        // Roughly 33% chance to hit self
        const selfHit = calculateDamage(pokemon, pokemon, STRUGGLE_MOVE, true); // STRUGGLE_MOVE as placeholder for typeless damage logic
        return {
          canMove: false,
          reason: message + ` ${pokemon.name} 在混乱中攻击了自己！`,
          hitSelfDamage: selfHit.damage,
        };
      }
      // If not hitting self, proceed to use selected move
    }
  }

  if (pokemon.moves.every(m => m.currentPP === 0)) {
    return {
      canMove: true,
      reason: `${pokemon.name} 耗尽了所有PP！`,
      moveToUse: STRUGGLE_MOVE,
    };
  }

  return { canMove: true };
};

export interface AppliedEffectsResult {
  attackerUpdate?: Partial<Pokemon>;
  defenderUpdate?: Partial<Pokemon>;
  messages: string[];
  recoilDamageTaken?: number;
  healingDone?: number;
}

export const applyMoveEffects = (
  attacker: Pokemon,
  defender: Pokemon,
  move: PokemonMoveInstance,
  damageDealt: number
): AppliedEffectsResult => {
  const results: AppliedEffectsResult = { messages: [] };
  if (!move.effects) return results;

  let currentAttackerState = {
    ...attacker,
    statusConditions: [...attacker.statusConditions],
    statStageModifiers: [...attacker.statStageModifiers],
  };
  let currentDefenderState = {
    ...defender,
    statusConditions: [...defender.statusConditions],
    statStageModifiers: [...defender.statStageModifiers],
  };

  for (const effect of move.effects) {
    if (effect.chance && Math.random() > effect.chance) continue;

    let targetPokemonToUpdate: Pokemon;
    let isSelfTarget: boolean;

    if (effect.target === 'SELF') {
      targetPokemonToUpdate = currentAttackerState;
      isSelfTarget = true;
    } else {
      // OPPONENT or other non-self targets
      targetPokemonToUpdate = currentDefenderState;
      isSelfTarget = false;
    }

    const tempTargetStatusConditions = [
      ...targetPokemonToUpdate.statusConditions,
    ];
    const tempTargetStatStages = [...targetPokemonToUpdate.statStageModifiers];
    let tempTargetCurrentHp = targetPokemonToUpdate.currentHp;

    switch (effect.type) {
      case 'STATUS':
        if (
          effect.statusCondition &&
          !tempTargetStatusConditions.some(
            sc => sc.condition === effect.statusCondition
          )
        ) {
          let canApplyStatus = true;
          let immunityMessage = '';

          if (
            (effect.statusCondition === StatusCondition.POISONED ||
              effect.statusCondition === StatusCondition.BADLY_POISONED) &&
            (targetPokemonToUpdate.types.includes(PokemonType.POISON) ||
              targetPokemonToUpdate.types.includes(PokemonType.STEEL))
          ) {
            canApplyStatus = false;
            immunityMessage = `${targetPokemonToUpdate.name} 对毒免疫!`;
          } else if (
            effect.statusCondition === StatusCondition.BURNED &&
            targetPokemonToUpdate.types.includes(PokemonType.FIRE)
          ) {
            canApplyStatus = false;
            immunityMessage = `${targetPokemonToUpdate.name} 对灼伤免疫!`;
          } else if (
            effect.statusCondition === StatusCondition.PARALYZED &&
            targetPokemonToUpdate.types.includes(PokemonType.ELECTRIC)
          ) {
            canApplyStatus = false;
            immunityMessage = `${targetPokemonToUpdate.name} 对麻痹免疫!`;
          } else if (
            effect.statusCondition === StatusCondition.FROZEN &&
            targetPokemonToUpdate.types.includes(PokemonType.ICE)
          ) {
            canApplyStatus = false;
            immunityMessage = `${targetPokemonToUpdate.name} 对冰冻免疫!`;
          }
          // TODO: Add Grass-type immunity to powder moves if move has a 'powder' flag

          if (canApplyStatus) {
            const newStatus: ActiveStatusCondition = {
              condition: effect.statusCondition,
              sourceMove: move.name,
            };
            if (effect.statusCondition === StatusCondition.ASLEEP) {
              newStatus.duration = Math.floor(Math.random() * 3) + 1; // 1-3 turns
            } else if (effect.statusCondition === StatusCondition.CONFUSED) {
              newStatus.duration = Math.floor(Math.random() * 4) + 1; // 1-4 turns
            } else if (
              effect.statusCondition === StatusCondition.BADLY_POISONED
            ) {
              newStatus.toxicCounter = 1;
            }
            tempTargetStatusConditions.push(newStatus);
            results.messages.push(
              `${targetPokemonToUpdate.name} ${effect.effectString || `受到了 ${effect.statusCondition} 效果`}！`
            );
          } else if (immunityMessage) {
            results.messages.push(immunityMessage);
          }
        }
        break;
      case 'STAT_CHANGE':
        if (effect.statChanges) {
          effect.statChanges.forEach(change => {
            const existingStageIndex = tempTargetStatStages.findIndex(
              s => s.stat === change.stat
            );
            if (existingStageIndex > -1) {
              const currentStage =
                tempTargetStatStages[existingStageIndex].stage;
              const newStageValue = Math.max(
                -6,
                Math.min(6, currentStage + change.stage)
              );
              if (
                newStageValue === currentStage &&
                newStageValue === 6 &&
                change.stage > 0
              ) {
                results.messages.push(
                  `${targetPokemonToUpdate.name}的${change.stat}已经无法再提升了！`
                );
              } else if (
                newStageValue === currentStage &&
                newStageValue === -6 &&
                change.stage < 0
              ) {
                results.messages.push(
                  `${targetPokemonToUpdate.name}的${change.stat}已经无法再降低了！`
                );
              } else if (newStageValue !== currentStage) {
                tempTargetStatStages[existingStageIndex] = {
                  ...tempTargetStatStages[existingStageIndex],
                  stage: newStageValue,
                };
                results.messages.push(
                  `${targetPokemonToUpdate.name}的${change.stat}${change.stage > 0 ? '提升' : '降低'}了！`
                );
              }
            } else {
              const newStageValue = Math.max(-6, Math.min(6, change.stage));
              tempTargetStatStages.push({
                stat: change.stat,
                stage: newStageValue,
              });
              results.messages.push(
                `${targetPokemonToUpdate.name}的${change.stat}${change.stage > 0 ? '提升' : '降低'}了！`
              );
            }
          });
        }
        break;
      case 'HEAL':
        if (effect.healPercent) {
          let healingAmount: number;
          if (effect.healPercent > 1) {
            // Fixed amount
            healingAmount = Math.floor(effect.healPercent);
          } else {
            // Percentage of max HP
            healingAmount = Math.floor(
              targetPokemonToUpdate.maxHp * effect.healPercent
            );
          }
          healingAmount = Math.max(1, healingAmount);
          const newHp = Math.min(
            targetPokemonToUpdate.maxHp,
            tempTargetCurrentHp + healingAmount
          );
          if (newHp > tempTargetCurrentHp) {
            results.messages.push(
              `${targetPokemonToUpdate.name} ${effect.effectString || `回复了 ${newHp - tempTargetCurrentHp}点 HP`}！`
            );
            tempTargetCurrentHp = newHp;
            results.healingDone =
              (results.healingDone || 0) + (newHp - tempTargetCurrentHp);
          } else {
            results.messages.push(`${targetPokemonToUpdate.name}的HP已满！`);
          }
        }
        break;
      case 'DAMAGE_HEAL':
        if (effect.damageHealRatio && damageDealt > 0 && isSelfTarget) {
          const healing = Math.max(
            1,
            Math.floor(damageDealt * effect.damageHealRatio)
          );
          const newHp = Math.min(
            targetPokemonToUpdate.maxHp,
            tempTargetCurrentHp + healing
          );
          if (newHp > tempTargetCurrentHp) {
            results.messages.push(
              `${targetPokemonToUpdate.name} ${effect.effectString || `吸取了 ${newHp - tempTargetCurrentHp}点 HP`}！`
            );
            tempTargetCurrentHp = newHp;
            results.healingDone =
              (results.healingDone || 0) + (newHp - tempTargetCurrentHp);
          }
        }
        break;
      case 'RECOIL_PERCENT':
        if (effect.recoilPercent && damageDealt > 0 && isSelfTarget) {
          const recoilDamage = Math.max(
            1,
            Math.floor(damageDealt * effect.recoilPercent)
          );
          tempTargetCurrentHp = Math.max(0, tempTargetCurrentHp - recoilDamage);
          results.messages.push(
            `${targetPokemonToUpdate.name} ${effect.effectString || `受到了 ${recoilDamage} 点反作用力伤害`}！`
          );
          results.recoilDamageTaken =
            (results.recoilDamageTaken || 0) + recoilDamage;
        }
        break;
      case 'RECOIL_FIXED':
        if (effect.recoilFixedPercentMaxHp && isSelfTarget) {
          const recoilDamage = Math.max(
            1,
            Math.floor(
              targetPokemonToUpdate.maxHp * effect.recoilFixedPercentMaxHp
            )
          );
          tempTargetCurrentHp = Math.max(0, tempTargetCurrentHp - recoilDamage);
          results.messages.push(
            `${targetPokemonToUpdate.name} ${effect.effectString || `受到了 ${recoilDamage} 点反作用力伤害`}！`
          );
          results.recoilDamageTaken =
            (results.recoilDamageTaken || 0) + recoilDamage;
        }
        break;
      case 'FLINCH':
        if (
          !isSelfTarget &&
          !tempTargetStatusConditions.some(
            sc => sc.condition === StatusCondition.FLINCHED
          )
        ) {
          tempTargetStatusConditions.push({
            condition: StatusCondition.FLINCHED,
            sourceMove: move.name,
          });
          results.messages.push(
            `${targetPokemonToUpdate.name} ${effect.effectString || `畏缩了`}!`
          );
        }
        break;
      // Implement FIXED_DAMAGE, MULTI_HIT (BattleView logic), OHKO later
    }

    if (isSelfTarget) {
      currentAttackerState = {
        ...currentAttackerState,
        currentHp: tempTargetCurrentHp,
        statusConditions: tempTargetStatusConditions,
        statStageModifiers: tempTargetStatStages,
      };
    } else {
      currentDefenderState = {
        ...currentDefenderState,
        currentHp: tempTargetCurrentHp,
        statusConditions: tempTargetStatusConditions,
        statStageModifiers: tempTargetStatStages,
      };
    }
  }

  // Only include updates if there are actual changes
  if (JSON.stringify(currentAttackerState) !== JSON.stringify(attacker)) {
    results.attackerUpdate = currentAttackerState;
  }
  if (JSON.stringify(currentDefenderState) !== JSON.stringify(defender)) {
    results.defenderUpdate = currentDefenderState;
  }

  return results;
};

export interface EndOfTurnResult {
  pokemonUpdate?: Partial<Pokemon>;
  messages: string[];
  fainted?: boolean;
}

export const processEndOfTurnStatus = (pokemon: Pokemon): EndOfTurnResult => {
  const results: EndOfTurnResult = { messages: [] };
  const updatedPokemon = {
    ...pokemon,
    statusConditions: [...pokemon.statusConditions],
  }; // Operate on a copy

  const badlyPoisonedIndex = updatedPokemon.statusConditions.findIndex(
    sc => sc.condition === StatusCondition.BADLY_POISONED
  );
  if (badlyPoisonedIndex > -1) {
    const status = updatedPokemon.statusConditions[badlyPoisonedIndex];
    const damage = Math.max(
      1,
      Math.floor((updatedPokemon.maxHp * (status.toxicCounter || 1)) / 16)
    );
    updatedPokemon.currentHp = Math.max(0, updatedPokemon.currentHp - damage);
    results.messages.push(
      `${updatedPokemon.name} 因剧毒受到了 ${damage} 点伤害！`
    );
    // Increment toxicCounter for next turn
    updatedPokemon.statusConditions[badlyPoisonedIndex] = {
      ...status,
      toxicCounter: (status.toxicCounter || 1) + 1,
    };
    if (updatedPokemon.currentHp === 0) {
      results.fainted = true;
      results.messages.push(`${updatedPokemon.name} 因剧毒倒下了！`);
    }
  }

  if (
    updatedPokemon.currentHp > 0 &&
    updatedPokemon.statusConditions.some(
      sc => sc.condition === StatusCondition.POISONED
    )
  ) {
    const damage = Math.max(1, Math.floor(updatedPokemon.maxHp / 8));
    updatedPokemon.currentHp = Math.max(0, updatedPokemon.currentHp - damage);
    results.messages.push(
      `${updatedPokemon.name} 因中毒受到了 ${damage} 点伤害！`
    );
    if (updatedPokemon.currentHp === 0) {
      results.fainted = true;
      results.messages.push(`${updatedPokemon.name} 因中毒倒下了！`);
    }
  }

  if (
    updatedPokemon.currentHp > 0 &&
    updatedPokemon.statusConditions.some(
      sc => sc.condition === StatusCondition.BURNED
    )
  ) {
    const damage = Math.max(1, Math.floor(updatedPokemon.maxHp / 16));
    updatedPokemon.currentHp = Math.max(0, updatedPokemon.currentHp - damage);
    results.messages.push(
      `${updatedPokemon.name} 因灼伤受到了 ${damage} 点伤害！`
    );
    if (updatedPokemon.currentHp === 0) {
      results.fainted = true;
      results.messages.push(`${updatedPokemon.name} 因灼伤倒下了！`);
    }
  }

  // Clear one-turn Flinch status
  const flinchIndex = updatedPokemon.statusConditions.findIndex(
    sc => sc.condition === StatusCondition.FLINCHED
  );
  if (flinchIndex > -1) {
    updatedPokemon.statusConditions = updatedPokemon.statusConditions.filter(
      (_, index) => index !== flinchIndex
    );
  }

  // Check ASLEEP and CONFUSED duration expiration if not handled by checkCanPokemonMove (e.g., if they didn't try to move)
  // This is somewhat redundant if checkCanPokemonMove correctly updates the status array passed to it (which it should aim to)
  // For now, assuming checkCanPokemonMove handles expiration before move attempt.

  if (JSON.stringify(updatedPokemon) !== JSON.stringify(pokemon)) {
    results.pokemonUpdate = updatedPokemon;
  }

  return results;
};

export interface ItemApplicationResult {
  success: boolean;
  messages: string[];
  updatedTarget?: Partial<Pokemon>;
  updatedUser?: Partial<Pokemon>; // For items that might affect the user (e.g. X items, though not explicitly detailed)
  enemyCaught?: boolean;
}

export const applyItemEffects = (
  item: InventoryItem,
  targetPokemon: Pokemon,
  _userPokemon?: Pokemon // Only relevant for items that might affect the user, like X Attack
): ItemApplicationResult => {
  const result: ItemApplicationResult = { success: false, messages: [] };
  if (!item.effect) {
    result.messages.push(`${item.name} 似乎没有效果。`);
    return result;
  }

  const currentTargetState = {
    ...targetPokemon,
    statusConditions: [...targetPokemon.statusConditions],
  };

  switch (item.effect.type) {
    case 'HEAL_HP':
      if (item.effect.amount) {
        if (currentTargetState.currentHp === currentTargetState.maxHp) {
          result.messages.push(`${currentTargetState.name} 的HP已满！`);
          return result;
        }
        const healAmount = item.effect.amount;
        const newHp = Math.min(
          currentTargetState.maxHp,
          currentTargetState.currentHp + healAmount
        );
        const healedFor = newHp - currentTargetState.currentHp;
        if (healedFor > 0) {
          currentTargetState.currentHp = newHp;
          result.messages.push(
            `${currentTargetState.name} 回复了 ${healedFor} 点HP！`
          );
          result.updatedTarget = { currentHp: newHp };
          result.success = true;
        } else {
          result.messages.push(`${currentTargetState.name} 的HP没有变化。`);
        }
      } else {
        result.messages.push(`${item.name} 的治疗量未定义。`);
      }
      break;

    case 'CURE_STATUS':
      if (item.effect.statusToCure) {
        const statusIndex = currentTargetState.statusConditions.findIndex(
          sc => sc.condition === item.effect.statusToCure
        );
        if (statusIndex > -1) {
          currentTargetState.statusConditions.splice(statusIndex, 1);
          result.messages.push(
            `${currentTargetState.name} 从 ${STATUS_CONDITION_INFO[item.effect.statusToCure]?.longName || item.effect.statusToCure} 状态中恢复了！`
          );
          result.updatedTarget = {
            statusConditions: currentTargetState.statusConditions,
          };
          result.success = true;
        } else {
          result.messages.push(
            `${currentTargetState.name} 并没有处于 ${STATUS_CONDITION_INFO[item.effect.statusToCure]?.longName || item.effect.statusToCure} 状态。`
          );
        }
      } else {
        result.messages.push(`${item.name} 无法确定要治疗哪个状态。`);
      }
      break;

    case 'CATCH_POKEMON': {
      if (targetPokemon.isPlayerOwned) {
        result.messages.push(`不能对自己的宝可梦使用精灵球！`);
        return result;
      }
      // Simplified catch logic
      let chance =
        ((targetPokemon.maxHp - targetPokemon.currentHp) /
          targetPokemon.maxHp) *
          0.6 +
        0.05; // Base: 5% to 65% based on HP
      chance *= item.effect?.ballBonus || DEFAULT_POKEBALL_BONUS; // Multiplied by ball bonus
      chance = Math.min(0.95, chance); // Cap at 95% for non-Master Balls

      // Add a small bonus for status conditions
      if (targetPokemon.statusConditions.length > 0) {
        chance = Math.min(0.95, chance + 0.1);
      }

      const caught = Math.random() < chance;

      result.messages.push(`投掷了 ${item.name}！`);
      if (caught) {
        result.messages.push(`太棒了！${targetPokemon.name} 被成功捕捉了！`);
        result.enemyCaught = true;
        result.success = true;
        // The actual adding to team will be handled by BattleView based on enemyCaught
      } else {
        result.messages.push(`噢，真可惜！${targetPokemon.name} 逃脱了！`);
        result.success = true; // Item was used successfully, even if catch failed
      }
      break;
    }

    // STAT_BOOST_TEMP not fully implemented in ItemEffect type yet, but can be added.
    // case 'STAT_BOOST_TEMP':
    //   if (userPokemon && item.effect.statChanges) {
    //     // Apply to userPokemon, logic similar to move stat changes but perhaps temporary
    //     result.messages.push(`${userPokemon.name} 的能力暂时提升了！`);
    //     result.updatedUser = { ... }; // Update statStageModifiers
    //     result.success = true;
    //   } else {
    //     result.messages.push(`${item.name} 无法对目标使用。`);
    //   }
    //   break;

    default:
      result.messages.push(`${item.name} 的效果类型未知或无法在此处处理。`);
  }

  return result;
};
