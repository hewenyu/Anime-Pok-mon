import React, { useState } from 'react';
import { useStoryEngine } from '../hooks/useStoryEngine';
import { useModal } from '../../../hooks/useModal';

const AdventurePanel: React.FC = () => {
  const {
    narrative,
    speaker,
    imageUrl,
    choices,
    isLoading,
    handleChoice,
    handleCustomInput,
  } = useStoryEngine();

  const [customInputText, setCustomInputText] = useState('');
  const { openModal: openSaveModal } = useModal('saveGame');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInputText.trim() && !isLoading) {
      handleCustomInput(customInputText.trim());
      setCustomInputText('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-800 p-4 rounded-lg shadow-lg text-white">
      <div className="flex-grow mb-4 overflow-y-auto pr-2">
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Scene"
            className="float-left w-32 h-32 mr-4 mb-2 rounded-md object-cover border-2 border-gray-600"
          />
        )}
        <p className="font-bold text-lg text-yellow-400 mb-2 clear-both">{speaker}:</p>
        <p className="whitespace-pre-wrap leading-relaxed">{narrative}</p>
        {isLoading && (
          <p className="text-blue-400 italic mt-2 animate-pulse">
            正在加载...
          </p>
        )}
      </div>

      <div className="space-y-2 mb-4">
        {choices.map((choice) => (
          <button
            key={choice.id}
            onClick={() => handleChoice(choice.id)}
            disabled={isLoading || choice.disabled}
            className="w-full text-left p-3 bg-gray-700 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {choice.text}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-auto pt-4 border-t border-gray-700">
        <label htmlFor="custom-input" className="block text-sm font-medium mb-1">
          或者，你想做什么？
        </label>
        <div className="flex gap-2">
          <input
            id="custom-input"
            type="text"
            value={customInputText}
            onChange={(e) => setCustomInputText(e.target.value)}
            placeholder="输入你的行动..."
            disabled={isLoading}
            className="flex-grow bg-gray-900 border border-gray-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
          <button
            type="submit"
            disabled={isLoading || !customInputText.trim()}
            className="px-4 py-2 bg-yellow-600 rounded-md hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            执行
          </button>
          <button
            type="button"
            onClick={openSaveModal}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            保存
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdventurePanel;