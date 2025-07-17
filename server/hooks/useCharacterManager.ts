import { useCallback } from 'react';
import {
  PlayerProfile,
  Pokemon,
  InventoryItem,
  GameState,
  CustomizedStartData,
  UserDateTimeInput,
  AIEventTrigger,
  AICustomizationScreenActionTag,
  ChatHistoryEntry,
  FullProfileSuggestionData,
  ClassifiedIntent,
  ProfileDataForTimeSuggestion,
} from '../types';
import {
  INITIAL_GAME_STATE,
  GEMINI_GENERAL_CUSTOMIZATION_CHAT_SYSTEM_PROMPT,
  GEMINI_FULL_PROFILE_CREATOR_SYSTEM_PROMPT,
  GEMINI_STARTER_POKEMON_SUGGESTOR_SYSTEM_PROMPT,
  GEMINI_STARTER_ITEM_SUGGESTOR_SYSTEM_PROMPT,
  GEMINI_PROFILE_FIELD_ADVISOR_SYSTEM_PROMPT,
  GEMINI_OBJECTIVE_LOCATION_MONEY_ADVISOR_SYSTEM_PROMPT,
  GEMINI_GAME_TIME_ADVISOR_SYSTEM_PROMPT,
  GEMINI_DYNAMIC_GAME_TIME_SUGGESTOR_SYSTEM_PROMPT,
  GEMINI_RANDOM_DESCRIPTION_GENERATOR_ASSISTANT_PROMPT,
} from '../constants';
import { sanitizePokemonData, sanitizeItemData } from '../utils/dataSanitizers';
import {
  classifyCustomizationIntent,
  fetchStoryContinuation,
  OnRetryCallback,
} from '../services/geminiService';

// Helper from useGameLogic, needed for profile creation
const userDateTimeToTimestamp = (input: UserDateTimeInput): number => {
  const jsYear = input.year;
  const jsMonth = input.month - 1;
  return new Date(
    jsYear,
    jsMonth,
    input.day,
    input.hour,
    input.minute
  ).getTime();
};

type UpdateGameStateFunction = (
  updater: (prevState: GameState) => GameState,
  timeAdvanceOptions?: { minutes?: number; hours?: number }
) => void;

export const useCharacterManager = (
  gameState: GameState,
  updateGameState: UpdateGameStateFunction,
  triggerAIStory: (
    playerActionTagOrInput?: string,
    isCustomizationScreenActionContext?: boolean
  ) => void
) => {
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
      aiSuggestedGameStartTime: undefined,
      currentGameTime: new Date().getTime(),
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
        currentGameTime: startTime,
      }));
      triggerAIStory('START_ADVENTURE_WITH_CUSTOMIZED_PROFILE');
    },
    [updateGameState, triggerAIStory, gameState.aiSuggestedGameStartTime]
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
        let newCurrentGameTime = prev.currentGameTime;
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
                newCurrentGameTime = newAiSuggestedStartTime;
            }
            break;
          }
          case 'gameTimeUpdate': {
            const timeInput = value as UserDateTimeInput;
            newCurrentGameTime = userDateTimeToTimestamp(timeInput);
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
        newState.aiSuggestedGameStartTime = newAiSuggestedStartTime;
        newState.currentGameTime = newCurrentGameTime;

        return newState;
      });
    },
    [updateGameState]
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
            contextForSpecializedAgent = `玩家要求基于以下主题或描述创建一个完整的角色档案：“${classifiedIntent.params?.theme || classifiedIntent.originalQuery}”。请严格遵循 \`GEMINI_FULL_PROFILE_CREATOR_SYSTEM_PROMPT\` 的指示生成JSON响应，包括一个合适的 \`suggestedGameStartTime\` (Unix 毫秒时间戳)。`;
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
          case 'SUGGEST_GAME_START_TIME_BASED_ON_PROFILE':
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
        aiLoadingStatus: { status: 'idle' },
        customizationAssistantResponse: aiResponse,
        aiSuggestedGameStartTime:
          newAiSuggestedStartTime ?? prev.aiSuggestedGameStartTime,
      }));
    },
    [gameState, updateGameState]
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
        aiLoadingStatus: { status: 'idle' },
        customizationAssistantResponse: aiResponse,
      }));
    },
    [gameState, updateGameState]
  );

  const clearCustomizationAssistantResponse = useCallback(() => {
    updateGameState(prev => ({
      ...prev,
      customizationAssistantResponse: null,
      assistantChatJustRefreshed: true,
      aiLoadingStatus: { status: 'idle' },
    }));
  }, [updateGameState]);

  const processCharacterEvent = useCallback(
    (
      currentState: GameState,
      event: AIEventTrigger,
      customizationScreenActionTag?: AICustomizationScreenActionTag
    ): GameState => {
      let newPlayerTeam = [...currentState.playerTeam];
      const newInventory = [...currentState.inventory];
      let newMoney = currentState.money;
      let newPlayerProfile = { ...currentState.playerProfile };

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
        case 'UPDATE_MONEY':
          if (customizationScreenActionTag === 'GENERATE_FULL_RANDOM_PROFILE') {
            newMoney = event.quantity || 0;
          } else if (
            event.quantity &&
            event.quantity !== currentState.money &&
            currentState.gameMode === 'ADVENTURE'
          ) {
            newMoney = currentState.money + (event.quantity || 0);
          } else if (currentState.gameMode === 'CUSTOMIZE_RANDOM_START') {
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
      }
      return {
        ...currentState,
        playerProfile: newPlayerProfile,
        playerTeam: newPlayerTeam,
        inventory: newInventory,
        money: newMoney,
      };
    },
    []
  );

  return {
    handleReRollFullProfile,
    handleRequestGeneratePlayerDescription,
    handleStartAdventureWithCustomizedProfile,
    handleSavePlayerProfileChanges,
    processCharacterEvent,
    handleDirectCustomizationUpdate,
    handleSendCustomizationAssistantMessage,
    requestDynamicTimeSuggestion,
    clearCustomizationAssistantResponse,
    handleRequestAddRandomStarterViaMainButton,
    handleRequestNewItemViaMainButton,
  };
};