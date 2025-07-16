import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import {
  GameState,
  AIStoryResponse,
  ChatHistoryEntry,
  AIStoryChoice,
  AIEventTrigger,
  PlayerProfile,
  AICustomizationScreenActionTag,
  Pokemon,
  InventoryItem,
  PokemonMoveInstance,
  ParsedBattleAction,
  BattleCommandParseContext,
  PokemonType,
  ClassifiedIntent,
  ActiveStatusCondition,
} from '../types';
import {
  GEMINI_GAME_MASTER_SYSTEM_PROMPT,
  GEMINI_MOVE_DESCRIPTION_SYSTEM_PROMPT,
  INITIAL_GAME_STATE,
  GEMINI_BATTLE_COMMAND_PARSER_SYSTEM_PROMPT,
  GEMINI_STRICT_ACTION_SYSTEM_PROMPT, // Added
  GEMINI_CUSTOMIZATION_INTENT_CLASSIFIER_SYSTEM_PROMPT, // Added
  GEMINI_NPC_CHAT_SYSTEM_PROMPT,
  GEMINI_BATTLE_ITEM_ACTION_SUGGESTOR_SYSTEM_PROMPT, // Added for item suggestions
} from '../constants';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error(
    'API_KEY is not set. Please ensure the API_KEY environment variable is configured.'
  );
}

if (!process.env.GOOGLE_GEMINI_BASE_URL) {
  throw new Error('GOOGLE_GEMINI_BASE_URL environment variable not set');
}

const httpOptions = {
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
  baseUrl: process.env.GOOGLE_GEMINI_BASE_URL,
};

const ai = new GoogleGenAI({ apiKey: API_KEY!, httpOptions });
const MAX_RETRIES = 2; // Allows for 1 initial attempt + 2 retries = 3 total attempts

interface FetchOptions {
  pokemonInstanceIdToRegenerate?: string;
  pokemonNameToRegenerate?: string;
}

export type OnRetryCallback = (
  attempt: number,
  maxAttempts: number,
  errorType: 'format' | 'api'
) => void;

function buildPrompt(
  gameState: GameState,
  lastPlayerActionTagOrInput?: string,
  options?: FetchOptions
): string {
  let prompt = '';
  const customizationScreenActionTags: AICustomizationScreenActionTag[] = [
    'GENERATE_FULL_RANDOM_PROFILE',
    'GENERATE_RANDOM_STARTER_POKEMON',
    'GENERATE_RANDOM_ITEM',
    'GENERATE_RANDOM_PLAYER_DESCRIPTION',
  ];
  const isStrictActionForThisPromptBuilder =
    customizationScreenActionTags.includes(
      lastPlayerActionTagOrInput as AICustomizationScreenActionTag
    ) ||
    lastPlayerActionTagOrInput === 'USER_REQUESTS_POKEMON_IMAGE_REGENERATION';

  if (
    lastPlayerActionTagOrInput === 'USER_REQUESTS_POKEMON_IMAGE_REGENERATION' &&
    options?.pokemonInstanceIdToRegenerate &&
    options?.pokemonNameToRegenerate
  ) {
    prompt = `Player is requesting a new image for Pokémon: ${options.pokemonNameToRegenerate} (InstanceID: ${options.pokemonInstanceIdToRegenerate}) because the previous image failed to load.\n`;
    prompt += `Instruction: Provide a new, valid 'imageUrl' for this Pokémon in the 'regeneratedPokemonImageUrl' field of the AIStoryResponse. The narrative should briefly confirm the attempt in Chinese.\n`;
  } else if (
    customizationScreenActionTags.includes(
      lastPlayerActionTagOrInput as AICustomizationScreenActionTag
    )
  ) {
    if (lastPlayerActionTagOrInput === 'GENERATE_FULL_RANDOM_PROFILE') {
      prompt =
        'Player requests a full random starting profile for a Pokémon text adventure.\n';
      prompt += `Instruction: You are operating under the 'GENERATE_FULL_RANDOM_PROFILE' action tag. Generate a full random starting profile as per system instructions. Ensure all events (SET_PLAYER_PROFILE including name (Chinese), gender (Chinese), age, description (Chinese), stamina, etc.), UPDATE_LOCATION (Chinese location name and mapData), UPDATE_OBJECTIVE (Chinese objective), ADD_POKEMON_TO_TEAM (with moves including basePP, all names/descriptions in Chinese), UPDATE_MONEY, optional GIVE_ITEM (all names/descriptions in Chinese)) are provided. All text must be Chinese.\n`;
    } else if (
      lastPlayerActionTagOrInput === 'GENERATE_RANDOM_PLAYER_DESCRIPTION'
    ) {
      prompt =
        'Player (on main customization form) requests a new random character description.\n';
      prompt +=
        "Instruction: You are operating under the 'GENERATE_RANDOM_PLAYER_DESCRIPTION' action tag. Provide a 'SET_PLAYER_PROFILE' event with only a new 'description' (Chinese) in 'profileDetails'. The narrative should confirm generation and suggest editing or acceptance, all in Chinese.\n";
    } else if (
      lastPlayerActionTagOrInput === 'GENERATE_RANDOM_STARTER_POKEMON'
    ) {
      const currentStartersString =
        gameState.playerTeam.length > 0
          ? gameState.playerTeam.map(p => p.name).join(', ')
          : '无';
      prompt = `Player (on main customization form) requests a new random starter Pokémon to ADD to their selection of potential starting Pokémon.\n`;
      prompt += `Current starter options already selected by player: [${currentStartersString}].\n`;
      prompt += `Instruction: You are operating under the 'GENERATE_RANDOM_STARTER_POKEMON' action tag. Provide an 'ADD_POKEMON_TO_TEAM' event with one new, randomly selected, low-level Pokémon suitable as a starter, including its moves with basePP. This Pokémon's species **must be different** from those already listed. Aim for diversity. The narrative should confirm a new Pokémon has been ADDED, in Chinese. All Pokémon names and move details must be in Chinese.\n`;
    } else if (lastPlayerActionTagOrInput === 'GENERATE_RANDOM_ITEM') {
      prompt =
        'Player (on main customization form) requests a new random item to be added.\n';
      prompt +=
        "Instruction: You are operating under the 'GENERATE_RANDOM_ITEM' action tag. Provide a 'GIVE_ITEM' event. The item generated MUST be genuinely random and varied each time. Strictly follow all rules under the 'GENERATE_RANDOM_ITEM' action tag defined in the system prompt, especially the 'CRITICAL RULE for itemDetails' (ensuring mandatory Chinese 'name', Chinese 'effectText', Chinese 'description', and a valid 'imageUrl' if possible) and the 'quantity'. The 'narrative' field in your response MUST be exactly '为你随机添加了新的道具选项...' (Chinese) and nothing else.\n";
    }
  } else {
    prompt =
      'Current Game State (all user-facing text like names, descriptions should be considered as Chinese):\n';
    const profileToUse =
      gameState.playerProfile || INITIAL_GAME_STATE.playerProfile;

    const gameTime = new Date(gameState.currentGameTime);
    const jsYear = gameTime.getFullYear();
    let formattedYearString;
    if (jsYear === 0) {
      // JavaScript year 0 corresponds to 1 BC
      formattedYearString = '公元前 1年';
    } else if (jsYear < 0) {
      // JavaScript year -N corresponds to (N+1) BC
      formattedYearString = `公元前 ${Math.abs(jsYear) + 1}年`;
    } else {
      // Positive years are AD/CE
      formattedYearString = `公元 ${jsYear}年`;
    }
    const formattedGameTime = `${formattedYearString}${(gameTime.getMonth() + 1).toString().padStart(2, '0')}月${gameTime.getDate().toString().padStart(2, '0')}日 ${gameTime.getHours().toString().padStart(2, '0')}:${gameTime.getMinutes().toString().padStart(2, '0')}`;

    prompt += `Player: { Name: ${profileToUse.name || '未设定'}, Gender: ${profileToUse.gender || '未设定'}, Age: ${profileToUse.age || '未知'}, Description: "${profileToUse.description || '无特别说明'}", Stamina: ${profileToUse.stamina !== undefined ? profileToUse.stamina : '?'}/${profileToUse.maxStamina !== undefined ? profileToUse.maxStamina : '?'}, Energy: ${profileToUse.energy !== undefined ? profileToUse.energy : '?'}/${profileToUse.maxEnergy !== undefined ? profileToUse.maxEnergy : '?'}, Health: ${profileToUse.healthStatus || '?'} }\n`;
    prompt += `Team: [${gameState.playerTeam.map(p => `${p.name} (Lv.${p.level}, HP: ${p.currentHp}/${p.maxHp}, Moves: ${p.moves.map(m => `${m.name} ${m.currentPP}/${m.basePP}PP`).join('/')})`).join(', ')}]\n`;
    prompt += `Inventory: [${gameState.inventory.map(i => `${i.name} (ID: ${i.id}) x${i.quantity}`).join(', ')}]\n`;
    prompt += `Money: ${gameState.money}\n`;
    prompt += `Location: ${gameState.currentLocationDescription}\n`;
    prompt += `Current Objective: ${gameState.currentObjective}\n`;
    prompt += `Current Game Time: ${formattedGameTime} (Timestamp for internal use: ${gameState.currentGameTime})\n`; // AI gets formatted time

    if (gameState.knownNPCs.length > 0) {
      prompt += `Known NPCs: [${gameState.knownNPCs.map(npc => `${npc.name} (ID: ${npc.id}, Relationship: ${npc.relationshipStatus})`).join(', ')}]\n`;
    }

    if (lastPlayerActionTagOrInput?.startsWith('PLAYER_TALKS_TO_NPC_')) {
      // Context built by handleSendPlayerMessageToNPC
    } else if (gameState.chatHistory.length > 0) {
      prompt +=
        '\nRecent Game Conversation History (last 3-4 meaningful exchanges, main log, all in Chinese):\n';
      const recentHistory: ChatHistoryEntry[] = gameState.chatHistory
        .filter(entry => entry.type === 'ai' || entry.type === 'player_input')
        .slice(-6);
      recentHistory.forEach(entry => {
        prompt += `${entry.speaker}: ${entry.narrative}\n`;
      });
    }

    if (
      lastPlayerActionTagOrInput &&
      !lastPlayerActionTagOrInput.startsWith('PLAYER_TALKS_TO_NPC_') &&
      !customizationScreenActionTags.includes(
        lastPlayerActionTagOrInput as AICustomizationScreenActionTag
      )
    ) {
      prompt += `\nPlayer's Last Action/Choice Tag or Input (Chinese text if applicable): ${lastPlayerActionTagOrInput}\n`;
      if (
        lastPlayerActionTagOrInput === 'START_ADVENTURE_WITH_CUSTOMIZED_PROFILE'
      ) {
        prompt += `Instruction: Player has confirmed their starting profile (including potentially a custom start time). Begin the adventure in Chinese. Ensure an 'UPDATE_LOCATION' or 'UPDATE_AREA_MAP' event with 'mapData' (Chinese location name) is included. The AI must consider the Current Game Time to set the era and tone of the adventure.\n`;
      }
    } else if (
      !gameState.chatHistory.some(entry => entry.type === 'ai') &&
      !lastPlayerActionTagOrInput?.startsWith('PLAYER_TALKS_TO_NPC_') &&
      !customizationScreenActionTags.includes(
        lastPlayerActionTagOrInput as AICustomizationScreenActionTag
      )
    ) {
      prompt += `\nThis is the initial context for the scene, or the player is starting their adventure. Ensure all output is in Chinese. The AI must consider the Current Game Time to set the era and tone of the adventure.\n`;
    }
  }

  if (isStrictActionForThisPromptBuilder) {
    prompt +=
      '\nFollow the system instructions for this action tag precisely and provide the JSON output as specified. Do not generate additional story elements or narrative beyond what is instructed for this specific action. All user-facing text in the JSON must be Chinese.';
  } else {
    prompt +=
      "\nWhat happens next? Generate the story, choices, and any relevant events based on this state and the player's last action. Ensure your response is a single JSON object as specified in the system instructions, with all user-facing text in Chinese. Crucially, consider the 'Current Game Time' to set the historical era and technological level of the world.";
  }
  return prompt;
}

export async function fetchStoryContinuation(
  gameState: GameState,
  playerActionTagOrInputOrSpecializedPrompt: string, // Can be actionTag, user input, or a fully formed prompt for specialized AIs
  options?: FetchOptions,
  onRetry?: OnRetryCallback,
  retryCount = 0,
  systemPromptOverride: string = GEMINI_GAME_MASTER_SYSTEM_PROMPT
): Promise<AIStoryResponse> {
  if (!API_KEY) {
    return {
      narrative:
        '游戏遇到了一点小问题，AI暂时无法连接。请检查API密钥设置或稍后再试。',
      speaker: '系统消息',
      choices: [{ text: '了解', actionTag: 'ACKNOWLEDGE_NO_API_KEY' }],
    };
  }

  let userPromptContent: string;

  const isSpecializedAssistantCall =
    systemPromptOverride !== GEMINI_GAME_MASTER_SYSTEM_PROMPT &&
    systemPromptOverride !== GEMINI_STRICT_ACTION_SYSTEM_PROMPT &&
    systemPromptOverride !== GEMINI_NPC_CHAT_SYSTEM_PROMPT &&
    systemPromptOverride !== GEMINI_BATTLE_COMMAND_PARSER_SYSTEM_PROMPT &&
    systemPromptOverride !==
      GEMINI_BATTLE_ITEM_ACTION_SUGGESTOR_SYSTEM_PROMPT && // Added check
    systemPromptOverride !== GEMINI_MOVE_DESCRIPTION_SYSTEM_PROMPT;

  if (isSpecializedAssistantCall) {
    userPromptContent = playerActionTagOrInputOrSpecializedPrompt;
  } else {
    if (
      systemPromptOverride === GEMINI_GAME_MASTER_SYSTEM_PROMPT ||
      systemPromptOverride === GEMINI_STRICT_ACTION_SYSTEM_PROMPT
    ) {
      userPromptContent = buildPrompt(
        gameState,
        playerActionTagOrInputOrSpecializedPrompt,
        options
      );
    } else {
      userPromptContent = playerActionTagOrInputOrSpecializedPrompt;
    }
  }

  let jsonText = '';
  let rawTrimmedText = '';

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: userPromptContent }] }],
      config: {
        systemInstruction: systemPromptOverride,
        responseMimeType: 'application/json',
        temperature:
          systemPromptOverride ===
            GEMINI_CUSTOMIZATION_INTENT_CLASSIFIER_SYSTEM_PROMPT ||
          systemPromptOverride === GEMINI_BATTLE_COMMAND_PARSER_SYSTEM_PROMPT ||
          systemPromptOverride ===
            GEMINI_BATTLE_ITEM_ACTION_SUGGESTOR_SYSTEM_PROMPT
            ? 0.1
            : 0.75,
        topK:
          systemPromptOverride ===
            GEMINI_CUSTOMIZATION_INTENT_CLASSIFIER_SYSTEM_PROMPT ||
          systemPromptOverride === GEMINI_BATTLE_COMMAND_PARSER_SYSTEM_PROMPT ||
          systemPromptOverride ===
            GEMINI_BATTLE_ITEM_ACTION_SUGGESTOR_SYSTEM_PROMPT
            ? 20
            : 40,
        topP: 0.95,
        thinkingConfig:
          systemPromptOverride ===
            GEMINI_CUSTOMIZATION_INTENT_CLASSIFIER_SYSTEM_PROMPT ||
          systemPromptOverride === GEMINI_BATTLE_COMMAND_PARSER_SYSTEM_PROMPT ||
          systemPromptOverride ===
            GEMINI_BATTLE_ITEM_ACTION_SUGGESTOR_SYSTEM_PROMPT ||
          systemPromptOverride === GEMINI_MOVE_DESCRIPTION_SYSTEM_PROMPT
            ? { thinkingBudget: 0 }
            : undefined,
      },
    });

    rawTrimmedText = response.text.trim();
    jsonText = rawTrimmedText;

    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonText.match(fenceRegex);
    if (match && match[2]) {
      jsonText = match[2].trim();
    }

    try {
      const parsedData: any = JSON.parse(jsonText);

      const typedEvents = Array.isArray(parsedData.events)
        ? (parsedData.events
            .map((event: any) => {
              if (event.type === 'SET_PLAYER_PROFILE' && event.profileDetails) {
                return {
                  ...event,
                  profileDetails:
                    event.profileDetails as Partial<PlayerProfile>,
                };
              }
              if (
                (event.type === 'ADD_POKEMON_TO_TEAM' ||
                  event.type === 'PRESENT_SUGGESTED_POKEMON_DETAILS') &&
                event.pokemonDetails
              ) {
                const aiProvidedPokemonData = event.pokemonDetails;
                let sanitizedMovesArray: PokemonMoveInstance[] | undefined =
                  undefined;

                if (
                  aiProvidedPokemonData.moves &&
                  Array.isArray(aiProvidedPokemonData.moves)
                ) {
                  sanitizedMovesArray = aiProvidedPokemonData.moves.map(
                    (move: any): PokemonMoveInstance => {
                      let category: '物理' | '特殊' | '变化';
                      if (
                        move.category &&
                        (move.category === '物理' ||
                          move.category === '特殊' ||
                          move.category === '变化')
                      ) {
                        category = move.category;
                      } else if (
                        typeof move.power === 'number' &&
                        move.power > 0
                      ) {
                        category = '物理';
                      } else {
                        category = '变化';
                      }

                      const basePP =
                        typeof move.basePP === 'number' && move.basePP >= 0
                          ? move.basePP
                          : 10;

                      let moveType = PokemonType.NORMAL;
                      if (
                        move.type &&
                        Object.values(PokemonType).includes(
                          move.type as PokemonType
                        )
                      ) {
                        moveType = move.type as PokemonType;
                      } else if (typeof move.type === 'string') {
                        const matchedKey = Object.keys(PokemonType).find(
                          key =>
                            PokemonType[key as keyof typeof PokemonType] ===
                            move.type
                        );
                        if (matchedKey) {
                          moveType =
                            PokemonType[matchedKey as keyof typeof PokemonType];
                        }
                      }

                      return {
                        name: String(move.name || '冲击'),
                        power: Number(move.power || 0),
                        type: moveType,
                        category: category,
                        basePP: Number(basePP),
                        currentPP: Number(move.currentPP ?? basePP),
                        description:
                          typeof move.description === 'string'
                            ? move.description
                            : undefined,
                        effects: Array.isArray(move.effects)
                          ? move.effects.map(eff => ({
                              ...eff,
                              effectString:
                                eff.effectString || '该效果没有额外说明',
                            }))
                          : undefined,
                      };
                    }
                  );
                }
                const finalPokemonDetails: Partial<Pokemon> = {
                  ...(aiProvidedPokemonData as Partial<Omit<Pokemon, 'moves'>>),
                  name: aiProvidedPokemonData.name || '未知宝可梦',
                  moves: sanitizedMovesArray,
                };
                return { ...event, pokemonDetails: finalPokemonDetails };
              }
              if (
                event.type === 'PRESENT_SUGGESTED_ITEM_DETAILS' &&
                event.itemDetails
              ) {
                return {
                  ...event,
                  itemDetails: {
                    ...(event.itemDetails as Partial<InventoryItem>),
                    name: event.itemDetails.name || '未知道具',
                    effectText: event.itemDetails.effectText || '效果未知',
                    description:
                      event.itemDetails.description || '一个神秘的道具',
                  },
                  quantity: event.quantity as number | undefined,
                };
              }
              return event;
            })
            .filter(Boolean) as AIEventTrigger[])
        : undefined;

      let finalChoices: AIStoryChoice[] | undefined = undefined;
      if (Array.isArray(parsedData.choices)) {
        const filteredChoices = parsedData.choices.filter(
          (c: any) =>
            c && typeof c.text === 'string' && typeof c.actionTag === 'string'
        );
        if (filteredChoices.length > 0) {
          finalChoices = filteredChoices.map(c => ({
            ...c,
            text: c.text || '继续',
          })) as AIStoryChoice[];
        }
      }

      let finalSuggestedPlayerReplies: AIStoryChoice[] | undefined = undefined;
      if (Array.isArray(parsedData.suggestedPlayerReplies)) {
        const filteredReplies = parsedData.suggestedPlayerReplies.filter(
          (r: any) =>
            r && typeof r.text === 'string' && typeof r.actionTag === 'string'
        );
        if (filteredReplies.length > 0) {
          finalSuggestedPlayerReplies = filteredReplies.map(r => ({
            ...r,
            text: r.text || '好的',
          })) as AIStoryChoice[];
        }
      }

      const aiResponse: AIStoryResponse = {
        narrative:
          typeof parsedData.narrative === 'string'
            ? parsedData.narrative
            : 'AI正在思考...',
        speaker:
          typeof parsedData.speaker === 'string' ? parsedData.speaker : '旁白',
        imageUrl:
          typeof parsedData.imageUrl === 'string'
            ? parsedData.imageUrl
            : undefined,
        choices: finalChoices,
        events: typedEvents,
        suggestedPlayerReplies: finalSuggestedPlayerReplies,
        itemActionSuggestions: parsedData.itemActionSuggestions, // Added for item suggestions
        regeneratedPokemonImageUrl:
          typeof parsedData.regeneratedPokemonImageUrl === 'string'
            ? parsedData.regeneratedPokemonImageUrl
            : undefined,
        suggestedFullProfileData: parsedData.suggestedFullProfileData,
      };

      const customizationScreenActionTags: AICustomizationScreenActionTag[] = [
        'GENERATE_FULL_RANDOM_PROFILE',
        'GENERATE_RANDOM_STARTER_POKEMON',
        'GENERATE_RANDOM_ITEM',
        'GENERATE_RANDOM_PLAYER_DESCRIPTION',
      ];
      const isStrictCustomizationScreenResponse =
        customizationScreenActionTags.includes(
          playerActionTagOrInputOrSpecializedPrompt as AICustomizationScreenActionTag
        ) && systemPromptOverride === GEMINI_STRICT_ACTION_SYSTEM_PROMPT;
      const isNpcChatResponse =
        systemPromptOverride === GEMINI_NPC_CHAT_SYSTEM_PROMPT;
      const isImageRegenResponse =
        playerActionTagOrInputOrSpecializedPrompt ===
          'USER_REQUESTS_POKEMON_IMAGE_REGENERATION' &&
        systemPromptOverride === GEMINI_STRICT_ACTION_SYSTEM_PROMPT;
      const isCustomizationAssistantCall = isSpecializedAssistantCall;
      const isBattleItemSuggesterCall =
        systemPromptOverride ===
        GEMINI_BATTLE_ITEM_ACTION_SUGGESTOR_SYSTEM_PROMPT;

      if (isBattleItemSuggesterCall) {
        // Ensure narrative and itemActionSuggestions are present as per the system prompt's expectation
        if (!aiResponse.narrative)
          aiResponse.narrative = '你想如何使用此道具？';
        if (!aiResponse.itemActionSuggestions)
          aiResponse.itemActionSuggestions = [];
      } else if (isImageRegenResponse) {
        if (!aiResponse.narrative && aiResponse.regeneratedPokemonImageUrl) {
          aiResponse.narrative = `已为 ${options?.pokemonNameToRegenerate || '宝可梦'} 尝试生成新的图片。`;
        } else if (!aiResponse.regeneratedPokemonImageUrl) {
          aiResponse.narrative = `抱歉，为 ${options?.pokemonNameToRegenerate || '宝可梦'} 生成新图片失败了。`;
        }
        aiResponse.speaker = parsedData.speaker || '系统';
        aiResponse.choices = parsedData.choices || [
          { text: '好的', actionTag: 'CONTINUE_AFTER_IMAGE_REGEN' },
        ];
        aiResponse.events = undefined;
      } else if (isStrictCustomizationScreenResponse) {
        if (!aiResponse.narrative) {
          if (
            playerActionTagOrInputOrSpecializedPrompt ===
            'GENERATE_FULL_RANDOM_PROFILE'
          )
            aiResponse.narrative =
              '已为你生成初始身份信息。你可以在下方调整，或直接开始冒险！';
          else if (
            playerActionTagOrInputOrSpecializedPrompt ===
            'GENERATE_RANDOM_PLAYER_DESCRIPTION'
          )
            aiResponse.narrative = '新的人物说明已生成。';
          else if (
            playerActionTagOrInputOrSpecializedPrompt ===
            'GENERATE_RANDOM_STARTER_POKEMON'
          )
            aiResponse.narrative = '为你随机添加了新的初始宝可梦选项...';
          else if (
            playerActionTagOrInputOrSpecializedPrompt === 'GENERATE_RANDOM_ITEM'
          )
            aiResponse.narrative = '为你随机添加了新的道具选项...';
          else aiResponse.narrative = 'AI 操作已完成。';
        }
        aiResponse.speaker = parsedData.speaker || 'AI提示';
        aiResponse.choices = undefined;
        aiResponse.suggestedPlayerReplies = undefined;
      } else if (isCustomizationAssistantCall) {
        aiResponse.speaker = parsedData.speaker || '定制助手AI';
        if (
          !aiResponse.narrative &&
          (!aiResponse.events || aiResponse.events.length === 0) &&
          (!aiResponse.choices || aiResponse.choices.length === 0) &&
          (!aiResponse.suggestedPlayerReplies ||
            aiResponse.suggestedPlayerReplies.length === 0) &&
          !aiResponse.suggestedFullProfileData
        ) {
          aiResponse.narrative = '我不太明白你的意思，可以换个说法吗？';
        } else if (
          !aiResponse.narrative &&
          ((aiResponse.events && aiResponse.events.length > 0) ||
            aiResponse.suggestedFullProfileData)
        ) {
          aiResponse.narrative = '请看这个建议：';
        }
      } else if (isNpcChatResponse) {
        const npcIdFromTagParts =
          playerActionTagOrInputOrSpecializedPrompt.split('_');
        const npcIdFromTag =
          npcIdFromTagParts.length > 3 ? npcIdFromTagParts[3] : 'unknown_npc';
        const currentNpc = gameState.knownNPCs.find(n => n.id === npcIdFromTag);
        const npcName = currentNpc ? currentNpc.name : 'NPC';

        if (!aiResponse.speaker) {
          aiResponse.speaker = npcName;
        }
        aiResponse.choices = undefined;

        if (playerActionTagOrInputOrSpecializedPrompt.endsWith('_OPEN_CHAT')) {
          if (
            !aiResponse.narrative ||
            aiResponse.narrative.trim() === '' ||
            aiResponse.narrative === '...' ||
            aiResponse.narrative.toLowerCase().includes(npcName.toLowerCase())
          ) {
            aiResponse.narrative = '';
          }
          if (
            !aiResponse.suggestedPlayerReplies ||
            aiResponse.suggestedPlayerReplies.length === 0
          ) {
            aiResponse.suggestedPlayerReplies = [
              {
                text: '你好！',
                actionTag: `PLAYER_TALKS_TO_NPC_${npcIdFromTag}_MESSAGE:你好！`,
              },
              {
                text: '在吗？',
                actionTag: `PLAYER_TALKS_TO_NPC_${npcIdFromTag}_MESSAGE:在吗？`,
              },
            ];
          }
        } else if (aiResponse.narrative && aiResponse.narrative.trim() !== '') {
          if (
            !aiResponse.suggestedPlayerReplies ||
            aiResponse.suggestedPlayerReplies.length === 0
          ) {
            aiResponse.suggestedPlayerReplies = [
              {
                text: '嗯。',
                actionTag: `PLAYER_TALKS_TO_NPC_${npcIdFromTag}_ACKNOWLEDGE`,
              },
            ];
          }
        } else if (
          !aiResponse.narrative &&
          (!aiResponse.suggestedPlayerReplies ||
            aiResponse.suggestedPlayerReplies.length === 0)
        ) {
          aiResponse.narrative = `(${aiResponse.speaker || npcName} 似乎无话可说。)`;
          aiResponse.suggestedPlayerReplies = [
            {
              text: '继续...',
              actionTag: `PLAYER_TALKS_TO_NPC_${npcIdFromTag}_REQUEST_CONTINUATION`,
            },
          ];
        }
      } else {
        if (!aiResponse.speaker && aiResponse.narrative) {
          aiResponse.speaker = '旁白';
        }
        aiResponse.suggestedPlayerReplies = undefined;
        if (aiResponse.narrative && aiResponse.narrative.trim() !== '') {
          if (!aiResponse.choices || aiResponse.choices.length === 0) {
            const systemMessageKeywords = [
              'API密钥',
              '连接AI时',
              'AI似乎遇到了理解上的困难',
              'AI响应的格式似乎有些问题',
            ];
            const isLikelySystemErrorNarrative = systemMessageKeywords.some(
              keyword => aiResponse.narrative.includes(keyword)
            );
            if (!isLikelySystemErrorNarrative) {
              aiResponse.choices = [
                { text: '继续...', actionTag: 'USER_REQUESTS_CONTINUATION' },
              ];
            }
          }
        } else if (
          (!aiResponse.narrative || aiResponse.narrative.trim() === '') &&
          ((aiResponse.choices && aiResponse.choices.length > 0) ||
            (aiResponse.events && aiResponse.events.length > 0))
        ) {
          aiResponse.narrative = '(剧情继续发展...)';
          aiResponse.speaker = aiResponse.speaker || '旁白';
        } else if (
          (!aiResponse.narrative || aiResponse.narrative.trim() === '') &&
          (!aiResponse.choices || aiResponse.choices.length === 0) &&
          (!aiResponse.events || aiResponse.events.length === 0)
        ) {
          aiResponse.narrative = '(AI似乎有些困惑，没有提供明确的下一步。)';
          aiResponse.speaker = aiResponse.speaker || '旁白';
          aiResponse.choices = [
            { text: '尝试继续...', actionTag: 'USER_REQUESTS_CONTINUATION' },
          ];
        }
      }
      return aiResponse;
    } catch (parseError) {
      console.error('Failed to parse JSON response from AI:', parseError);
      console.error('Text attempted for parsing:', jsonText);
      if (jsonText !== rawTrimmedText)
        console.error(
          'Original raw text from AI (before fence removal):',
          rawTrimmedText
        );

      if (retryCount < MAX_RETRIES) {
        if (onRetry) {
          onRetry(retryCount + 1, MAX_RETRIES + 1, 'format');
        }
        await new Promise(resolve =>
          setTimeout(resolve, 750 + retryCount * 250)
        );
        return fetchStoryContinuation(
          gameState,
          playerActionTagOrInputOrSpecializedPrompt,
          options,
          onRetry,
          retryCount + 1,
          systemPromptOverride
        );
      } else {
        return {
          narrative:
            'AI响应的格式似乎有些问题，多次尝试后仍无法正确显示。请尝试重新操作或简化您的请求。',
          speaker: '系统消息',
          choices: [
            { text: '知道了', actionTag: 'ACKNOWLEDGE_AI_FORMAT_ERROR' },
          ],
        };
      }
    }
  } catch (apiError) {
    console.error('Error fetching story from Gemini:', apiError);
    let errorMessage = '连接AI时遇到了一个问题。';
    if (apiError instanceof Error)
      errorMessage += ` 错误信息: ${apiError.message}`;
    return {
      narrative: errorMessage,
      speaker: '系统消息',
      choices: [{ text: '了解', actionTag: 'ACKNOWLEDGE_AI_CONNECTION_ERROR' }],
    };
  }
}

export async function classifyCustomizationIntent(
  userInput: string,
  currentChatHistory: ChatHistoryEntry[],
  gameStateSnapshot: GameState, // For broader context if needed, e.g. current items/pokemon
  onRetry?: OnRetryCallback,
  retryCount = 0
): Promise<ClassifiedIntent | null> {
  if (!API_KEY) {
    console.error('API_KEY not available for intent classification.');
    return {
      intent: 'UNKNOWN_INTENT',
      originalQuery: userInput,
      feedbackToUser: 'AI连接中断，无法解析您的请求。',
    };
  }

  let intentClassifierPrompt = `玩家在宝可梦游戏初始角色自定义界面的聊天框中输入了以下内容。请判断其意图并提取参数。当前自定义状态概述：\n`;
  intentClassifierPrompt += `  - 角色名: ${gameStateSnapshot.playerProfile.name || '未设定'}\n`;
  intentClassifierPrompt += `  - 宝可梦选项: ${gameStateSnapshot.playerTeam.length > 0 ? gameStateSnapshot.playerTeam.map(p => p.name).join(', ') : '无'}\n`;
  intentClassifierPrompt += `  - 道具: ${gameStateSnapshot.inventory.length > 0 ? gameStateSnapshot.inventory.map(i => `${i.name}x${i.quantity}`).join(', ') : '无'}\n`;
  intentClassifierPrompt += `最近对话 (最多3条，所有对话均为中文):\n`;
  currentChatHistory.slice(-3).forEach(entry => {
    intentClassifierPrompt += `    ${entry.speaker}: ${entry.narrative}\n`;
  });
  intentClassifierPrompt += `玩家最新输入 (中文): "${userInput}"\n\n`;
  intentClassifierPrompt += `请严格按照 \`ClassifiedIntent\` JSON格式输出你的分析结果。所有参数中的文本值（如theme, fieldValue中的字符串）必须是中文。`;

  let jsonText = '';
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: intentClassifierPrompt }] }],
      config: {
        systemInstruction: GEMINI_CUSTOMIZATION_INTENT_CLASSIFIER_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        temperature: 0.1,
        topK: 20,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    jsonText = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonText.match(fenceRegex);
    if (match && match[2]) {
      jsonText = match[2].trim();
    }
    const parsed = JSON.parse(jsonText) as ClassifiedIntent;
    if (!parsed.intent) {
      // Basic validation
      throw new Error(
        "Intent classifier returned JSON without an 'intent' field."
      );
    }
    if (!parsed.originalQuery) parsed.originalQuery = userInput; // Ensure originalQuery is always populated
    return parsed;
  } catch (e) {
    console.error('Error classifying customization intent with AI:', e);
    console.error('Text attempted for parsing (Intent Classifier):', jsonText);
    if (retryCount < MAX_RETRIES) {
      if (onRetry) onRetry(retryCount + 1, MAX_RETRIES + 1, 'format');
      await new Promise(resolve => setTimeout(resolve, 500 + retryCount * 250));
      return classifyCustomizationIntent(
        userInput,
        currentChatHistory,
        gameStateSnapshot,
        onRetry,
        retryCount + 1
      );
    }
    return {
      intent: 'UNKNOWN_INTENT',
      originalQuery: userInput,
      feedbackToUser: '解析您的请求时遇到问题，请尝试换一种说法。',
    };
  }
}

export async function fetchMoveDescription(
  moveName: string,
  pokemonName?: string
): Promise<string> {
  if (!API_KEY) {
    return 'AI连接中断，无法获取描述。';
  }
  let userPrompt = `为宝可梦招式“${moveName}”生成一个简短的中文描述。`;
  if (pokemonName) {
    userPrompt += ` 如果这是“${pokemonName}”的专属或特色招式，请在描述中体现。`;
  }
  userPrompt +=
    '描述应简洁（例如，少于60字），适合游戏内显示。确保描述是中文。';

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: GEMINI_MOVE_DESCRIPTION_SYSTEM_PROMPT,
        temperature: 0.5,
        topK: 30,
        topP: 0.9,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    return response.text.trim() || 'AI未能生成描述。';
  } catch (error) {
    console.error(`Error fetching description for move ${moveName}:`, error);
    return '获取招式描述时发生错误。';
  }
}

export async function parsePlayerBattleCommand(
  commandText: string,
  context: BattleCommandParseContext,
  onRetry?: OnRetryCallback,
  retryCount = 0
): Promise<ParsedBattleAction> {
  if (!API_KEY) {
    return {
      actionType: 'UNKNOWN',
      feedbackMessage: 'AI连接中断，无法解析指令。',
    };
  }

  let prompt = 'Context:\n';
  if (context.activePlayerPokemon) {
    prompt += `Player Active Pokémon: ${context.activePlayerPokemon.name} (Instance ID: ${context.activePlayerPokemon.instanceId})\n`;
    prompt += `Active Pokémon Moves: [${context.activePlayerPokemon.moves.map(m => `${m.name} (${m.currentPP}/${m.basePP}PP)`).join(', ')}]\n`;
  } else {
    prompt += 'Player Active Pokémon: None\nActive Pokémon Moves: []\n';
  }
  const switchableTeam = context.playerTeam.filter(
    p =>
      p.instanceId !== context.activePlayerPokemon?.instanceId && !p.isFainted
  );
  prompt += `Player Team (Switchable): [${switchableTeam.map(p => `${p.name} (Instance ID: ${p.instanceId})`).join(', ')}]\n`;
  prompt += `Player Inventory: [${context.inventory.map(i => `${i.name} (ID: ${i.id}, Quantity: ${i.quantity})`).join(', ')}]\n`; // Added quantity
  if (context.enemyPokemon) {
    prompt += `Enemy Pokémon: ${context.enemyPokemon.name} (Instance ID: enemy)\n`; // Added enemy instance ID
  } else {
    prompt += `Enemy Pokémon: None\n`;
  }
  prompt += `\nPlayer Command: "${commandText}" (This command is in Chinese)\n\nYour JSON Response (Ensure any 'feedbackMessage' is in Chinese):`;

  let jsonText = '';
  let rawTrimmedText = '';

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: GEMINI_BATTLE_COMMAND_PARSER_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        temperature: 0.2,
        topK: 20,
        topP: 0.9,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    rawTrimmedText = response.text.trim();
    jsonText = rawTrimmedText;

    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonText.match(fenceRegex);
    if (match && match[2]) {
      jsonText = match[2].trim();
    }

    const parsedData = JSON.parse(jsonText) as ParsedBattleAction;

    if (!parsedData.actionType) {
      throw new Error('Missing actionType in parsed response.');
    }
    if (
      parsedData.feedbackMessage &&
      !/[\u4e00-\u9fa5]/.test(parsedData.feedbackMessage)
    ) {
      console.warn(
        'AI feedbackMessage might not be in Chinese:',
        parsedData.feedbackMessage
      );
      parsedData.feedbackMessage = '处理指令时发生未知错误。';
    }
    if (
      parsedData.actionType === 'NOT_ENOUGH_PP' &&
      context.activePlayerPokemon &&
      parsedData.moveName
    ) {
      const moveInstance = context.activePlayerPokemon.moves.find(
        m => m.name === parsedData.moveName
      );
      if (moveInstance && moveInstance.currentPP > 0) {
        console.warn(
          `AI reported NOT_ENOUGH_PP for ${parsedData.moveName} but it has ${moveInstance.currentPP}/${moveInstance.basePP} PP. Overriding to USE_MOVE.`
        );
        return { actionType: 'USE_MOVE', moveName: parsedData.moveName };
      }
    }
    return parsedData;
  } catch (e) {
    console.error('Error parsing battle command with AI:', e);
    console.error('AI Raw Response (if available):', rawTrimmedText || 'N/A');
    console.error('Attempted JSON for parsing:', jsonText);
    if (retryCount < MAX_RETRIES) {
      if (onRetry) {
        onRetry(retryCount + 1, MAX_RETRIES + 1, 'format');
      }
      await new Promise(resolve => setTimeout(resolve, 500 + retryCount * 250));
      return parsePlayerBattleCommand(
        commandText,
        context,
        onRetry,
        retryCount + 1
      );
    }
    return {
      actionType: 'UNKNOWN',
      feedbackMessage:
        'AI对战斗指令的响应格式似乎有问题，多次尝试后仍无法解析。请重试或使用按钮操作。',
    };
  }
}

export async function fetchBattleItemActionSuggestions(
  itemName: string,
  activePlayerPokemon: Pokemon,
  enemyPokemon: Pokemon,
  benchedPlayerPokemon: Pokemon[],
  onRetry?: OnRetryCallback,
  retryCount = 0
): Promise<AIStoryResponse> {
  if (!API_KEY) {
    return {
      narrative: 'AI连接中断，无法获取道具建议。',
      itemActionSuggestions: [],
    };
  }

  const simplifiedActivePlayerPokemon = {
    name: activePlayerPokemon.name,
    instanceId: activePlayerPokemon.instanceId,
    currentHp: activePlayerPokemon.currentHp,
    maxHp: activePlayerPokemon.maxHp,
    statusConditions: activePlayerPokemon.statusConditions.map(sc => ({
      condition: sc.condition,
    })) as ActiveStatusCondition[], // Only send condition
  };
  const simplifiedEnemyPokemon = {
    name: enemyPokemon.name,
    instanceId: 'enemy', // Enemy always has "enemy" as instanceId for suggestions
    currentHp: enemyPokemon.currentHp,
    maxHp: enemyPokemon.maxHp,
    statusConditions: enemyPokemon.statusConditions.map(sc => ({
      condition: sc.condition,
    })) as ActiveStatusCondition[],
  };
  const simplifiedBenchedPlayerPokemon = benchedPlayerPokemon.map(p => ({
    name: p.name,
    instanceId: p.instanceId,
    currentHp: p.currentHp,
    maxHp: p.maxHp,
    statusConditions: p.statusConditions.map(sc => ({
      condition: sc.condition,
    })) as ActiveStatusCondition[],
  }));

  const prompt = `
Input Context:
Item Name (Chinese): "${itemName}"
Active Player Pokémon: ${JSON.stringify(simplifiedActivePlayerPokemon)}
Benched Player Pokémon: ${JSON.stringify(simplifiedBenchedPlayerPokemon)}
Enemy Pokémon: ${JSON.stringify(simplifiedEnemyPokemon)}

Please provide item action suggestions based on this context.
  `;

  let jsonText = '';
  let rawTrimmedText = '';

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: GEMINI_BATTLE_ITEM_ACTION_SUGGESTOR_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        temperature: 0.2,
        topK: 20,
        topP: 0.9,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    rawTrimmedText = response.text.trim();
    jsonText = rawTrimmedText;
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonText.match(fenceRegex);
    if (match && match[2]) {
      jsonText = match[2].trim();
    }

    const parsedData = JSON.parse(jsonText) as AIStoryResponse;

    // Basic validation of the response structure expected from the prompt
    if (
      !parsedData.narrative ||
      !Array.isArray(parsedData.itemActionSuggestions)
    ) {
      throw new Error(
        'AI response for item suggestions is missing narrative or itemActionSuggestions array.'
      );
    }
    parsedData.itemActionSuggestions = parsedData.itemActionSuggestions.filter(
      (s: AIStoryChoice) =>
        s && typeof s.text === 'string' && typeof s.actionTag === 'string'
    );

    return parsedData;
  } catch (e) {
    console.error('Error fetching battle item action suggestions from AI:', e);
    console.error('AI Raw Response (Item Suggester):', rawTrimmedText || 'N/A');
    console.error('Attempted JSON for parsing (Item Suggester):', jsonText);
    if (retryCount < MAX_RETRIES) {
      if (onRetry) {
        onRetry(retryCount + 1, MAX_RETRIES + 1, 'format');
      }
      await new Promise(resolve => setTimeout(resolve, 500 + retryCount * 250));
      return fetchBattleItemActionSuggestions(
        itemName,
        activePlayerPokemon,
        enemyPokemon,
        benchedPlayerPokemon,
        onRetry,
        retryCount + 1
      );
    }
    return {
      narrative: 'AI获取道具使用建议时出现格式问题，请稍后再试或手动操作。',
      itemActionSuggestions: [],
    };
  }
}
