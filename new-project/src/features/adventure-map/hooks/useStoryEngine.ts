import { useCallback } from 'react';
import { useGameStore } from '../../../store/gameStore';
import { fetchStoryContinuation } from '../../../services/storyService';

export const useStoryEngine = () => {
  const store = useGameStore();
  const { storyState, isStoryLoading, setStoryState, setIsStoryLoading } = store;

  const handleChoice = useCallback(async (choiceId: string) => {
    setIsStoryLoading(true);
    try {
      const newState = await fetchStoryContinuation(store, {
        type: 'choice',
        value: choiceId,
      });
      setStoryState(newState);
    } catch (error) {
      console.error('Error handling choice:', error);
      // Optionally, set an error state in the store
    } finally {
      setIsStoryLoading(false);
    }
  }, [store, setIsStoryLoading, setStoryState]);

  const handleCustomInput = useCallback(async (inputText: string) => {
    if (!inputText.trim()) return;

    setIsStoryLoading(true);
    try {
      const newState = await fetchStoryContinuation(store, {
        type: 'custom',
        value: inputText,
      });
      setStoryState(newState);
    } catch (error) {
      console.error('Error handling custom input:', error);
    } finally {
      setIsStoryLoading(false);
    }
  }, [store, setIsStoryLoading, setStoryState]);

  return {
    narrative: storyState.narrative,
    speaker: storyState.speaker,
    imageUrl: storyState.imageUrl,
    choices: storyState.choices,
    isLoading: isStoryLoading,
    handleChoice,
    handleCustomInput,
  };
};