import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../../store/characterStore';
import { useGameStore } from '../../store/gameStore';

const MainMenuScreen: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useCharacterStore();
  const { setGameState } = useGameStore();

  // Set the game mode to MainMenu when the component mounts
  useEffect(() => {
    setGameState('MainMenu');
  }, [setGameState]);

  const hasCharacter = profile.name !== 'Player'; // Check against the default name

  const handleNewGame = () => {
    navigate('/character-creation');
  };

  const handleContinue = () => {
    if (hasCharacter) {
      navigate('/game');
    }
  };

  const handleSettings = () => {
    // Placeholder for settings functionality
    console.log('Settings button clicked');
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-800 text-white">
      <h1 className="text-5xl font-bold mb-12">游戏主菜单</h1>
      <div className="space-y-4">
        <button
          onClick={handleNewGame}
          className="w-64 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          新游戏
        </button>
        <button
          onClick={handleContinue}
          disabled={!hasCharacter}
          className="w-64 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          继续游戏
        </button>
        <button
          onClick={handleSettings}
          className="w-64 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
        >
          设置
        </button>
      </div>
    </div>
  );
};

export default MainMenuScreen;