import {
  Pokemon,
  PokemonType,
  IVs,
  PokemonMoveInstance,
  MoveEffect,
  NPC,
  InventoryItem,
  ItemEffect,
  StatusCondition,
} from '../types';
import { getBestPokemonImageUrl, getBestItemImageUrl } from './imageMapping';

const isValidPokemonType = (typeStr: string): typeStr is PokemonType => {
  return Object.values(PokemonType).includes(typeStr as PokemonType);
};

export const sanitizePokemonData = (aiPokemon: Partial<Pokemon>): Pokemon => {
  const level = Math.max(1, aiPokemon.level ?? 1);
  const maxHp = Math.max(1, aiPokemon.maxHp ?? level * 10 + 10);
  const currentHp = Math.min(aiPokemon.currentHp ?? maxHp, maxHp);

  // XP to next level is calculated based on the *current* level of the Pokémon
  // It represents the XP needed to go from 'level' to 'level + 1'
  const xpToNextLevelDefault =
    Math.floor(Math.pow(level, 2.8)) + level * 25 + 75;
  const xpToNextLevel = Math.max(
    1,
    aiPokemon.xpToNextLevel ?? xpToNextLevelDefault
  );
  const currentXp = Math.max(0, aiPokemon.currentXp ?? 0); // Default currentXp to 0

  const sanitizedTypes = (aiPokemon.types || [PokemonType.NORMAL])
    .map(t =>
      typeof t === 'string' && isValidPokemonType(t) ? t : PokemonType.NORMAL
    )
    .filter((value, index, self) => self.indexOf(value) === index);

  if (sanitizedTypes.length === 0) sanitizedTypes.push(PokemonType.NORMAL);

  const attack = aiPokemon.attack ?? level * 4 + 10;
  const defense = aiPokemon.defense ?? level * 4 + 8;
  const specialAttack = aiPokemon.specialAttack ?? level * 4 + 10;
  const specialDefense = aiPokemon.specialDefense ?? level * 4 + 8;
  const speed = aiPokemon.speed ?? level * 4 + 7;

  const defaultSingleIV = () => Math.floor(Math.random() * 32);
  const ivs: IVs = {
    hp: aiPokemon.ivs?.hp ?? defaultSingleIV(),
    attack: aiPokemon.ivs?.attack ?? defaultSingleIV(),
    defense: aiPokemon.ivs?.defense ?? defaultSingleIV(),
    specialAttack: aiPokemon.ivs?.specialAttack ?? defaultSingleIV(),
    specialDefense: aiPokemon.ivs?.specialDefense ?? defaultSingleIV(),
    speed: aiPokemon.ivs?.speed ?? defaultSingleIV(),
  };

  const nature = aiPokemon.nature || '勤奋';

  const sanitizedMoves = (aiPokemon.moves || []).map(
    (move): PokemonMoveInstance => {
      let category: '物理' | '特殊' | '变化';
      if (
        move.category &&
        (move.category === '物理' ||
          move.category === '特殊' ||
          move.category === '变化')
      ) {
        category = move.category;
      } else if (typeof move.power === 'number' && move.power > 0) {
        category = '物理';
      } else {
        category = '变化';
      }
      const basePP =
        typeof move.basePP === 'number' && move.basePP >= 0 ? move.basePP : 10;

      const effects: MoveEffect[] = (move.effects || []).map(eff => ({
        type: eff.type,
        target: eff.target || 'OPPONENT',
        chance:
          typeof eff.chance === 'number'
            ? Math.max(0, Math.min(1, eff.chance))
            : undefined,
        statusCondition: eff.statusCondition,
        statChanges: eff.statChanges,
        healPercent:
          typeof eff.healPercent === 'number' ? eff.healPercent : undefined,
        damageHealRatio:
          typeof eff.damageHealRatio === 'number'
            ? eff.damageHealRatio
            : undefined,
        recoilPercent:
          typeof eff.recoilPercent === 'number' ? eff.recoilPercent : undefined,
        recoilFixedPercentMaxHp:
          typeof eff.recoilFixedPercentMaxHp === 'number'
            ? eff.recoilFixedPercentMaxHp
            : undefined,
        fixedDamage:
          typeof eff.fixedDamage === 'number' ? eff.fixedDamage : undefined,
        multiHitMin:
          typeof eff.multiHitMin === 'number' ? eff.multiHitMin : undefined,
        multiHitMax:
          typeof eff.multiHitMax === 'number' ? eff.multiHitMax : undefined,
        effectString:
          typeof eff.effectString === 'string' ? eff.effectString : undefined,
      }));

      return {
        name: move.name || '冲击',
        power: typeof move.power === 'number' ? move.power : 0,
        type:
          typeof move.type === 'string' && isValidPokemonType(move.type)
            ? move.type
            : PokemonType.NORMAL,
        category: category,
        basePP: basePP,
        currentPP: move.currentPP ?? basePP,
        description:
          typeof move.description === 'string' ? move.description : undefined,
        effects: effects.length > 0 ? effects : undefined,
        accuracy:
          typeof move.accuracy === 'number'
            ? Math.max(0, Math.min(100, move.accuracy))
            : undefined,
        priority: typeof move.priority === 'number' ? move.priority : 0,
      };
    }
  );

  return {
    id: aiPokemon.id || `unknown_pokemon_${Date.now()}`,
    name: aiPokemon.name || '未知宝可梦',
    types: sanitizedTypes,
    currentHp: currentHp,
    maxHp: maxHp,
    level: level,
    currentXp: currentXp,
    xpToNextLevel: xpToNextLevel,
    imageUrl: getBestPokemonImageUrl(
      aiPokemon.name || '未知宝可梦',
      aiPokemon.imageUrl
    ),
    moves: sanitizedMoves,
    attack: attack,
    defense: defense,
    specialAttack: specialAttack,
    specialDefense: specialDefense,
    speed: speed,
    ivs: ivs,
    nature: nature,
    statusConditions: aiPokemon.statusConditions || [],
    statStageModifiers: aiPokemon.statStageModifiers || [],
    isPlayerOwned: aiPokemon.isPlayerOwned ?? false,
    isFainted: aiPokemon.isFainted ?? currentHp <= 0,
    instanceId:
      aiPokemon.instanceId ||
      `${aiPokemon.id || 'pokemon'}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  };
};

export const sanitizeNPCData = (aiNPC: Partial<NPC>): NPC => {
  return {
    id:
      aiNPC.id ||
      `npc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    name: aiNPC.name || '神秘人',
    description: aiNPC.description || '一位新认识的朋友或路人。',
    relationshipStatus: aiNPC.relationshipStatus || '中立',
    profileImageUrl: aiNPC.profileImageUrl,
    dialogueHistory: aiNPC.dialogueHistory || [],
  };
};

export const sanitizeItemData = (
  aiItem: Partial<InventoryItem>
): InventoryItem => {
  const name = aiItem.name || '未知道具';
  const imageUrlToUse = getBestItemImageUrl(name, aiItem.imageUrl);

  let finalDescription: string | undefined = undefined;
  if (typeof aiItem.description === 'string') {
    finalDescription = aiItem.description;
  } else if (aiItem.description && typeof aiItem.description === 'object') {
    const descObj = aiItem.description as any;
    if (typeof descObj.description === 'string') {
      finalDescription = descObj.description;
    } else if (typeof descObj.name === 'string') {
      finalDescription = `关于 "${descObj.name}" 的说明信息。`;
    } else {
      finalDescription = '（道具描述格式有误，无法正确显示。）';
    }
  }

  let defaultEffect: ItemEffect | undefined;
  let defaultCanUseInBattle = false;
  let defaultTargetType: InventoryItem['targetType'] = 'SELF_ACTIVE';

  if (name.includes('伤药') || name.toLowerCase().includes('potion')) {
    defaultEffect = {
      type: 'HEAL_HP',
      amount:
        name.includes('好伤药') || name.toLowerCase().includes('super')
          ? 50
          : 20,
    };
    defaultCanUseInBattle = true;
    defaultTargetType = 'SELF_TEAM';
  } else if (name.includes('精灵球') || name.toLowerCase().includes('ball')) {
    defaultEffect = { type: 'CATCH_POKEMON', ballBonus: 1 };
    defaultCanUseInBattle = true;
    defaultTargetType = 'ENEMY';
  } else if (
    name.includes('解毒药') ||
    name.toLowerCase().includes('antidote')
  ) {
    defaultEffect = {
      type: 'CURE_STATUS',
      statusToCure: StatusCondition.POISONED,
    };
    defaultCanUseInBattle = true;
    defaultTargetType = 'SELF_TEAM';
  }

  return {
    id:
      aiItem.id ||
      `item-${name.replace(/\s+/g, '_').toLowerCase()}-${Date.now()}`,
    name: name,
    quantity: Math.max(1, aiItem.quantity || 1),
    description: finalDescription,
    effectText: aiItem.effectText || '效果：未知，或请查看描述。',
    imageUrl: imageUrlToUse,
    canUseInBattle: aiItem.canUseInBattle ?? defaultCanUseInBattle,
    targetType: aiItem.targetType ?? defaultTargetType,
    effect: aiItem.effect ?? defaultEffect,
  };
};
