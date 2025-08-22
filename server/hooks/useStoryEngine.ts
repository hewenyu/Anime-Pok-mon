import { useState, useCallback } from 'react';
import {
  GameState,
  GameMode,
  AIEventTrigger,
  AIStoryChoice,
  StoryChoice,
  ChatHistoryEntry,
  NPC,
  LoadingStatus,
  AICustomizationScreenActionTag,
  Pokemon,
  BattleTrigger,
} from '../types';
import {
  STORY_DATA,
  GEMINI_GAME_MASTER_SYSTEM_PROMPT,
  GEMINI_STRICT_ACTION_SYSTEM_PROMPT,
  GEMINI_NPC_CHAT_SYSTEM_PROMPT,
} from '../constants';
import {
  fetchStoryContinuation,
  fetchStoryContinuationStream,
  OnRetryCallback,
  OnStreamCallback,
} from '../services/geminiService';
import { sanitizeNPCData } from '../utils/dataSanitizers';

type UpdateGameStateFunction = (
  updater: (prevState: GameState) => GameState,
  timeAdvanceOptions?: { minutes?: number; hours?: number }
) => void;

type ProcessAIEventFunction = (
  currentState: GameState,
  event: AIEventTrigger,
  isNPCContext?: boolean,
  customizationScreenActionTag?: AICustomizationScreenActionTag
) => GameState;

export const useStoryEngine = (
  gameState: GameState,
  updateGameState: UpdateGameStateFunction,
  processAIEvent: ProcessAIEventFunction,
  setGameMode: (mode: GameMode) => void,
  startBattle: (
    battleDetails:
      | BattleTrigger
      | Partial<{
          enemyPokemon: Pokemon;
          battleReturnSegmentWin: string;
          battleReturnSegmentLose: string;
        }>
  ) => void
) => {
  const [currentStaticSegmentId, setCurrentStaticSegmentId] = useState<string>(
    'INITIAL_PROFILE_PREPARATION'
  );
  const [npcInteractionLoading, setNpcInteractionLoading] = useState(false);

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
          setGameMode(GameMode.ADVENTURE);
        }

        if (isNpcChatResponse) {
          // This logic is now inside the NPC handlers
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
    [gameState, updateGameState, processAIEvent, setGameMode]
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

            const resolvedSpeaker: string | undefined =
              typeof newSegment.speaker === 'function'
                ? newSegment.speaker(tempState.playerProfile)
                : newSegment.speaker;
            const resolvedText: string =
              typeof newSegment.text === 'function'
                ? newSegment.text(tempState.playerProfile, tempState.playerTeam)
                : newSegment.text;

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
        // eslint-disable-next-line no-console
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
          startBattle(currentSegment.triggerBattle);
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
      startBattle,
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
        startBattle({}); // The details are already in pendingBattleDetails
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
    [updateGameState, triggerAIStory, startBattle]
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
    [gameState, updateGameState]
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
      setSelectedNPCForChat(updatedCurrentNpcContext);

      updateGameState(prev => {
        const updatedNpcs = prev.knownNPCs.map(npc =>
          npc.id === npcId
            ? { ...npc, dialogueHistory: [...npc.dialogueHistory, playerEntry] }
            : npc
        );
        return { ...prev, knownNPCs: updatedNpcs };
      });
      setNpcChatSuggestions([]);

      const npcSystemPrompt = GEMINI_NPC_CHAT_SYSTEM_PROMPT;
      let npcChatPrompt = `NPC信息: { Name: ${currentNpcContext.name}, Description: "${currentNpcContext.description || '无特别说明'}", RelationshipToPlayer: "${currentNpcContext.relationshipStatus}" }\n`;
      npcChatPrompt += `玩家 (${gameState.playerProfile.name || '你'}) 与NPC ${currentNpcContext.name} 的对话历史 (最近5条，所有文本为中文):\n`;
      const recentHistory = updatedCurrentNpcContext.dialogueHistory.slice(-5);
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
        // eslint-disable-next-line no-console
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

  const processStoryEvent = useCallback(
    (currentState: GameState, event: AIEventTrigger): GameState => {
      let newObjective = currentState.currentObjective;
      let newLocation = currentState.currentLocationDescription;
      let newAreaMap = currentState.currentAreaMap;
      const newGlobalAreaMap = { ...currentState.globalAreaMap };
      const newKnownNPCs = [...currentState.knownNPCs];
      const currentSceneToUpdate = currentState.currentAIScene
        ? { ...currentState.currentAIScene }
        : { narrative: '', choices: [] };

      if (
        event.message &&
        currentSceneToUpdate &&
        currentState.gameMode !== GameMode.CUSTOMIZE_RANDOM_START
      ) {
        currentSceneToUpdate.narrative =
          (currentSceneToUpdate.narrative || '') + `\n\n(${event.message})`;
      }

      switch (event.type) {
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
        currentObjective: newObjective,
        currentLocationDescription: newLocation,
        currentAreaMap: newAreaMap,
        globalAreaMap: newGlobalAreaMap,
        knownNPCs: newKnownNPCs,
        currentAIScene:
          currentState.gameMode === GameMode.CUSTOMIZE_RANDOM_START
            ? currentState.currentAIScene
            : currentSceneToUpdate,
      };
    },
    []
  );

  return {
    currentStaticSegmentId,
    npcInteractionLoading,
    triggerAIStory,
    advanceStaticStory,
    handleStaticStoryChoice,
    handleAIChoice,
    handlePlayerCustomInputAction,
    fetchInitialNPCDialogueAndOrSuggestions,
    handleSendPlayerMessageToNPC,
    processStoryEvent,
    handleRegeneratePokemonImage,
  };
};
