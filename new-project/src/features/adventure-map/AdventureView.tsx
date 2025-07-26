import React, { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
// import PlayerInfoPanel from './components/PlayerInfoPanel';
// import TeamAndInventoryPanel from './components/TeamAndInventoryPanel';
import AdventurePanel from './components/AdventurePanel';

const AdventureView: React.FC = () => {
  const { setGameState } = useGameStore();

  useEffect(() => {
    setGameState('InGame');
  }, [setGameState]);

  return (
    <div className="grid grid-cols-12 grid-rows-1 h-screen bg-gray-900 text-white p-4 gap-4">
      {/* Left Panel */}
      <div className="col-span-3">{/* <PlayerInfoPanel /> */}</div>

      {/* Center Content */}
      <main className="col-span-6">
        <AdventurePanel />
      </main>

      {/* Right Panel */}
      <div className="col-span-3">{/* <TeamAndInventoryPanel /> */}</div>
    </div>
  );
};

export default AdventureView;