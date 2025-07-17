import { useState, useCallback, useEffect } from 'react';
import {
  GameState,
  GameMode,
  PlayerProfile,
  Pokemon,
  AIEventTrigger,
  InventoryItem,
  AIStoryChoice,
  StoryChoice,
  ChatHistoryEntry,
  NPC,
  CustomizedStartData,
  AICustomizationScreenActionTag,
  LoadingStatus,
  ClassifiedIntent,
  FullProfileSuggestionData,
  UserDateTimeInput,
  ProfileDataForTimeSuggestion,
  BattleRecord,
  BattleChatMessage,
} from '../types';
import {
  INITIAL_GAME_STATE,
  STORY_DATA,
  GEMINI_GAME_MASTER_SYSTEM_PROMPT,
  GEMINI_STRICT_ACTION_SYSTEM_PROMPT,
  GEMINI_NPC_CHAT_SYSTEM_PROMPT,
  // New specialized assistant prompts:
  GEMINI_FULL_PROFILE_CREATOR_SYSTEM_PROMPT,
  GEMINI_STARTER_POKEMON_SUGGESTOR_SYSTEM_PROMPT,
  GEMINI_STARTER_ITEM_SUGGESTOR_SYSTEM_PROMPT,
  GEMINI_PROFILE_FIELD_ADVISOR_SYSTEM_PROMPT,
  GEMINI_OBJECTIVE_LOCATION_MONEY_ADVISOR_SYSTEM_PROMPT,
  GEMINI_GAME_TIME_ADVISOR_SYSTEM_PROMPT,
  GEMINI_DYNAMIC_GAME_TIME_SUGGESTOR_SYSTEM_PROMPT, // Added
  GEMINI_RANDOM_DESCRIPTION_GENERATOR_ASSISTANT_PROMPT,
  GEMINI_GENERAL_CUSTOMIZATION_CHAT_SYSTEM_PROMPT,
} from '../constants';
import {
  fetchStoryContinuation,
  fetchStoryContinuationStream,
  classifyCustomizationIntent,
  OnRetryCallback,
  OnStreamCallback,
} from '../services/geminiService'; // Added classifyCustomizationIntent
import {
  sanitizePokemonData,
  sanitizeNPCData,
  sanitizeItemData,
} from '../utils/dataSanitizers';
import {
  saveGameState,
  loadGameState,
  getSavedGames,
  deleteGameState,
} from '../utils/gameStateStorage';

// Helper to convert UserDateTimeInput to a Unix timestamp
const userDateTimeToTimestamp = (input: UserDateTimeInput): number => {
  let jsYear = input.year;
  // For UserDateTimeInput, year field: positive for AD, negative for BC (e.g. -100 for 100 BC)
  // JS Date: year 0 is 1 BC (displayed as -1 in input), year -1 is 2 BC (displayed as -2).
  // If input.year is 2024 (AD) -> jsYear = 2024
  // If input.year is -1 (1 BC) -> jsYear = 0
  // If input.year is -100 (100 BC) -> jsYear = -99
  // So, if input.year is negative (BC), actual JS year = input.year + 1, unless input.year is already 0 (1BC)
  // Correct mapping from user input year (where -N means N BC) to JS Date year:
  // User input 2024 -> JS year 2024
  // User input -1 (for 1 BC) -> JS year 0
  // User input -50 (for 50 BC) -> JS year -49
  if (input.year <= 0) {
    // If user entered a negative year or 0 (intending BC)
    jsYear = input.year + (input.year === 0 ? 0 : 1); // this is faulty logic for BC
    // Corrected:
    // If user types "1" and means 1 AD, jsYear is 1.
    // If user types "-1" and means 1 BC, jsYear needs to be 0.
    // If user types "-50" and means 50 BC, jsYear needs to be -49.
    // So, if input.year from form (string 'year') is < 0, then jsYear is input.year + 1.
    // If input.year is 0, it's problematic. Assume 1 AD if 0.
    // The 'year' in UserDateTimeInput here is already the processed number.
    // Let's assume `input.year` IS the JS compatible year from `parseTimestampToUserDateTimeInput` or direct user input.
    jsYear = input.year; // This 'year' should be JS Date compatible.
  }

  const jsMonth = input.month - 1; // Month in UserDateTimeInput is 1-12, JS Date needs 0-11
  return new Date(
    jsYear,
    jsMonth,
    input.day,
    input.hour,
    input.minute
  ).getTime();
};

export const useGameLogic = () => {
  const [gameState, setGameState] = useState<GameState>(INITIAL_GAME_STATE);
  const [savedGames, setSavedGames] = useState<Awaited<ReturnType<typeof getSavedGames>>>([]);
  const [isLoadingFromSave, setIsLoadingFromSave] = useState(true); // Start true
  const [currentStaticSegmentId, setCurrentStaticSegmentId] = useState<string>(
    'INITIAL_PROFILE_PREPARATION'
  );
  const [hasAttemptedInitialLoad, setHasAttemptedInitialLoad] =
    useState<boolean>(false);

  const advanceGameTimeInternal = (
    currentTs: number,
    options: { minutes?: number; hours?: number }
  ): number => {
    const date = new Date(currentTs);
    if (options.minutes) date.setMinutes(date.getMinutes() + options.minutes);
    if (options.hours) date.setHours(date.getHours() + options.hours);
    return date.getTime();
  };

  const updateGameState = useCallback(
    (
      updater: (prevState: GameState) => GameState,
      timeAdvanceOptions?: { minutes?: number; hours?: number }
    ) => {
      setGameState(prev => {
        const newState = updater(prev);
        if (newState.gameMode === GameMode.ADVENTURE && timeAdvanceOptions) {
          const newTime = advanceGameTimeInternal(
            newState.currentGameTime,
            timeAdvanceOptions
          );
          return { ...newState, currentGameTime: newTime };
        }
        return newState;
      });
    },
    []
  );

  const processAIEvent = useCallback(
    (
      currentState: GameState,
      event: AIEventTrigger,
      isNPCContext: boolean = false,
      customizationScreenActionTag?: AICustomizationScreenActionTag
    ): GameState => {
      let newPlayerTeam = [...currentState.playerTeam];
      const newInventory = [...currentState.inventory];
      let newMoney = currentState.money;
      let newObjective = currentState.currentObjective;
      let newLocation = currentState.currentLocationDescription;
      let newAreaMap = currentState.currentAreaMap;
      const newGlobalAreaMap = { ...currentState.globalAreaMap };
      const newKnownNPCs = [...currentState.knownNPCs];
      const currentSceneToUpdate = currentState.currentAIScene
        ? { ...currentState.currentAIScene }
        : { narrative: '', choices: [] };
      let newPlayerProfile = { ...currentState.playerProfile };
      const newAiSuggestedGameStartTime = currentState.aiSuggestedGameStartTime;

      if (
        event.message &&
        currentSceneToUpdate &&
        !isNPCContext &&
        currentState.gameMode !== GameMode.CUSTOMIZE_RANDOM_START
      ) {
        currentSceneToUpdate.narrative =
          (currentSceneToUpdate.narrative || '') + `\n\n(${event.message})`;
      }

      switch (event.type) {
        case 'SET_PLAYER_PROFILE':
          if (event.profileDetails) {
            newPlayerProfile = {
              ...newPlayerProfile,
              name:
                event.profileDetails.name !== undefined
                  ? event.profileDetails.name
                  : newPlayerProfile.name,
              gender:
                event.profileDetails.gender !== undefined
                  ? event.profileDetails.gender
                  : newPlayerProfile.gender,
              age:
                event.profileDetails.age !== undefined
                  ? event.profileDetails.age
                  : newPlayerProfile.age,
              description:
                event.profileDetails.description !== undefined
                  ? event.profileDetails.description
                  : newPlayerProfile.description,
              stamina:
                event.profileDetails.stamina !== undefined
                  ? event.profileDetails.stamina
                  : newPlayerProfile.stamina,
              maxStamina:
                event.profileDetails.maxStamina !== undefined
                  ? event.profileDetails.maxStamina
                  : newPlayerProfile.maxStamina,
              energy:
                event.profileDetails.energy !== undefined
                  ? event.profileDetails.energy
                  : newPlayerProfile.energy,
              maxEnergy:
                event.profileDetails.maxEnergy !== undefined
                  ? event.profileDetails.maxEnergy
                  : newPlayerProfile.maxEnergy,
              healthStatus:
                event.profileDetails.healthStatus !== undefined
                  ? event.profileDetails.healthStatus
                  : newPlayerProfile.healthStatus,
            };
            if (
              customizationScreenActionTag === 'GENERATE_FULL_RANDOM_PROFILE' ||
              customizationScreenActionTag ===
                'GENERATE_RANDOM_PLAYER_DESCRIPTION'
            ) {
              if (newPlayerProfile.name === undefined)
                newPlayerProfile.name = '探险者';
              if (newPlayerProfile.gender === undefined)
                newPlayerProfile.gender = '男';
              if (newPlayerProfile.age === undefined) newPlayerProfile.age = 16;
              if (newPlayerProfile.description === undefined)
                newPlayerProfile.description = '一位充满好奇心的冒险者。';
              if (newPlayerProfile.stamina === undefined)
                newPlayerProfile.stamina =
                  INITIAL_GAME_STATE.playerProfile.stamina!;
              if (newPlayerProfile.maxStamina === undefined)
                newPlayerProfile.maxStamina =
                  INITIAL_GAME_STATE.playerProfile.maxStamina!;
              if (newPlayerProfile.energy === undefined)
                newPlayerProfile.energy =
                  INITIAL_GAME_STATE.playerProfile.energy!;
              if (newPlayerProfile.maxEnergy === undefined)
                newPlayerProfile.maxEnergy =
                  INITIAL_GAME_STATE.playerProfile.maxEnergy!;
              if (newPlayerProfile.healthStatus === undefined)
                newPlayerProfile.healthStatus =
                  INITIAL_GAME_STATE.playerProfile.healthStatus!;
            }
          }
          break;
        case 'GIVE_ITEM':
          if (event.itemDetails) {
            const aiItem = sanitizeItemData(event.itemDetails);
            const quantityToAdd = event.quantity || aiItem.quantity || 1;
            const existingItemIndex = newInventory.findIndex(
              i => i.id === aiItem.id || i.name === aiItem.name
            );
            if (existingItemIndex > -1) {
              newInventory[existingItemIndex].quantity += quantityToAdd;
            } else {
              newInventory.push({ ...aiItem, quantity: quantityToAdd });
            }
          }
          break;
        case 'START_BATTLE':
          if (event.enemyPokemonDetails) {
            const enemyFromAI = sanitizePokemonData(event.enemyPokemonDetails);
            return {
              ...currentState,
              playerProfile: newPlayerProfile,
              playerTeam: newPlayerTeam,
              inventory: newInventory,
              money: newMoney,
              currentObjective: newObjective,
              currentLocationDescription: newLocation,
              currentAreaMap: newAreaMap,
              globalAreaMap: newGlobalAreaMap,
              knownNPCs: newKnownNPCs,
              aiSuggestedGameStartTime: newAiSuggestedGameStartTime,
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
          break;
        case 'UPDATE_MONEY':
          if (customizationScreenActionTag === 'GENERATE_FULL_RANDOM_PROFILE') {
            newMoney = event.quantity || 0;
          } else if (
            event.quantity &&
            event.quantity !== currentState.money &&
            currentState.gameMode === GameMode.ADVENTURE
          ) {
            newMoney = currentState.money + (event.quantity || 0);
          } else if (
            currentState.gameMode === GameMode.CUSTOMIZE_RANDOM_START
          ) {
            newMoney = event.quantity ?? newMoney;
          }
          break;
        case 'HEAL_TEAM':
          newPlayerTeam = newPlayerTeam.map(p => ({
            ...p,
            currentHp: p.maxHp,
            moves: p.moves.map(m => ({ ...m, currentPP: m.basePP })),
            isFainted: false,
            statusConditions: [],
            statStageModifiers: [],
          }));
          break;
        case 'UPDATE_OBJECTIVE':
          if (event.newObjective) newObjective = event.newObjective;
          break;
        case 'UPDATE_LOCATION':
          if (
            event.newLocation &&
            typeof event.newLocation === 'string' &&
            event.newLocation.trim() !== ''
          ) {
            newLocation = event.newLocation.trim();
            if (event.mapData) {
              newAreaMap = event.mapData;
              newGlobalAreaMap[newLocation] = event.mapData;
            }
          } else if (event.mapData) {
            newAreaMap = event.mapData;
            const currentLocKey =
              currentState.currentLocationDescription.trim();
            if (currentLocKey) newGlobalAreaMap[currentLocKey] = event.mapData;
          }
          break;
        case 'UPDATE_AREA_MAP':
          if (event.mapData) {
            newAreaMap = event.mapData;
            const currentLocKey =
              currentState.currentLocationDescription.trim();
            if (currentLocKey) newGlobalAreaMap[currentLocKey] = event.mapData;
          }
          break;
        case 'ADD_POKEMON_TO_TEAM':
          if (event.pokemonDetails) {
            const newPokemonFromAI = sanitizePokemonData(event.pokemonDetails);
            newPlayerTeam.push({
              ...newPokemonFromAI,
              isPlayerOwned: true,
              currentHp: newPokemonFromAI.maxHp,
              isFainted: false,
              statusConditions: [],
              statStageModifiers: [],
            });
          }
          break;
        case 'INTRODUCE_NPC':
          if (event.npcDetails) {
            const newNPC = sanitizeNPCData(event.npcDetails);
            const existingNPC = newKnownNPCs.find(npc => npc.id === newNPC.id);
            if (!existingNPC) {
              newKnownNPCs.push(newNPC);
            }
          }
          break;
        case 'UPDATE_NPC_RELATIONSHIP':
          if (event.npcId && event.newRelationshipStatus) {
            const npcIndex = newKnownNPCs.findIndex(
              npc => npc.id === event.npcId
            );
            if (npcIndex > -1) {
              newKnownNPCs[npcIndex].relationshipStatus =
                event.newRelationshipStatus;
            }
          }
          break;
      }
      return {
        ...currentState,
        playerProfile: newPlayerProfile,
        playerTeam: newPlayerTeam,
        inventory: newInventory,
        money: newMoney,
        currentObjective: newObjective,
        currentLocationDescription: newLocation,
        currentAreaMap: newAreaMap,
        globalAreaMap: newGlobalAreaMap,
        knownNPCs: newKnownNPCs,
        aiSuggestedGameStartTime: newAiSuggestedGameStartTime,
        currentAIScene:
          isNPCContext ||
          currentState.gameMode === GameMode.CUSTOMIZE_RANDOM_START
            ? currentState.currentAIScene
            : currentSceneToUpdate,
      };
    },
    [sanitizePokemonData, sanitizeNPCData, sanitizeItemData]
  );

  const triggerAIStory = useCallback(
    async (
      playerActionTagOrInput?: string,
      isCustomizationScreenActionContext: boolean = false,
      imageRegenContext?: {
        pokemonInstanceIdToRegenerate: string;
        pokemonNameToRegenerate: string;
      }
    ) => {
      const currentActionIsForCustomizationScreen =
        isCustomizationScreenActionContext ||
        (playerActionTagOrInput
          ? [
              'GENERATE_FULL_RANDOM_PROFILE',
              'GENERATE_RANDOM_STARTER_POKEMON',
              'GENERATE_RANDOM_ITEM',
              'GENERATE_RANDOM_PLAYER_DESCRIPTION',
            ].includes(playerActionTagOrInput)
          : false);

      let systemPromptToUse = GEMINI_GAME_MASTER_SYSTEM_PROMPT;
      if (
        playerActionTagOrInput === 'USER_REQUESTS_POKEMON_IMAGE_REGENERATION' ||
        currentActionIsForCustomizationScreen
      ) {
        systemPromptToUse = GEMINI_STRICT_ACTION_SYSTEM_PROMPT;
      }

      updateGameState(prev => ({
        ...prev,
        aiLoadingStatus: { status: 'loading', message: 'AI 正在思考...' },
        currentAIScene:
          prev.currentAIScene &&
          playerActionTagOrInput !== 'ACKNOWLEDGE_BATTLE_START' &&
          playerActionTagOrInput !== 'CONFIRMED_STATIC_BATTLE_FINAL'
            ? {
                ...prev.currentAIScene,
                choices: [],
                suggestedPlayerReplies: [],
              }
            : null,
        customizationAssistantResponse: currentActionIsForCustomizationScreen
          ? null
          : prev.customizationAssistantResponse,
        pokemonInstanceIdToRegenerate:
          imageRegenContext?.pokemonInstanceIdToRegenerate,
        pokemonNameToRegenerate: imageRegenContext?.pokemonNameToRegenerate,
      }));

      const fetchOptions = imageRegenContext
        ? {
            pokemonInstanceIdToRegenerate:
              imageRegenContext.pokemonInstanceIdToRegenerate,
            pokemonNameToRegenerate: imageRegenContext.pokemonNameToRegenerate,
          }
        : undefined;

      const handleRetryCallback: OnRetryCallback = (attempt, maxAttempts) => {
        updateGameState(prev => ({
          ...prev,
          aiLoadingStatus: {
            status: 'retrying_format_error',
            message: `AI响应格式错误，正在重试 (尝试 ${attempt}/${maxAttempts})...`,
          },
        }));
      };

      const handleStreamCallback: OnStreamCallback = (
        _partialResponse: string
      ) => {
        // For streaming responses, we could update a partial narrative in the UI
        // For now, we'll just update the loading status to show streaming is active
        updateGameState(prev => ({
          ...prev,
          aiLoadingStatus: {
            status: 'loading',
            message: 'AI正在回复中... (流式传输)',
          },
        }));
      };

      const stateForAIContext = { ...gameState };

      let aiResponse;
      // Use streaming for main story interactions, but not for customization actions
      // which typically need complete responses for proper processing
      if (!currentActionIsForCustomizationScreen && !imageRegenContext) {
        aiResponse = await fetchStoryContinuationStream(
          stateForAIContext,
          playerActionTagOrInput || '',
          handleStreamCallback,
          fetchOptions,
          handleRetryCallback,
          0,
          systemPromptToUse
        );
      } else {
        aiResponse = await fetchStoryContinuation(
          stateForAIContext,
          playerActionTagOrInput || '',
          fetchOptions,
          handleRetryCallback,
          0,
          systemPromptToUse
        );
      }

      const localAiResponse = { ...aiResponse };
      let newAiSuggestedStartTimeFromThisResponse: number | undefined =
        undefined;

      if (
        currentActionIsForCustomizationScreen &&
        playerActionTagOrInput === 'GENERATE_FULL_RANDOM_PROFILE' &&
        localAiResponse.suggestedFullProfileData?.suggestedGameStartTime
      ) {
        newAiSuggestedStartTimeFromThisResponse =
          localAiResponse.suggestedFullProfileData.suggestedGameStartTime;
      }

      let timeAdvanceOptions: { minutes?: number; hours?: number } = {
        minutes: Math.floor(Math.random() * 11) + 5,
      };
      if (
        localAiResponse.events &&
        localAiResponse.events.some(e => e.type === 'UPDATE_LOCATION')
      ) {
        timeAdvanceOptions = { minutes: Math.floor(Math.random() * 31) + 30 };
      }
      if (
        playerActionTagOrInput === 'START_ADVENTURE_WITH_CUSTOMIZED_PROFILE'
      ) {
        timeAdvanceOptions = { minutes: 0 };
      }

      updateGameState(prev => {
        let newState: GameState = {
          ...prev,
          aiLoadingStatus: { status: 'idle' } as LoadingStatus,
        };
        const isNpcChatResponse = playerActionTagOrInput?.startsWith(
          'PLAYER_TALKS_TO_NPC_'
        );

        if (newAiSuggestedStartTimeFromThisResponse !== undefined) {
          newState.aiSuggestedGameStartTime =
            newAiSuggestedStartTimeFromThisResponse;
        }

        if (
          playerActionTagOrInput ===
            'USER_REQUESTS_POKEMON_IMAGE_REGENERATION' &&
          localAiResponse.regeneratedPokemonImageUrl &&
          prev.pokemonInstanceIdToRegenerate
        ) {
          const instanceId = prev.pokemonInstanceIdToRegenerate;
          const newUrl = localAiResponse.regeneratedPokemonImageUrl;
          let pokemonNameForLog = prev.pokemonNameToRegenerate || '宝可梦';

          let foundAndUpdated = false;
          newState.playerTeam = newState.playerTeam.map(p => {
            if (p.instanceId === instanceId) {
              pokemonNameForLog = p.name;
              foundAndUpdated = true;
              return { ...p, imageUrl: newUrl };
            }
            return p;
          });
          if (newState.currentBattleEnemy?.instanceId === instanceId) {
            pokemonNameForLog = newState.currentBattleEnemy.name;
            newState.currentBattleEnemy = {
              ...newState.currentBattleEnemy,
              imageUrl: newUrl,
            };
            foundAndUpdated = true;
          }
          if (newState.customizationAssistantResponse?.events) {
            newState.customizationAssistantResponse.events =
              newState.customizationAssistantResponse.events.map(e => {
                if (
                  e.type === 'PRESENT_SUGGESTED_POKEMON_DETAILS' &&
                  e.pokemonDetails?.instanceId === instanceId
                ) {
                  pokemonNameForLog =
                    e.pokemonDetails.name || pokemonNameForLog;
                  foundAndUpdated = true;
                  return {
                    ...e,
                    pokemonDetails: { ...e.pokemonDetails, imageUrl: newUrl },
                  };
                }
                return e;
              });
          }
          if (foundAndUpdated) {
            const imageUpdateMessage: ChatHistoryEntry = {
              id: `img-regen-${Date.now()}`,
              timestamp: Date.now(),
              speaker: '系统',
              narrative: `${pokemonNameForLog} 的图片已尝试更新。`,
              type: 'system',
            };
            newState.chatHistory = [
              ...newState.chatHistory,
              imageUpdateMessage,
            ];
          }
          newState.currentAIScene = {
            narrative:
              localAiResponse.narrative ||
              `${pokemonNameForLog} 的图片已尝试更新。`,
            speaker: localAiResponse.speaker || '系统',
            choices: localAiResponse.choices || [
              { text: '好的', actionTag: 'CONTINUE_AFTER_IMAGE_REGEN' },
            ],
          };
          newState.pokemonInstanceIdToRegenerate = undefined;
          newState.pokemonNameToRegenerate = undefined;
          return newState;
        }

        if (localAiResponse.events) {
          localAiResponse.events.forEach(event => {
            newState = processAIEvent(
              newState,
              event,
              isNpcChatResponse,
              currentActionIsForCustomizationScreen
                ? (playerActionTagOrInput as AICustomizationScreenActionTag)
                : undefined
            );
          });
        }

        if (
          currentActionIsForCustomizationScreen &&
          playerActionTagOrInput === 'GENERATE_FULL_RANDOM_PROFILE'
        ) {
          newState.initialProfileGenerated = true;
        }
        if (
          playerActionTagOrInput === 'START_ADVENTURE_WITH_CUSTOMIZED_PROFILE'
        ) {
          newState.gameMode = GameMode.ADVENTURE;
          // Game time setting is handled by handleStartAdventureWithCustomizedProfile based on UserDateTimeInput
        }

        if (isNpcChatResponse) {
          // NPC chat responses are handled by handleSendPlayerMessageToNPC and fetchInitialNPCDialogueAndOrSuggestions
        } else if (newState.gameMode === GameMode.CUSTOMIZE_RANDOM_START) {
          newState.currentAIScene = localAiResponse;
        } else {
          newState.currentAIScene = {
            narrative: localAiResponse.narrative || '',
            speaker: localAiResponse.speaker,
            imageUrl: localAiResponse.imageUrl,
            choices: localAiResponse.choices,
            suggestedPlayerReplies: undefined,
          };

          if (
            newState.currentAIScene &&
            newState.currentAIScene.narrative &&
            newState.currentAIScene.narrative.trim() !== ''
          ) {
            const aiSpeaker = newState.currentAIScene.speaker || '旁白';
            const entryType =
              aiSpeaker === '系统消息' ||
              aiSpeaker === '系统提示' ||
              aiSpeaker === '系统错误'
                ? 'system'
                : 'ai';
            const aiHistoryEntry: ChatHistoryEntry = {
              id: `${Date.now()}-${entryType}-${Math.random().toString(36).substr(2, 9)}`,
              timestamp: Date.now(),
              speaker: aiSpeaker,
              narrative: newState.currentAIScene.narrative,
              type: entryType,
            };
            const lastEntry =
              newState.chatHistory.length > 0
                ? newState.chatHistory[newState.chatHistory.length - 1]
                : null;
            if (
              !(
                (entryType === 'system' &&
                  lastEntry &&
                  lastEntry.type === 'system' &&
                  lastEntry.narrative === aiHistoryEntry.narrative &&
                  Date.now() - lastEntry.timestamp < 2000) ||
                (entryType === 'ai' &&
                  lastEntry &&
                  lastEntry.type === 'ai' &&
                  lastEntry.narrative === aiHistoryEntry.narrative &&
                  lastEntry.speaker === aiSpeaker &&
                  Date.now() - lastEntry.timestamp < 1000)
              )
            ) {
              newState.chatHistory = [...newState.chatHistory, aiHistoryEntry];
            }

            if (
              (!newState.currentAIScene.choices ||
                newState.currentAIScene.choices.length === 0) &&
              (!newState.currentAIScene.suggestedPlayerReplies ||
                newState.currentAIScene.suggestedPlayerReplies.length === 0) &&
              playerActionTagOrInput !==
                'USER_REQUESTS_POKEMON_IMAGE_REGENERATION' &&
              playerActionTagOrInput !== 'ACKNOWLEDGE_BATTLE_START' &&
              playerActionTagOrInput !== 'CONFIRMED_STATIC_BATTLE_FINAL' &&
              !entryType.includes('system')
            ) {
              newState.currentAIScene.choices = [
                { text: '继续...', actionTag: 'USER_REQUESTS_CONTINUATION' },
              ];
            }
          }
        }
        newState.pokemonInstanceIdToRegenerate = undefined;
        newState.pokemonNameToRegenerate = undefined;
        return newState;
      }, timeAdvanceOptions);
    },
    [gameState, updateGameState, processAIEvent, sanitizePokemonData]
  );

  const advanceStaticStory = useCallback(
    (segmentId: string) => {
      const newSegment = STORY_DATA[segmentId];
      if (newSegment) {
        setCurrentStaticSegmentId(segmentId);
        updateGameState(
          prev => {
            let tempState: GameState = {
              ...prev,
              currentAIScene: null,
              customizationAssistantResponse: null,
              aiLoadingStatus: { status: 'idle' } as LoadingStatus,
            };

            let resolvedSpeaker: string | undefined =
              typeof newSegment.speaker === 'function'
                ? newSegment.speaker(tempState.playerProfile)
                : newSegment.speaker;
            let resolvedText: string =
              typeof newSegment.text === 'function'
                ? newSegment.text(tempState.playerProfile, tempState.playerTeam)
                : newSegment.text;

            if (
              segmentId === 'CONFIRM_STATIC_BATTLE_SEGMENT' &&
              tempState.pendingBattleDetails
            ) {
              const originalTriggerSegmentId =
                tempState.pendingBattleDetails.battleReturnSegmentWin ===
                'BATTLE_WON_DEFAULT'
                  ? Object.keys(STORY_DATA).find(
                      key =>
                        STORY_DATA[key]?.triggerBattle?.winSegmentId ===
                        tempState.pendingBattleDetails?.battleReturnSegmentWin
                    )
                  : tempState.pendingBattleDetails.battleReturnSegmentWin.replace(
                      'WIN_',
                      'SEG_'
                    );

              const originalSegment =
                STORY_DATA[
                  originalTriggerSegmentId ||
                    prev.currentBattlePlayerPokemonId ||
                    ''
                ];
              if (originalSegment) {
                resolvedText =
                  typeof originalSegment.text === 'function'
                    ? originalSegment.text(
                        tempState.playerProfile,
                        tempState.playerTeam
                      )
                    : originalSegment.text;
                resolvedSpeaker =
                  typeof originalSegment.speaker === 'function'
                    ? originalSegment.speaker(tempState.playerProfile)
                    : originalSegment.speaker;
              } else {
                resolvedText = `与 ${tempState.pendingBattleDetails.enemyPokemon.name} 的战斗即将开始！`;
                resolvedSpeaker = '系统';
              }
            }

            if (newSegment.onLoad) {
              const tempUpdater = (
                updaterFn: (prevState: GameState) => GameState
              ) => {
                tempState = updaterFn(tempState);
              };
              newSegment.onLoad!(tempUpdater);
            }

            let updatedChatHistory = tempState.chatHistory;
            const shouldLogStaticText =
              resolvedText &&
              resolvedText.trim() !== '' &&
              !newSegment.isAIHandoff;

            if (shouldLogStaticText) {
              const staticHistoryEntry: ChatHistoryEntry = {
                id: `${Date.now()}-static-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: Date.now(),
                speaker: resolvedSpeaker || '旁白',
                narrative: resolvedText,
                type: 'static',
              };
              if (
                !updatedChatHistory.find(
                  entry =>
                    entry.narrative === resolvedText &&
                    entry.speaker === resolvedSpeaker &&
                    entry.type === 'static' &&
                    Date.now() - entry.timestamp < 1000
                )
              ) {
                updatedChatHistory = [
                  ...tempState.chatHistory,
                  staticHistoryEntry,
                ];
              }
            }
            tempState = { ...tempState, chatHistory: updatedChatHistory };
            return tempState;
          },
          { minutes: Math.floor(Math.random() * 6) + 5 }
        );

        if (newSegment.isAIHandoff) {
          triggerAIStory(
            newSegment.actionTag || 'CONTINUE_AFTER_STATIC_SEGMENT'
          );
        } else if (
          !newSegment.choices &&
          newSegment.nextSegmentId &&
          !newSegment.isAIHandoff
        ) {
          setTimeout(() => advanceStaticStory(newSegment.nextSegmentId!), 50);
        }
      } else {
        console.error(
          `Static story segment "${segmentId}" not found. Attempting AI recovery.`
        );
        updateGameState(prev => {
          const errorEntry: ChatHistoryEntry = {
            id: `${Date.now()}-error`,
            timestamp: Date.now(),
            speaker: '系统错误',
            narrative: `无法找到剧情片段: ${segmentId}。尝试AI恢复。`,
            type: 'system',
          };
          return { ...prev, chatHistory: [...prev.chatHistory, errorEntry] };
        });
        triggerAIStory('ERROR_STATIC_SEGMENT_NOT_FOUND');
      }
    },
    [updateGameState, triggerAIStory]
  );

  const handleStaticStoryChoice = useCallback(
    (choice: StoryChoice) => {
      const playerChoiceNarrative = choice.text;
      updateGameState(
        prev => ({
          ...prev,
          chatHistory: [
            ...prev.chatHistory,
            {
              id: `${Date.now()}-schoice-${Math.random().toString(36).substr(2, 9)}`,
              timestamp: Date.now(),
              speaker: prev.playerProfile.name || '玩家',
              narrative: playerChoiceNarrative,
              type: 'player_input',
            },
          ],
        }),
        { minutes: Math.floor(Math.random() * 3) + 1 }
      );

      if (choice.action) choice.action(updateGameState);

      if (choice.isBattleTrigger) {
        const currentSegment = STORY_DATA[currentStaticSegmentId];
        if (currentSegment?.triggerBattle) {
          updateGameState(prev => ({
            ...prev,
            pendingBattleDetails: {
              enemyPokemon: currentSegment.triggerBattle!.enemyPokemon,
              battleReturnSegmentWin:
                currentSegment.triggerBattle!.winSegmentId,
              battleReturnSegmentLose:
                currentSegment.triggerBattle!.loseSegmentId,
            },
            currentAIScene: null,
          }));
          advanceStaticStory('CONFIRM_STATIC_BATTLE_SEGMENT');
          return;
        }
      } else if (choice.nextSegmentId) {
        advanceStaticStory(choice.nextSegmentId);
      } else if (choice.actionTag) {
        if (choice.isAIHandoff) {
          updateGameState(prev => ({
            ...prev,
            currentAIScene: null,
            aiLoadingStatus: { status: 'loading', message: 'AI 正在思考...' },
            customizationAssistantResponse: null,
          }));
        }
        triggerAIStory(choice.actionTag);
      }
    },
    [
      currentStaticSegmentId,
      updateGameState,
      advanceStaticStory,
      triggerAIStory,
    ]
  );

  const handleAIChoice = useCallback(
    (choice: AIStoryChoice) => {
      const systemAckTags = [
        'ACKNOWLEDGE_NO_API_KEY',
        'ACKNOWLEDGE_AI_CONNECTION_ERROR',
        'ACKNOWLEDGE_AI_DIFFICULTY_PROMPT_NEW_INPUT',
        'ACKNOWLEDGE_AI_FORMAT_ERROR',
        'CONTINUE_GENERIC_AI_BLANK',
      ];

      if (
        choice.actionTag === 'ACKNOWLEDGE_BATTLE_START' ||
        choice.actionTag === 'CONFIRMED_STATIC_BATTLE_FINAL'
      ) {
        updateGameState(prev => {
          if (
            prev.pendingBattleDetails &&
            prev.pendingBattleDetails.enemyPokemon
          ) {
            const playerPokemonForBattle = prev.playerTeam.find(
              p => !p.isFainted && p.isPlayerOwned
            );
            if (playerPokemonForBattle && playerPokemonForBattle.instanceId) {
              return {
                ...prev,
                gameMode: GameMode.BATTLE,
                currentBattleEnemy: prev.pendingBattleDetails.enemyPokemon,
                currentBattlePlayerPokemonId: playerPokemonForBattle.instanceId,
                battleReturnSegmentWin:
                  prev.pendingBattleDetails.battleReturnSegmentWin,
                battleReturnSegmentLose:
                  prev.pendingBattleDetails.battleReturnSegmentLose,
                pendingBattleDetails: undefined,
                currentAIScene: null,
                aiLoadingStatus: { status: 'idle' } as LoadingStatus,
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
            const noDetailsMsg =
              choice.actionTag === 'ACKNOWLEDGE_BATTLE_START'
                ? '(AI未能正确准备战斗数据。)'
                : '(静态战斗数据准备出错。)';
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
        return;
      }

      if (
        !systemAckTags.includes(choice.actionTag) ||
        choice.actionTag === 'USER_REQUESTS_CONTINUATION' ||
        choice.actionTag === 'CONTINUE_AFTER_IMAGE_REGEN'
      ) {
        updateGameState(
          prev => ({
            ...prev,
            chatHistory: [
              ...prev.chatHistory,
              {
                id: `${Date.now()}`,
                timestamp: Date.now(),
                speaker: prev.playerProfile.name || '玩家',
                narrative: choice.text,
                type: 'player_input',
              },
            ],
          }),
          { minutes: Math.floor(Math.random() * 3) + 1 }
        );
      } else {
        updateGameState(prev => ({
          ...prev,
          currentAIScene: null,
          aiLoadingStatus: { status: 'idle' } as LoadingStatus,
          customizationAssistantResponse: null,
        }));
        if (
          choice.actionTag === 'ACKNOWLEDGE_AI_DIFFICULTY_PROMPT_NEW_INPUT' ||
          choice.actionTag === 'ACKNOWLEDGE_AI_FORMAT_ERROR'
        )
          return;
        return;
      }

      triggerAIStory(choice.actionTag);
    },
    [gameState, updateGameState, triggerAIStory]
  );

  const handlePlayerCustomInputAction = useCallback(
    (inputText: string) => {
      const trimmedInput = inputText.trim();
      if (trimmedInput) {
        updateGameState(
          prev => ({
            ...prev,
            chatHistory: [
              ...prev.chatHistory,
              {
                id: `${Date.now()}`,
                timestamp: Date.now(),
                speaker: prev.playerProfile.name || '玩家',
                narrative: trimmedInput,
                type: 'player_input',
              },
            ],
          }),
          { minutes: Math.floor(Math.random() * 3) + 1 }
        );
        triggerAIStory(trimmedInput);
      }
    },
    [updateGameState, triggerAIStory]
  );

  const handleBattleEnd = useCallback(
    (
      didPlayerWin: boolean,
      finalPlayerTeamFromBattle: Pokemon[],
      finalInventory: InventoryItem[],
      finalEnemyPokemonState: Pokemon, // Renamed for clarity
      usedRun: boolean,
      caughtPokemon?: Pokemon, // New parameter for the caught Pokémon
      battleLog?: BattleChatMessage[] // Battle history for persistence
    ) => {
      let resultSegmentId: string;
      const tempNewChatHistory: ChatHistoryEntry[] = [];
      let processedPlayerTeam = [...finalPlayerTeamFromBattle];
      let newPlayerTeamForState = [...finalPlayerTeamFromBattle]; // To apply updates to this

      if (caughtPokemon) {
        const uniqueId = `${caughtPokemon.id || 'pkmn'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newlyCaughtPokemon: Pokemon = {
          ...sanitizePokemonData(caughtPokemon), // Sanitize general stats first
          instanceId: uniqueId,
          isPlayerOwned: true,
          currentHp: caughtPokemon.currentHp, // Preserve HP at catch
          // Reset battle-specific states that shouldn't carry over
          statusConditions: [],
          statStageModifiers: [],
          isFainted: caughtPokemon.currentHp <= 0, // Determine faint status based on catch HP
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
        // KO Victory
        const baseXP = finalEnemyPokemonState.level * 25 + 50;
        tempNewChatHistory.push({
          id: `xp-gain-msg-${Date.now()}`,
          timestamp: Date.now(),
          speaker: '系统',
          narrative: `战斗胜利！队伍中的宝可梦获得了 ${baseXP} 点经验值！`,
          type: 'system',
        });

        processedPlayerTeam = processedPlayerTeam.map(pokemon => {
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
        newPlayerTeamForState = processedPlayerTeam;
        resultSegmentId =
          gameState.battleReturnSegmentWin || 'BATTLE_WON_DEFAULT';
      } else if (usedRun) {
        resultSegmentId = 'PLAYER_RAN_AWAY';
      } else {
        // Loss
        resultSegmentId =
          gameState.battleReturnSegmentLose || 'BATTLE_LOST_DEFAULT';
      }

      // Create battle record for history
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
          playerTeam: newPlayerTeamForState.map(p => sanitizePokemonData(p)), // Ensure all team members are sanitized
          inventory: finalInventory,
          gameMode: GameMode.ADVENTURE,
          currentBattleEnemy: undefined,
          currentBattlePlayerPokemonId: undefined,
          currentAIScene: null,
          aiLoadingStatus: { status: 'idle' } as LoadingStatus,
          customizationAssistantResponse: null,
          chatHistory: [...prev.chatHistory, ...tempNewChatHistory],
          battleHistory: [...(prev.battleHistory || []), battleRecord], // Add battle record
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
    [
      gameState.battleReturnSegmentWin,
      gameState.battleReturnSegmentLose,
      updateGameState,
      advanceStaticStory,
      triggerAIStory,
      sanitizePokemonData,
    ]
  );

  const handleReRollFullProfile = useCallback(() => {
    updateGameState(prev => ({
      ...prev,
      playerProfile: INITIAL_GAME_STATE.playerProfile,
      playerTeam: [],
      inventory: [],
      money: INITIAL_GAME_STATE.money,
      currentLocationDescription: INITIAL_GAME_STATE.currentLocationDescription,
      currentObjective: INITIAL_GAME_STATE.currentObjective,
      currentAIScene: null,
      customizationAssistantResponse: null,
      aiSuggestedGameStartTime: undefined, // Clear previous AI suggested time
      currentGameTime: new Date().getTime(), // Temporarily reset
    }));
    triggerAIStory('GENERATE_FULL_RANDOM_PROFILE', true);
  }, [updateGameState, triggerAIStory]);

  const handleRequestAddRandomStarterViaMainButton = useCallback(() => {
    triggerAIStory('GENERATE_RANDOM_STARTER_POKEMON', true);
  }, [triggerAIStory]);

  const handleRequestNewItemViaMainButton = useCallback(() => {
    triggerAIStory('GENERATE_RANDOM_ITEM', true);
  }, [triggerAIStory]);

  const handleRequestGeneratePlayerDescription = useCallback(() => {
    triggerAIStory('GENERATE_RANDOM_PLAYER_DESCRIPTION', true);
  }, [triggerAIStory]);

  const handleStartAdventureWithCustomizedProfile = useCallback(
    (customData: CustomizedStartData) => {
      const finalPlayerProfile: PlayerProfile = {
        name: customData.playerProfile.name?.trim() || '冒险者',
        gender: customData.playerProfile.gender || '男',
        age: customData.playerProfile.age ?? 16,
        description:
          customData.playerProfile.description?.trim() || '一位普通的冒险者。',
        stamina:
          customData.playerProfile.stamina ??
          INITIAL_GAME_STATE.playerProfile.stamina!,
        maxStamina:
          customData.playerProfile.maxStamina ??
          INITIAL_GAME_STATE.playerProfile.maxStamina!,
        energy:
          customData.playerProfile.energy ??
          INITIAL_GAME_STATE.playerProfile.energy!,
        maxEnergy:
          customData.playerProfile.maxEnergy ??
          INITIAL_GAME_STATE.playerProfile.maxEnergy!,
        healthStatus: customData.playerProfile.healthStatus?.trim() || '健康',
      };

      let startTime: number;
      if (customData.userDateTimeInput) {
        startTime = userDateTimeToTimestamp(customData.userDateTimeInput);
      } else if (gameState.aiSuggestedGameStartTime) {
        startTime = gameState.aiSuggestedGameStartTime;
      } else {
        startTime = new Date().getTime();
      }

      updateGameState(prev => ({
        ...prev,
        playerProfile: finalPlayerProfile,
        playerTeam: customData.startingTeam.map(p => sanitizePokemonData(p)),
        inventory: customData.inventory.map(item => sanitizeItemData(item)),
        money: customData.money,
        currentLocationDescription: customData.currentLocationDescription,
        currentObjective: customData.currentObjective,
        currentAIScene: null,
        gameMode: GameMode.ADVENTURE,
        customizationAssistantResponse: null,
        currentGameTime: startTime,
        aiLoadingStatus: { status: 'idle' } as LoadingStatus,
      }));
      triggerAIStory('START_ADVENTURE_WITH_CUSTOMIZED_PROFILE');
    },
    [
      updateGameState,
      triggerAIStory,
      sanitizePokemonData,
      sanitizeItemData,
      gameState.aiSuggestedGameStartTime,
    ]
  );

  const handleDirectCustomizationUpdate = useCallback(
    (
      field:
        | 'teamMemberAdd'
        | 'teamMemberRemove'
        | 'itemAdd'
        | 'itemRemove'
        | 'itemQtyUpdate'
        | 'profileFieldUpdate'
        | 'gameTimeUpdate',
      value:
        | Pokemon
        | InventoryItem
        | string
        | { itemId: string; quantity: number }
        | {
            field:
              | keyof PlayerProfile
              | 'currentObjective'
              | 'currentLocationDescription'
              | 'money';
            value: any;
          }
        | UserDateTimeInput
    ) => {
      updateGameState(prev => {
        let newPlayerTeam = [...prev.playerTeam];
        let newInventory = [...prev.inventory];
        let newPlayerProfile = { ...prev.playerProfile };
        let newMoney = prev.money;
        let newObjective = prev.currentObjective;
        let newLocation = prev.currentLocationDescription;
        let newAiSuggestedStartTime = prev.aiSuggestedGameStartTime;
        let newCurrentGameTime = prev.currentGameTime; // For gameTimeUpdate
        const newState = { ...prev };

        switch (field) {
          case 'teamMemberAdd':
            newPlayerTeam.push(sanitizePokemonData(value as Pokemon));
            break;
          case 'teamMemberRemove':
            newPlayerTeam = newPlayerTeam.filter(
              p => p.instanceId !== (value as string)
            );
            break;
          case 'itemAdd': {
            const itemToAdd = sanitizeItemData(value as InventoryItem);
            const existingItemIndex = newInventory.findIndex(
              i => i.name === itemToAdd.name
            );
            if (existingItemIndex > -1)
              newInventory[existingItemIndex].quantity += itemToAdd.quantity;
            else newInventory.push(itemToAdd);
            break;
          }
          case 'itemRemove': {
            newInventory = newInventory.filter(i => i.id !== (value as string));
            break;
          }
          case 'itemQtyUpdate': {
            const { itemId, quantity } = value as {
              itemId: string;
              quantity: number;
            };
            const itemIdxToUpdate = newInventory.findIndex(
              i => i.id === itemId
            );
            if (itemIdxToUpdate > -1) {
              if (quantity > 0)
                newInventory[itemIdxToUpdate].quantity = quantity;
              else newInventory.splice(itemIdxToUpdate, 1);
            }
            break;
          }
          case 'profileFieldUpdate': {
            const { field: profileFieldName, value: profileFieldValue } =
              value as {
                field:
                  | keyof PlayerProfile
                  | 'currentObjective'
                  | 'currentLocationDescription'
                  | 'money';
                value: any;
              };
            const playerProfileKeys = [
              'name',
              'gender',
              'age',
              'description',
              'stamina',
              'maxStamina',
              'energy',
              'maxEnergy',
              'healthStatus',
            ];
            if (playerProfileKeys.includes(profileFieldName)) {
              newPlayerProfile = {
                ...newPlayerProfile,
                [profileFieldName]: profileFieldValue,
              };
            } else if (profileFieldName === 'currentObjective') {
              newObjective = profileFieldValue as string;
            } else if (profileFieldName === 'currentLocationDescription') {
              newLocation = profileFieldValue as string;
            } else if (profileFieldName === 'money') {
              newMoney = profileFieldValue as number;
            }
            if (
              typeof profileFieldValue === 'object' &&
              profileFieldValue !== null &&
              'suggestedGameStartTime' in profileFieldValue &&
              (profileFieldValue as FullProfileSuggestionData)
                .suggestedGameStartTime !== undefined
            ) {
              newAiSuggestedStartTime = (
                profileFieldValue as FullProfileSuggestionData
              ).suggestedGameStartTime;
              if (newAiSuggestedStartTime)
                newCurrentGameTime = newAiSuggestedStartTime; // Also update current game time if full profile is accepted
            }
            break;
          }
          case 'gameTimeUpdate': {
            const timeInput = value as UserDateTimeInput;
            newCurrentGameTime = userDateTimeToTimestamp(timeInput);
            // When time is updated in customize screen, it affects the aiSuggestedGameStartTime IF it's from AI
            // Or it just updates the current time to be used if manually set.
            // The crucial part is `userDateTimeToTimestamp` which is used when adventure starts.
            // Let's also update aiSuggestedGameStartTime here so the UI can reflect an AI-driven change or a dynamic suggestion.
            newAiSuggestedStartTime = newCurrentGameTime;
            break;
          }
        }
        newState.playerTeam = newPlayerTeam;
        newState.inventory = newInventory;
        newState.playerProfile = newPlayerProfile;
        newState.money = newMoney;
        newState.currentObjective = newObjective;
        newState.currentLocationDescription = newLocation;
        newState.aiSuggestedGameStartTime = newAiSuggestedStartTime; // This allows pre-filling form
        newState.currentGameTime = newCurrentGameTime; // This holds the actual time to be used

        return newState;
      });
    },
    [updateGameState, sanitizePokemonData, sanitizeItemData]
  );

  const handleSendCustomizationAssistantMessage = useCallback(
    async (
      messageText: string,
      assistantChatHistoryFromComponent: ChatHistoryEntry[],
      actionTag?: string
    ) => {
      const stateForAIContext = { ...gameState };

      updateGameState(prev => ({
        ...prev,
        aiLoadingStatus: { status: 'loading', message: '助手理解中...' },
        customizationAssistantResponse: null,
        assistantChatJustRefreshed: false,
      }));

      let classifiedIntent: ClassifiedIntent | null = null;
      let specializedSystemPrompt: string =
        GEMINI_GENERAL_CUSTOMIZATION_CHAT_SYSTEM_PROMPT;

      const handleRetry: OnRetryCallback = (
        attempt,
        maxAttempts,
        _errorType
      ) => {
        updateGameState(prev => ({
          ...prev,
          aiLoadingStatus: {
            status: 'retrying_format_error',
            message: `助手${_errorType === 'format' ? '响应格式' : 'API调用'}错误，重试中 (${attempt}/${maxAttempts})...`,
          },
        }));
      };

      if (actionTag && actionTag !== 'ASSIST_PROFILE_CUSTOMIZATION') {
        if (actionTag === 'ASSIST_PROFILE_CUSTOMIZATION_REQUEST_NEW_POKEMON') {
          classifiedIntent = {
            intent: 'SUGGEST_POKEMON',
            originalQuery: messageText,
            params: {},
          };
        } else if (
          actionTag === 'ASSIST_PROFILE_CUSTOMIZATION_REQUEST_NEW_ITEM'
        ) {
          classifiedIntent = {
            intent: 'SUGGEST_ITEM',
            originalQuery: messageText,
            params: {},
          };
        } else if (
          actionTag === 'ASSIST_PROFILE_CUSTOMIZATION_REQUEST_NEW_DESCRIPTION'
        ) {
          classifiedIntent = {
            intent: 'REQUEST_RANDOM_DESCRIPTION',
            originalQuery: messageText,
            params: {},
          };
        }
      }

      if (!classifiedIntent) {
        classifiedIntent = await classifyCustomizationIntent(
          messageText,
          assistantChatHistoryFromComponent,
          stateForAIContext,
          handleRetry
        );
      }

      let contextForSpecializedAgent = '';

      if (classifiedIntent) {
        switch (classifiedIntent.intent) {
          case 'CREATE_FULL_PROFILE':
            specializedSystemPrompt = GEMINI_FULL_PROFILE_CREATOR_SYSTEM_PROMPT;
            if (stateForAIContext.assistantChatJustRefreshed) {
              let themeInstruction = '';
              if (
                classifiedIntent.params?.theme &&
                classifiedIntent.params.theme.trim() !== ''
              ) {
                themeInstruction = `玩家提供的主题是：“${classifiedIntent.params.theme.trim()}”。请基于此主题生成。`;
              } else if (
                classifiedIntent.originalQuery &&
                ![
                  'create full profile',
                  'create a new profile',
                  '帮我创建一个档案',
                  '建个档',
                ].includes(classifiedIntent.originalQuery.toLowerCase().trim())
              ) {
                themeInstruction = `玩家的描述是：“${classifiedIntent.originalQuery}”。请基于此描述生成。`;
              } else {
                themeInstruction =
                  '玩家没有提供具体主题或描述，请你完全随机地、创新地生成一个独特且多样化的角色档案。确保所有细节都是全新的。';
              }
              contextForSpecializedAgent =
                `玩家在刷新对话后，要求创建一个全新的角色档案。\n${themeInstruction}\n\n` +
                `关键指令：请严格遵循你的系统提示 (\`GEMINI_FULL_PROFILE_CREATOR_SYSTEM_PROMPT\`)，确保生成的档案所有内容都是全新的，包括一个合适的 \`suggestedGameStartTime\` (Unix 毫秒时间戳)，绝不要参考或重复任何之前的角色设定或对话中可能出现过的元素。所有面向用户的文本必须是中文。`;
            } else {
              const currentFormStateContext = `当前自定义状态概要：\n  - 角色名: ${stateForAIContext.playerProfile.name || '未设定'}...\n`;
              contextForSpecializedAgent =
                currentFormStateContext +
                `玩家要求基于以下主题或描述创建一个完整的角色档案：“${classifiedIntent.params?.theme || classifiedIntent.originalQuery}”。请严格遵循 \`GEMINI_FULL_PROFILE_CREATOR_SYSTEM_PROMPT\` 的指示生成JSON响应，包括一个合适的 \`suggestedGameStartTime\` (Unix 毫秒时间戳)。`;
            }
            break;
          case 'SUGGEST_POKEMON': {
            specializedSystemPrompt =
              GEMINI_STARTER_POKEMON_SUGGESTOR_SYSTEM_PROMPT;
            let pokemonQuery = `玩家想要一个初始宝可梦建议。原始请求：“${classifiedIntent.originalQuery}”。`;
            if (classifiedIntent.params?.pokemonType)
              pokemonQuery += ` 特别指定属性：“${classifiedIntent.params.pokemonType}”。`;
            if (classifiedIntent.params?.pokemonName)
              pokemonQuery += ` 提及名称：“${classifiedIntent.params.pokemonName}”。`;
            pokemonQuery += ` 请严格遵循 \`GEMINI_STARTER_POKEMON_SUGGESTOR_SYSTEM_PROMPT\` 的指示生成JSON响应。`;
            contextForSpecializedAgent = pokemonQuery;
            break;
          }
          case 'SUGGEST_ITEM': {
            specializedSystemPrompt =
              GEMINI_STARTER_ITEM_SUGGESTOR_SYSTEM_PROMPT;
            let itemQuery = `玩家想要一个初始道具建议。原始请求：“${classifiedIntent.originalQuery}”。`;
            if (classifiedIntent.params?.itemName)
              itemQuery += ` 提及道具名：“${classifiedIntent.params.itemName}”。`;
            if (classifiedIntent.params?.quantity)
              itemQuery += ` 请求数量：${classifiedIntent.params.quantity}。`;
            itemQuery += ` 请严格遵循 \`GEMINI_STARTER_ITEM_SUGGESTOR_SYSTEM_PROMPT\` 的指示生成JSON响应。`;
            contextForSpecializedAgent = itemQuery;
            break;
          }
          case 'MODIFY_PROFILE_FIELD':
            specializedSystemPrompt =
              GEMINI_PROFILE_FIELD_ADVISOR_SYSTEM_PROMPT;
            contextForSpecializedAgent = `玩家想要修改角色档案字段。字段名：“${classifiedIntent.params?.fieldName}”，新值：“${classifiedIntent.params?.fieldValue}”。原始请求：“${classifiedIntent.originalQuery}”。请严格遵循 \`GEMINI_PROFILE_FIELD_ADVISOR_SYSTEM_PROMPT\` 的指示生成JSON响应。`;
            break;
          case 'MODIFY_OBJECTIVE':
            specializedSystemPrompt =
              GEMINI_OBJECTIVE_LOCATION_MONEY_ADVISOR_SYSTEM_PROMPT;
            contextForSpecializedAgent = `玩家想要修改初始目标为：“${classifiedIntent.params?.fieldValue}”。原始请求：“${classifiedIntent.originalQuery}”。请严格遵循 \`GEMINI_OBJECTIVE_LOCATION_MONEY_ADVISOR_SYSTEM_PROMPT\` 的指示生成JSON响应。`;
            break;
          case 'MODIFY_LOCATION':
            specializedSystemPrompt =
              GEMINI_OBJECTIVE_LOCATION_MONEY_ADVISOR_SYSTEM_PROMPT;
            contextForSpecializedAgent = `玩家想要修改初始位置为：“${classifiedIntent.params?.fieldValue}”。原始请求：“${classifiedIntent.originalQuery}”。请严格遵循 \`GEMINI_OBJECTIVE_LOCATION_MONEY_ADVISOR_SYSTEM_PROMPT\` 的指示生成JSON响应 (如果适用，包含mapData)。`;
            break;
          case 'MODIFY_MONEY':
            specializedSystemPrompt =
              GEMINI_OBJECTIVE_LOCATION_MONEY_ADVISOR_SYSTEM_PROMPT;
            contextForSpecializedAgent = `玩家想要修改初始金钱为：${classifiedIntent.params?.fieldValue}。原始请求：“${classifiedIntent.originalQuery}”。请严格遵循 \`GEMINI_OBJECTIVE_LOCATION_MONEY_ADVISOR_SYSTEM_PROMPT\` 的指示生成JSON响应。`;
            break;
          case 'MODIFY_GAME_START_TIME':
            specializedSystemPrompt = GEMINI_GAME_TIME_ADVISOR_SYSTEM_PROMPT;
            contextForSpecializedAgent = `玩家想要修改游戏开始时间。原始请求：“${classifiedIntent.originalQuery}”。解析出的参数：${JSON.stringify(classifiedIntent.params)}。请严格遵循 \`GEMINI_GAME_TIME_ADVISOR_SYSTEM_PROMPT\` 的指示生成JSON响应，提供确认，并将解析/补全后的时间以 \`YYYY:MM(0-11):DD:HH:MM\` 格式放在actionTag中。`;
            break;
          case 'SUGGEST_GAME_START_TIME_BASED_ON_PROFILE': // Should be handled by requestDynamicTimeSuggestion now
            specializedSystemPrompt =
              GEMINI_DYNAMIC_GAME_TIME_SUGGESTOR_SYSTEM_PROMPT;
            contextForSpecializedAgent = `玩家请求根据以下当前设定建议游戏开始时间：\n${JSON.stringify(classifiedIntent.params?.currentProfileDataForTimeSuggestion, null, 2)}\n请严格遵循 \`GEMINI_DYNAMIC_GAME_TIME_SUGGESTOR_SYSTEM_PROMPT\` 的指示生成JSON响应。`;
            break;
          case 'REQUEST_RANDOM_DESCRIPTION':
            specializedSystemPrompt =
              GEMINI_RANDOM_DESCRIPTION_GENERATOR_ASSISTANT_PROMPT;
            contextForSpecializedAgent = `玩家请求生成一个随机的人物说明。原始请求：“${classifiedIntent.originalQuery}”。请严格遵循 \`GEMINI_RANDOM_DESCRIPTION_GENERATOR_ASSISTANT_PROMPT\` 的指示生成JSON响应。`;
            break;
          case 'GENERAL_CHAT_OR_CLARIFICATION':
          case 'UNKNOWN_INTENT':
          default: {
            specializedSystemPrompt =
              GEMINI_GENERAL_CUSTOMIZATION_CHAT_SYSTEM_PROMPT;
            let generalQuery = `玩家的意图是“${classifiedIntent.intent}”。原始请求：“${classifiedIntent.originalQuery}”。`;
            if (classifiedIntent.feedbackToUser)
              generalQuery += ` 分类器反馈: "${classifiedIntent.feedbackToUser}"`;
            generalQuery += ` 请进行通用对话或澄清，严格遵循 \`GEMINI_GENERAL_CUSTOMIZATION_CHAT_SYSTEM_PROMPT\` 的指示生成JSON响应。`;
            contextForSpecializedAgent = generalQuery;
            break;
          }
        }

        if (
          !(
            stateForAIContext.assistantChatJustRefreshed &&
            classifiedIntent?.intent === 'CREATE_FULL_PROFILE'
          )
        ) {
          let currentFormStateContext = `当前自定义状态概要：\n`;
          currentFormStateContext += `  - 角色名: ${stateForAIContext.playerProfile.name || '未设定'}\n`;
          currentFormStateContext += `  - 性别: ${stateForAIContext.playerProfile.gender || '未设定'}\n`;
          currentFormStateContext += `  - 年龄: ${stateForAIContext.playerProfile.age === undefined ? '未设定' : stateForAIContext.playerProfile.age}\n`;
          currentFormStateContext += `  - 说明: ${stateForAIContext.playerProfile.description || '未设定'}\n`;
          currentFormStateContext += `  - 宝可梦选项: ${stateForAIContext.playerTeam.length > 0 ? stateForAIContext.playerTeam.map(p => p.name).join('，') : '无'}\n`;
          currentFormStateContext += `  - 道具: ${stateForAIContext.inventory.length > 0 ? stateForAIContext.inventory.map(i => `${i.name}x${i.quantity}`).join('，') : '无'}\n`;
          currentFormStateContext += `  - 目标: ${stateForAIContext.currentObjective || '未设定'}\n`;
          currentFormStateContext += `  - 地点: ${stateForAIContext.currentLocationDescription || '未设定'}\n`;
          currentFormStateContext += `  - 金钱: ${stateForAIContext.money}\n`;
          const gameTime = new Date(stateForAIContext.currentGameTime);
          const jsYear = gameTime.getFullYear();
          let formattedYearString =
            jsYear <= 0 ? `公元前 ${Math.abs(jsYear) + 1}` : `公元 ${jsYear}`;
          if (jsYear === 0) formattedYearString = '公元前 1';
          currentFormStateContext += `  - 预设开始时间: ${formattedYearString}年${gameTime.getMonth() + 1}月${gameTime.getDate()}日 ${gameTime.getHours()}:${gameTime.getMinutes()}\n\n`;

          contextForSpecializedAgent =
            currentFormStateContext +
            `玩家的最新请求/关注点：\n${contextForSpecializedAgent}\n\n`;
        }
        contextForSpecializedAgent += `请根据以上信息和你的特定角色（由当前使用的系统提示定义），生成一个JSON响应。所有面向用户的文本必须是中文。`;
      } else {
        specializedSystemPrompt =
          GEMINI_GENERAL_CUSTOMIZATION_CHAT_SYSTEM_PROMPT;
        contextForSpecializedAgent = `意图分类失败。玩家原始输入：“${messageText}”。请进行通用对话或澄清。`;
      }

      updateGameState(prev => ({
        ...prev,
        aiLoadingStatus: { status: 'loading', message: '助手思考中...' },
      }));

      const aiResponse = await fetchStoryContinuation(
        stateForAIContext,
        contextForSpecializedAgent,
        undefined,
        handleRetry,
        0,
        specializedSystemPrompt
      );

      let newAiSuggestedStartTime: number | undefined = undefined;
      if (
        classifiedIntent?.intent === 'CREATE_FULL_PROFILE' &&
        aiResponse.suggestedFullProfileData?.suggestedGameStartTime
      ) {
        newAiSuggestedStartTime =
          aiResponse.suggestedFullProfileData.suggestedGameStartTime;
      }

      updateGameState(prev => ({
        ...prev,
        aiLoadingStatus: { status: 'idle' } as LoadingStatus,
        customizationAssistantResponse: aiResponse,
        aiSuggestedGameStartTime:
          newAiSuggestedStartTime ?? prev.aiSuggestedGameStartTime,
      }));
    },
    [gameState, updateGameState, classifyCustomizationIntent]
  );

  const requestDynamicTimeSuggestion = useCallback(
    async (profileData: ProfileDataForTimeSuggestion) => {
      const stateForAIContext = { ...gameState };
      updateGameState(prev => ({
        ...prev,
        aiLoadingStatus: { status: 'loading', message: '助手建议时间中...' },
        customizationAssistantResponse: null,
      }));

      const promptContent = `玩家请求根据以下当前表单设定建议游戏开始时间：\n${JSON.stringify(profileData, null, 2)}\n请严格遵循 \`GEMINI_DYNAMIC_GAME_TIME_SUGGESTOR_SYSTEM_PROMPT\` 的指示生成JSON响应。`;
      const handleRetry: OnRetryCallback = (
        attempt,
        maxAttempts,
        _errorType
      ) => {
        updateGameState(prev => ({
          ...prev,
          aiLoadingStatus: {
            status: 'retrying_format_error',
            message: `助手响应格式错误，建议时间重试中 (${attempt}/${maxAttempts})...`,
          },
        }));
      };

      const aiResponse = await fetchStoryContinuation(
        stateForAIContext,
        promptContent,
        undefined,
        handleRetry,
        0,
        GEMINI_DYNAMIC_GAME_TIME_SUGGESTOR_SYSTEM_PROMPT
      );

      updateGameState(prev => ({
        ...prev,
        aiLoadingStatus: { status: 'idle' } as LoadingStatus,
        customizationAssistantResponse: aiResponse, // This will be picked up by CustomizeRandomStartScreen
      }));
    },
    [gameState, updateGameState]
  );

  const handleSavePlayerProfileChanges = useCallback(
    (updatedProfile: PlayerProfile) => {
      updateGameState(
        prev => ({
          ...prev,
          playerProfile: { ...prev.playerProfile, ...updatedProfile },
        }),
        { minutes: 1 }
      );
      const profileUpdateMessage: ChatHistoryEntry = {
        id: `profile-update-${Date.now()}`,
        timestamp: Date.now(),
        speaker: '系统',
        narrative: '你的角色信息已更新。',
        type: 'system',
      };
      updateGameState(prev => ({
        ...prev,
        chatHistory: [...prev.chatHistory, profileUpdateMessage],
      }));
    },
    [updateGameState]
  );

  const handleRegeneratePokemonImage = useCallback(
    (instanceId: string) => {
      const pokemonToRegen =
        gameState.playerTeam.find(p => p.instanceId === instanceId) ||
        (gameState.currentBattleEnemy?.instanceId === instanceId
          ? gameState.currentBattleEnemy
          : undefined) ||
        (gameState.customizationAssistantResponse?.events?.find(
          e =>
            e.type === 'PRESENT_SUGGESTED_POKEMON_DETAILS' &&
            e.pokemonDetails?.instanceId === instanceId
        )?.pokemonDetails as Pokemon | undefined);
      if (pokemonToRegen) {
        triggerAIStory('USER_REQUESTS_POKEMON_IMAGE_REGENERATION', false, {
          pokemonInstanceIdToRegenerate: instanceId,
          pokemonNameToRegenerate: pokemonToRegen.name,
        });
      } else {
        console.warn(
          'Could not find Pokémon with instanceId for image regeneration:',
          instanceId
        );
        updateGameState(prev => ({
          ...prev,
          chatHistory: [
            ...prev.chatHistory,
            {
              id: `err-img-regen-${Date.now()}`,
              timestamp: Date.now(),
              speaker: '系统错误',
              narrative: `无法为ID ${instanceId} 的宝可梦重新生成图片，未找到该宝可梦。`,
              type: 'system',
            },
          ],
        }));
      }
    },
    [gameState, triggerAIStory, updateGameState]
  );

  useEffect(() => {
    // Only auto-generate if:
    // 1. We're in customize mode
    // 2. No initial profile has been generated
    // 3. AI is not currently loading
    // 4. We're not loading from a saved state
    // 5. There's no existing current AI scene (to avoid overriding loaded content)
    // 6. We have attempted initial load (prevents early triggering)
    if (
      gameState.gameMode === GameMode.CUSTOMIZE_RANDOM_START &&
      !gameState.initialProfileGenerated &&
      gameState.aiLoadingStatus.status === 'idle' &&
      !isLoadingFromSave &&
      !gameState.currentAIScene && // Additional check to prevent overriding loaded content
      hasAttemptedInitialLoad // Only run after initial load attempt
    ) {
      triggerAIStory('GENERATE_FULL_RANDOM_PROFILE', true);
    }
  }, [
    gameState.gameMode,
    gameState.initialProfileGenerated,
    gameState.aiLoadingStatus.status,
    gameState.currentAIScene, // Added dependency
    isLoadingFromSave,
    hasAttemptedInitialLoad,
    triggerAIStory,
  ]);

  const [npcInteractionLoading, setNpcInteractionLoading] = useState(false);

  const fetchInitialNPCDialogueAndOrSuggestions = useCallback(
    async (
      npcToChatWith: NPC,
      setSelectedNPCForChat: (npc: NPC | null) => void,
      setNpcChatSuggestions: (suggestions: AIStoryChoice[]) => void
    ) => {
      setNpcInteractionLoading(true);
      updateGameState(prev => ({
        ...prev,
        aiLoadingStatus: { status: 'loading', message: '获取NPC对话...' },
      }));

      const npcSystemPrompt = GEMINI_NPC_CHAT_SYSTEM_PROMPT;

      const initialNpcPromptContent = `玩家 ${gameState.playerProfile.name || '你'} 刚刚开始与NPC ${npcToChatWith.name} (关系: ${npcToChatWith.relationshipStatus}) 对话。这是你们的第一次互动，或者对话重新开始。请生成 ${npcToChatWith.name} 的开场白或问候语，并可以提供一些玩家可能想说的建议回复。对话历史为空。NPC信息：${npcToChatWith.description || '无特别描述'}。所有文本必须是中文。`;

      const handleRetry: OnRetryCallback = (attempt, maxAttempts) => {
        updateGameState(prev => ({
          ...prev,
          aiLoadingStatus: {
            status: 'retrying_format_error',
            message: `AI响应格式错误，获取NPC对话重试中 (${attempt}/${maxAttempts})...`,
          },
        }));
      };

      const handleStreamCallback: OnStreamCallback = (
        _partialResponse: string
      ) => {
        updateGameState(prev => ({
          ...prev,
          aiLoadingStatus: {
            status: 'loading',
            message: 'NPC正在回应中... (流式传输)',
          },
        }));
      };

      const aiResponse = await fetchStoryContinuationStream(
        {
          ...gameState,
          knownNPCs: gameState.knownNPCs.map(n => ({
            ...n,
            dialogueHistory: [],
          })),
        } as GameState,
        initialNpcPromptContent,
        handleStreamCallback,
        undefined,
        handleRetry,
        0,
        npcSystemPrompt
      );

      const setNpcChatHistoryAndSelectNpc = (
        npcToUpdate: NPC,
        initialNarrative?: string,
        suggestions?: AIStoryChoice[]
      ) => {
        updateGameState(prev => {
          const newDialogueHistory: ChatHistoryEntry[] = initialNarrative
            ? [
                {
                  id: `npc-initial-${npcToUpdate.id}-${Date.now()}`,
                  timestamp: Date.now(),
                  speaker: npcToUpdate.name,
                  narrative: initialNarrative,
                  type: 'npc_dialogue',
                },
              ]
            : [];

          const updatedNpcs = prev.knownNPCs.map(npc =>
            npc.id === npcToUpdate.id
              ? { ...npc, dialogueHistory: newDialogueHistory }
              : npc
          );
          return { ...prev, knownNPCs: updatedNpcs };
        });
        const npcWithHistory = {
          ...npcToUpdate,
          dialogueHistory: initialNarrative
            ? [
                {
                  id: `sel-npc-initial-${npcToUpdate.id}-${Date.now()}`,
                  timestamp: Date.now(),
                  speaker: npcToUpdate.name,
                  narrative: initialNarrative,
                  type: 'npc_dialogue' as const,
                },
              ]
            : [],
        };
        setSelectedNPCForChat(npcWithHistory);
        setNpcChatSuggestions(suggestions || []);
      };

      setNpcChatHistoryAndSelectNpc(
        npcToChatWith,
        aiResponse.narrative,
        aiResponse.suggestedPlayerReplies
      );
      updateGameState(prev => ({
        ...prev,
        aiLoadingStatus: { status: 'idle' } as LoadingStatus,
      }));
      setNpcInteractionLoading(false);
    },
    [gameState, updateGameState, processAIEvent]
  );

  const handleSendPlayerMessageToNPC = useCallback(
    async (
      npcId: string,
      messageText: string,
      currentNpcContext: NPC,
      setSelectedNPCForChat: (npc: NPC | null) => void,
      setNpcChatSuggestions: (suggestions: AIStoryChoice[]) => void,
      suggestionActionTag?: string
    ) => {
      setNpcInteractionLoading(true);
      updateGameState(prev => ({
        ...prev,
        aiLoadingStatus: { status: 'loading', message: 'NPC回应中...' },
      }));

      const playerEntry: ChatHistoryEntry = {
        id: `player-msg-${npcId}-${Date.now()}`,
        timestamp: Date.now(),
        speaker: gameState.playerProfile.name || '你',
        narrative: messageText,
        type: 'player_input',
      };

      const updatedCurrentNpcContext = {
        ...currentNpcContext,
        dialogueHistory: [...currentNpcContext.dialogueHistory, playerEntry],
      };
      setSelectedNPCForChat(updatedCurrentNpcContext); // Update modal immediately with player's message

      updateGameState(prev => {
        const updatedNpcs = prev.knownNPCs.map(npc =>
          npc.id === npcId
            ? { ...npc, dialogueHistory: [...npc.dialogueHistory, playerEntry] }
            : npc
        );
        return { ...prev, knownNPCs: updatedNpcs };
      });
      setNpcChatSuggestions([]); // Clear previous suggestions while AI thinks

      const npcSystemPrompt = GEMINI_NPC_CHAT_SYSTEM_PROMPT;

      let npcChatPrompt = `NPC信息: { Name: ${currentNpcContext.name}, Description: "${currentNpcContext.description || '无特别说明'}", RelationshipToPlayer: "${currentNpcContext.relationshipStatus}" }\n`;
      npcChatPrompt += `玩家 (${gameState.playerProfile.name || '你'}) 与NPC ${currentNpcContext.name} 的对话历史 (最近5条，所有文本为中文):\n`;
      const recentHistory = updatedCurrentNpcContext.dialogueHistory.slice(-5); // Use the already updated history
      recentHistory.forEach(entry => {
        npcChatPrompt += `  ${entry.speaker}: ${entry.narrative}\n`;
      });
      npcChatPrompt += `玩家最新消息 (中文): "${messageText}"\n`;
      if (suggestionActionTag) {
        npcChatPrompt += `(玩家点击了建议回复，其内部标签为: ${suggestionActionTag})\n`;
      }
      npcChatPrompt += `请 ${currentNpcContext.name} 对玩家的最新消息做出回应。你可以选择是否提供建议的玩家回复。确保所有文本输出为中文。`;

      const handleRetry: OnRetryCallback = (attempt, maxAttempts) => {
        updateGameState(prev => ({
          ...prev,
          aiLoadingStatus: {
            status: 'retrying_format_error',
            message: `AI响应格式错误，NPC回应重试中 (${attempt}/${maxAttempts})...`,
          },
        }));
      };

      const handleStreamCallback: OnStreamCallback = (
        _partialResponse: string
      ) => {
        updateGameState(prev => ({
          ...prev,
          aiLoadingStatus: {
            status: 'loading',
            message: 'NPC正在回应中... (流式传输)',
          },
        }));
      };

      const aiResponse = await fetchStoryContinuationStream(
        {
          ...gameState,
          knownNPCs: gameState.knownNPCs.map(n => ({
            ...n,
            dialogueHistory: n.id === npcId ? recentHistory : [],
          })),
        } as GameState,
        npcChatPrompt,
        handleStreamCallback,
        undefined,
        handleRetry,
        0,
        npcSystemPrompt
      );

      const npcResponseEntry: ChatHistoryEntry | null = aiResponse.narrative
        ? {
            id: `npc-reply-${npcId}-${Date.now()}`,
            timestamp: Date.now(),
            speaker: currentNpcContext.name,
            narrative: aiResponse.narrative,
            type: 'npc_dialogue' as const,
          }
        : null;

      if (npcResponseEntry) {
        const finalNpcContext = {
          ...updatedCurrentNpcContext,
          dialogueHistory: [
            ...updatedCurrentNpcContext.dialogueHistory,
            npcResponseEntry,
          ],
        };
        setSelectedNPCForChat(finalNpcContext);
        updateGameState(prev => {
          const updatedNpcs = prev.knownNPCs.map(npc =>
            npc.id === npcId
              ? {
                  ...npc,
                  dialogueHistory: [...npc.dialogueHistory, npcResponseEntry],
                }
              : npc
          );
          return { ...prev, knownNPCs: updatedNpcs };
        });
      }
      setNpcChatSuggestions(aiResponse.suggestedPlayerReplies || []);
      updateGameState(prev => ({
        ...prev,
        aiLoadingStatus: { status: 'idle' } as LoadingStatus,
      }));
      setNpcInteractionLoading(false);
    },
    [gameState, updateGameState]
  );

  const clearCustomizationAssistantResponse = useCallback(() => {
    updateGameState(prev => ({
      ...prev,
      customizationAssistantResponse: null,
      assistantChatJustRefreshed: true, // Mark that a refresh happened
      aiLoadingStatus: { status: 'idle' } as LoadingStatus,
    }));
  }, [updateGameState]);

  // Auto-save game state to localStorage when it changes
  // useEffect(() => {
  //   // TODO: Implement a new auto-save strategy for multi-slot system.
  //   // This might involve saving to the most recent slot, or a designated auto-save slot.
  //   // For now, auto-save is disabled to prevent conflicts with manual saving.
  //   // if (
  //   //   gameState.gameMode !== GameMode.CUSTOMIZE_RANDOM_START ||
  //   //   gameState.initialProfileGenerated
  //   // ) {
  //   //   saveGameState(gameState);
  //   // }
  // }, [gameState]);

  // Set initial load flag after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasAttemptedInitialLoad(true);
    }, 100); // Small delay to allow saved state loading

    return () => clearTimeout(timer);
  }, []);

  const loadGame = useCallback(async (slotId: number) => {
    setIsLoadingFromSave(true);
    const savedState = await loadGameState(slotId);
    if (savedState) {
      setGameState(savedState);
    } else {
      console.error(`Failed to load game from slot ${slotId}`);
      // Optionally, handle the error in the UI
    }
    setIsLoadingFromSave(false);
  }, []);

  // Function to start fresh game (clear saved state)
  // This effect runs once on mount to check for saved games.
  useEffect(() => {
    const checkForSaves = async () => {
      const saves = await getSavedGames();
      setSavedGames(saves);
      if (saves.length > 0) {
        // If saves exist, we stay in MAIN_MENU mode, waiting for user action.
        setGameState(prev => ({ ...prev, gameMode: GameMode.MAIN_MENU }));
      } else {
        // No saves, proceed to character creation.
        setGameState(prev => ({ ...prev, gameMode: GameMode.CUSTOMIZE_RANDOM_START }));
      }
      setIsLoadingFromSave(false);
    };
    checkForSaves();
  }, []);

  return {
    gameState,
    savedGames,
    isLoadingFromSave,
    loadGame,
    currentStaticSegmentId,
    advanceStaticStory,
    handleStaticStoryChoice,
    triggerAIStory,
    handleAIChoice,
    handlePlayerCustomInputAction,
    handleBattleEnd,
    handleReRollFullProfile,
    handleRequestAddRandomStarterViaMainButton,
    handleRequestNewItemViaMainButton,
    handleRequestGeneratePlayerDescription,
    handleStartAdventureWithCustomizedProfile,
    handleDirectCustomizationUpdate,
    handleSendCustomizationAssistantMessage,
    requestDynamicTimeSuggestion,
    handleSavePlayerProfileChanges,
    handleRegeneratePokemonImage,
    fetchInitialNPCDialogueAndOrSuggestions,
    handleSendPlayerMessageToNPC,
    npcInteractionLoading,
    clearCustomizationAssistantResponse,
  };
};
