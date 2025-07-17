import { useState, useCallback, useEffect, useRef } from 'react';
import {
  GameState,
  GameMode,
  AIEventTrigger,
  AICustomizationScreenActionTag,
} from '../types';
import { INITIAL_GAME_STATE } from '../constants';
import { useSaveManager } from './useSaveManager';
import { useCharacterManager } from './useCharacterManager';
import { useStoryEngine } from './useStoryEngine';
import { useBattleManager } from './useBattleManager';

export const useGameLogic = () => {
  const [gameState, setGameState] = useState<GameState>(INITIAL_GAME_STATE);
  const [hasAttemptedInitialLoad, setHasAttemptedInitialLoad] = useState<boolean>(false);

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

  const setGameMode = useCallback((mode: GameMode) => {
    updateGameState(prev => ({ ...prev, gameMode: mode }));
  }, [updateGameState]);

  const processAIEventImpl = useRef<
    (
      currentState: GameState,
      event: AIEventTrigger,
      isNPCContext?: boolean,
      customizationScreenActionTag?: AICustomizationScreenActionTag
    ) => GameState
  >(() => {
    throw new Error('processAIEvent called before it was implemented.');
  });

  const processAIEventProxy = useCallback(
    (
      currentState: GameState,
      event: AIEventTrigger,
      isNPCContext: boolean = false,
      customizationScreenActionTag?: AICustomizationScreenActionTag
    ): GameState => {
      return processAIEventImpl.current(
        currentState,
        event,
        isNPCContext,
        customizationScreenActionTag
      );
    },
    []
  );

  const characterManager = useCharacterManager(gameState, updateGameState, triggerAIStoryWrapper);
  const storyEngine = useStoryEngine(gameState, updateGameState, processAIEventProxy, setGameMode, startBattleWrapper);
  const battleManager = useBattleManager(gameState, updateGameState, storyEngine.advanceStaticStory, triggerAIStoryWrapper);
  const saveManager = useSaveManager(gameState, setGameState);

  // Wrapper functions to handle dependencies correctly
  function triggerAIStoryWrapper(
    playerActionTagOrInput?: string,
    isCustomizationScreenActionContext?: boolean,
    imageRegenContext?: {
      pokemonInstanceIdToRegenerate: string;
      pokemonNameToRegenerate: string;
    }
  ) {
    return storyEngine.triggerAIStory(
      playerActionTagOrInput,
      isCustomizationScreenActionContext,
      imageRegenContext
    );
  }

  function startBattleWrapper(battleDetails: any) {
    return battleManager.startBattle(battleDetails);
  }

  const processAIEvent = useCallback(
    (
      currentState: GameState,
      event: AIEventTrigger,
      isNPCContext: boolean = false,
      customizationScreenActionTag?: AICustomizationScreenActionTag
    ): GameState => {
      const stateAfterChar = characterManager.processCharacterEvent(
        currentState,
        event,
        customizationScreenActionTag
      );
      const stateAfterStory = storyEngine.processStoryEvent(
        stateAfterChar,
        event
      );
      const stateAfterBattle = battleManager.processBattleEvent(
        stateAfterStory,
        event
      );
      return stateAfterBattle;
    },
    [characterManager, storyEngine, battleManager]
  );

  useEffect(() => {
    processAIEventImpl.current = processAIEvent;
  }, [processAIEvent]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setHasAttemptedInitialLoad(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (
      gameState.gameMode === GameMode.CUSTOMIZE_RANDOM_START &&
      !gameState.initialProfileGenerated &&
      gameState.aiLoadingStatus.status === 'idle' &&
      !saveManager.isLoadingFromSave &&
      !gameState.currentAIScene &&
      hasAttemptedInitialLoad
    ) {
      storyEngine.triggerAIStory('GENERATE_FULL_RANDOM_PROFILE', true);
    }
  }, [
    gameState.gameMode,
    gameState.initialProfileGenerated,
    gameState.aiLoadingStatus.status,
    gameState.currentAIScene,
    saveManager.isLoadingFromSave,
    hasAttemptedInitialLoad,
    storyEngine.triggerAIStory,
  ]);

  return {
    gameState,
    ...saveManager,
    ...characterManager,
    ...storyEngine,
    ...battleManager,
    // Exposing specific functions that components might need directly
    updateGameState,
    setGameMode,
  };
};
