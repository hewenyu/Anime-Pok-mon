import React, { useState, useEffect } from 'react';
import { PlayerProfile } from '../types';
import ActionButton from './ActionButton';
import { getSavedGames } from '../utils/gameStateStorage';

type SaveSlotSummary = {
  slotId: number;
  timestamp: number;
  playerProfile: PlayerProfile;
};

interface MainMenuProps {
  onLoadGame: (slotId: number) => void;
  onNewGame: () => void;
  onDeleteGame: (slotId: number) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({
  onLoadGame,
  onNewGame,
  onDeleteGame,
}) => {
  const [savedGames, setSavedGames] = useState<SaveSlotSummary[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  useEffect(() => {
    const fetchSavedGames = async () => {
      const games = await getSavedGames();
      setSavedGames(games);
      // Auto-select the most recent save if any exist
      if (games.length > 0) {
        const mostRecent = games.reduce((prev, current) =>
          prev.timestamp > current.timestamp ? prev : current
        );
        setSelectedSlot(mostRecent.slotId);
      }
    };
    fetchSavedGames();
  }, []);

  const formatSavedTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDeleteGame = async (slotId: number) => {
    if (confirm('确定要删除这个存档吗？此操作无法撤销。')) {
      await onDeleteGame(slotId);
      // Refresh the saved games list
      const games = await getSavedGames();
      setSavedGames(games);
      if (selectedSlot === slotId) {
        setSelectedSlot(null);
      }
    }
  };

  const renderSlot = (slotId: number) => {
    const existingSave = savedGames.find(g => g.slotId === slotId);
    const isSelected = selectedSlot === slotId;

    return (
      <div
        key={slotId}
        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
          isSelected
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onClick={() => setSelectedSlot(slotId)}
      >
        {existingSave ? (
          <div>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  {existingSave.playerProfile.name || '无名英雄'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {existingSave.playerProfile.description ||
                    '一段未知的旅程...'}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  存档于: {formatSavedTime(existingSave.timestamp)}
                </p>
              </div>
              <button
                onClick={e => {
                  e.stopPropagation();
                  handleDeleteGame(slotId);
                }}
                className="text-red-500 hover:text-red-700 text-sm px-2 py-1 border border-red-300 rounded hover:border-red-500"
              >
                删除
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">[ 空存档位 {slotId} ]</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-4xl w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">宝可梦冒险</h1>
          <p className="text-gray-600">选择存档或开始新的冒险</p>
        </div>

        <div className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">存档列表</h2>
          {[1, 2, 3].map(slotId => renderSlot(slotId))}
        </div>

        <div className="flex justify-center space-x-4">
          {selectedSlot !== null && (
            <ActionButton
              onClick={() => onLoadGame(selectedSlot)}
              className="choice-button bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg"
            >
              继续冒险
            </ActionButton>
          )}
          <ActionButton
            onClick={onNewGame}
            className="choice-button bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg"
          >
            开始新游戏
          </ActionButton>
        </div>
      </div>
    </div>
  );
};

export default MainMenu;
