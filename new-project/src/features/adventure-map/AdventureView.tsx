import React, { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import PlayerInfoPanel from './components/PlayerInfoPanel';
import TeamAndInventoryPanel from './components/TeamAndInventoryPanel';

const AdventureView: React.FC = () => {
  const { setGameState } = useGameStore();

  useEffect(() => {
    setGameState('InGame');
  }, [setGameState]);

  return (
    <div className="grid grid-cols-12 grid-rows-1 h-screen bg-gray-900 text-white p-4 gap-4">
      {/* Left Panel */}
      <div className="col-span-3">
        <PlayerInfoPanel />
      </div>

      {/* Center Content */}
      <main className="col-span-6 bg-gray-800 p-4 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Game Map / Main Content</h2>
        <div className="flex items-center justify-center h-full">
          <p>Map will be here...</p>
        </div>
      </main>

      {/* Right Panel */}
      <div className="col-span-3">
        <TeamAndInventoryPanel />
      </div>
    </div>
  );
};

export default AdventureView;