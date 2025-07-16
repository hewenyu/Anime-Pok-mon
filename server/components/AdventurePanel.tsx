import React, { useState, useEffect } from 'react';
import {
  StorySegment,
  PlayerProfile,
  AIStoryResponse,
  GameState,
  Pokemon,
  StoryChoice,
  AIStoryChoice,
  LoadingStatus,
} from '../types';

interface AdventurePanelProps {
  currentStaticContent: StorySegment | null;
  currentAIContent: AIStoryResponse | null;
  playerProfile: PlayerProfile;
  playerTeam: Pokemon[];
  onStaticChoiceSelect: (choice: StoryChoice) => void;
  onAIChoiceSelect: (choice: AIStoryChoice) => void;
  onPlayerCustomInputAction: (inputText: string) => void;
  gameState: GameState;
  aiLoadingStatus: LoadingStatus;
  onToggleHistoryModal: () => void;
  onToggleNPCListModal: () => void;
}

const AdventurePanel: React.FC<AdventurePanelProps> = ({
  currentStaticContent,
  currentAIContent,
  playerProfile,
  playerTeam,
  onStaticChoiceSelect,
  onAIChoiceSelect,
  onPlayerCustomInputAction,
  gameState,
  aiLoadingStatus,
  onToggleHistoryModal,
  onToggleNPCListModal,
}) => {
  const [customInputText, setCustomInputText] = useState('');
  const [persistentImageUrl, setPersistentImageUrl] = useState<
    string | undefined
  >(undefined);
  const isLoading = aiLoadingStatus.status !== 'idle';

  useEffect(() => {
    let newImageSource: string | undefined | null = null;

    if (currentAIContent) {
      if (Object.prototype.hasOwnProperty.call(currentAIContent, 'imageUrl')) {
        newImageSource = currentAIContent.imageUrl;
      }
    } else if (currentStaticContent) {
      newImageSource = currentStaticContent.imageUrl;
    } else {
      // No change instruction if both are null (e.g. during loading)
    }

    if (newImageSource !== null) {
      setPersistentImageUrl(newImageSource ? newImageSource : undefined);
    }
  }, [currentAIContent, currentStaticContent]);

  let displaySpeaker: string | undefined = '旁白';
  let displayText: string = '';
  let displayChoicesElements: JSX.Element | null = null;

  if (currentAIContent) {
    displaySpeaker = currentAIContent.speaker || playerProfile.name;
    displayText = currentAIContent.narrative;
  } else if (currentStaticContent) {
    const seg = currentStaticContent;
    displaySpeaker =
      typeof seg.speaker === 'function'
        ? seg.speaker(playerProfile)
        : seg.speaker;
    displayText =
      typeof seg.text === 'function'
        ? seg.text(playerProfile, playerTeam)
        : seg.text;
  } else {
    if (isLoading) {
      const lastAiNarrativeEntry = [...gameState.chatHistory]
        .reverse()
        .find(entry => entry.type === 'ai' || entry.type === 'static');
      if (lastAiNarrativeEntry) {
        displayText = lastAiNarrativeEntry.narrative;
        displaySpeaker = lastAiNarrativeEntry.speaker;
      } else {
        displayText = ' ';
      }
    } else {
      displayText = '冒险即将开始，或请选择一个行动。';
    }
  }

  if (!isLoading) {
    if (currentAIContent?.choices && currentAIContent.choices.length > 0) {
      displayChoicesElements = (
        <div className="space-y-3">
          {currentAIContent.choices.map((choice, index) => (
            <button
              key={`ai-choice-${index}`}
              onClick={() => onAIChoiceSelect(choice)}
              className="choice-button w-full text-left"
              title={choice.tooltip}
              aria-label={`AI选择: ${choice.text}`}
            >
              {choice.text}
            </button>
          ))}
        </div>
      );
    } else if (
      currentStaticContent?.choices &&
      currentStaticContent.choices.length > 0
    ) {
      displayChoicesElements = (
        <div className="space-y-3">
          {currentStaticContent.choices.map((choice, index) => {
            const isDisabled = choice.disabled
              ? choice.disabled(gameState)
              : false;
            let buttonText = choice.text;
            if (
              choice.isBattleTrigger ||
              choice.actionTag?.startsWith('STATIC_BATTLE_TRIGGER_')
            ) {
              buttonText += ' (触发战斗)';
            }
            return (
              <button
                key={`static-choice-${index}`}
                onClick={() => onStaticChoiceSelect(choice)}
                disabled={isDisabled}
                className={`choice-button w-full text-left ${isDisabled ? 'opacity-60' : ''}`}
                aria-label={`选择: ${buttonText}`}
              >
                {buttonText}
              </button>
            );
          })}
        </div>
      );
    }
  }

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomInputText(e.target.value);
  };

  const handleCustomInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInputText.trim() && !isLoading) {
      onPlayerCustomInputAction(customInputText.trim());
      setCustomInputText('');
    }
  };

  const lastPlayerInputAction =
    gameState.chatHistory.length > 0 &&
    gameState.chatHistory[gameState.chatHistory.length - 1].type ===
      'player_input' &&
    Date.now() -
      gameState.chatHistory[gameState.chatHistory.length - 1].timestamp <
      8000
      ? gameState.chatHistory[gameState.chatHistory.length - 1]
      : null;

  return (
    <div className="flex flex-col h-full adventure-text-box">
      <div className="flex-grow mb-4 overflow-y-auto p-1 custom-scrollbar">
        {persistentImageUrl && (
          <img
            src={persistentImageUrl}
            alt="场景图片"
            className="float-left w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 mr-4 mb-3 rounded-lg object-cover shadow-lg border-2 border-purple-400/30"
          />
        )}
        {displaySpeaker && (
          <p className="font-bold text-xl mb-2 text-yellow-300 drop-shadow-sm">
            {displaySpeaker}:
          </p>
        )}
        <p className="text-lg whitespace-pre-wrap leading-relaxed clear-both text-indigo-50">
          {displayText}
        </p>

        {lastPlayerInputAction &&
          (isLoading ||
            (currentAIContent &&
              Date.now() - lastPlayerInputAction.timestamp < 3000)) && (
            <p className="text-lg whitespace-pre-wrap leading-relaxed italic text-cyan-300 mt-3 animate-message-appear clear-both">
              <span className="font-bold not-italic text-yellow-300">
                {lastPlayerInputAction.speaker}:
              </span>{' '}
              &gt; {lastPlayerInputAction.narrative}
            </p>
          )}

        {isLoading && (
          <p className="text-sky-300 italic mt-2 animate-pulse clear-both pt-1">
            {aiLoadingStatus.message || 'AI 正在生成后续剧情...'}
          </p>
        )}
      </div>

      {!isLoading && displayChoicesElements && (
        <div className="mb-4">{displayChoicesElements}</div>
      )}

      {(currentAIContent ||
        (currentStaticContent &&
          currentStaticContent.isAIHandoff &&
          !isLoading) ||
        (!currentStaticContent && !currentAIContent && !isLoading)) && (
        <form
          onSubmit={handleCustomInputSubmit}
          className="mt-auto pt-4 border-t border-purple-600/50"
        >
          <label htmlFor="customPlayerInput" className="label-text block mb-2">
            你想做什么？ (输入你的行动)
          </label>
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
            <input
              type="text"
              id="customPlayerInput"
              value={customInputText}
              onChange={handleCustomInputChange}
              className="input-field flex-grow"
              placeholder="例如：查看四周，和皮卡丘说话..."
              disabled={isLoading}
              aria-label="自定义玩家行动输入"
            />
            <div className="flex gap-2 flex-shrink-0">
              <button
                type="submit"
                className="choice-button secondary px-5 py-2.5"
                disabled={isLoading || !customInputText.trim()}
              >
                发送
              </button>
              <button
                type="button"
                onClick={onToggleHistoryModal}
                className="choice-button px-4 py-2.5"
                disabled={isLoading}
                aria-label="查看历史对话"
              >
                历史
              </button>
              <button
                type="button"
                onClick={onToggleNPCListModal}
                className="choice-button px-4 py-2.5"
                disabled={isLoading}
                aria-label="与NPC交流"
              >
                交流
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default AdventurePanel;
