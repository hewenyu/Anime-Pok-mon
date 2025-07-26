import React from 'react';
import { useCharacterStore } from '../../../store/characterStore';
import { useGameStore } from '../../../store/gameStore';
import { useUIStore } from '../../../store/uiStore';
import StatBar from '../../../app/components/ui/atoms/StatBar';

const PlayerInfoPanel: React.FC = () => {
  const { profile, stats, healthStatus, money } = useCharacterStore();
  const { location, objective, areaMap, gameTime } = useGameStore();
  const openModal = useUIStore((state) => state.openModal);

  return (
    <div className="p-4 bg-gray-800 text-white rounded-lg border border-gray-700 h-full flex flex-col">
      <div className="text-center mb-2">
        Time: {gameTime}
      </div>
      
      <div className="mb-4">
        <h2 
          className="text-xl font-bold cursor-pointer hover:text-yellow-400"
          onClick={() => openModal('editProfile')}
        >
          {profile.name}
        </h2>
        <p className="text-sm text-gray-400">Age: {profile.age}</p>
        <p className="text-sm text-gray-400">Gender: {profile.gender}</p>
        <p className="italic text-gray-300 mt-1">"{profile.description}"</p>
      </div>

      <div className="space-y-2 mb-4">
        <StatBar 
          label="Stamina" 
          current={stats.stamina} 
          max={stats.maxStamina} 
          barColorClass="bg-green-500" 
        />
        <StatBar 
          label="Energy" 
          current={stats.energy} 
          max={stats.maxEnergy} 
          barColorClass="bg-blue-500" 
        />
      </div>

      <div className="mb-4">
        <p>Status: <span className="font-semibold text-green-400">{healthStatus}</span></p>
        <p>Money: <span className="font-semibold text-yellow-500">${money}</span></p>
      </div>

      <div className="mb-4">
        <p><span className="font-bold">Location:</span> {location}</p>
        <p><span className="font-bold">Objective:</span> {objective}</p>
      </div>

      <pre className="bg-black p-2 rounded text-xs leading-tight font-mono whitespace-pre-wrap mb-4">
        {areaMap}
      </pre>

      <div className="mt-auto space-y-2">
        <button 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => openModal('worldMap')}
        >
          View World Map
        </button>
        <button 
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => openModal('saveGame')}
        >
          Save Game
        </button>
      </div>
    </div>
  );
};

export default PlayerInfoPanel;