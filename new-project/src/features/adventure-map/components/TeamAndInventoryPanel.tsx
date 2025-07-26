import React from 'react';
import { useCharacterStore } from '../../../store/characterStore';
import { useUIStore } from '../../../store/uiStore';
import PokemonCard from '../../../app/components/ui/PokemonCard';

const TeamAndInventoryPanel: React.FC = () => {
  const { team } = useCharacterStore();
  const openModal = useUIStore((state) => state.openModal);

  return (
    <div className="p-4 bg-gray-800 text-white rounded-lg border border-gray-700 h-full flex flex-col">
      <button
        className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded mb-4"
        onClick={() => openModal('inventory')}
      >
        背包
      </button>
      
      <h2 className="text-xl font-semibold mb-2">同行宝可梦</h2>
      
      <div className="space-y-2 overflow-y-auto">
        {team.length > 0 ? (
          team.map((pokemon) => (
            <PokemonCard 
              key={pokemon.id} 
              pokemon={pokemon} 
              onClick={() => openModal('pokemonDetail', { pokemonId: pokemon.id })} 
            />
          ))
        ) : (
          <p className="text-gray-400">队伍中没有宝可梦。</p>
        )}
      </div>
    </div>
  );
};

export default TeamAndInventoryPanel;