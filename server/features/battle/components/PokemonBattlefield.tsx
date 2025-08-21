import React from 'react';
import { Pokemon } from '../../../types';
import PokemonCard from '../../../components/PokemonCard';

interface PokemonBattlefieldProps {
  enemyPokemon: Pokemon | null;
  activePlayerPokemon: Pokemon | null;
  onRegenerateImage: (instanceId: string) => void;
}

const PokemonBattlefield: React.FC<PokemonBattlefieldProps> = ({
  enemyPokemon,
  activePlayerPokemon,
  onRegenerateImage,
}) => {
  return (
    <>
      {/* Enemy Pokemon Section */}
      <div className="flex-grow flex flex-col justify-end items-center p-2 md:p-4 relative">
        {enemyPokemon && (
          <PokemonCard
            pokemon={enemyPokemon}
            isPlayerCard={false}
            isBattleCard={true}
            onRegenerateImage={onRegenerateImage}
          />
        )}
      </div>

      {/* Player Pokemon Section */}
      <div className="flex-grow flex flex-col justify-start items-center p-2 md:p-4 relative">
        {activePlayerPokemon && (
          <PokemonCard
            pokemon={activePlayerPokemon}
            isPlayerCard={true}
            isBattleCard={true}
            onRegenerateImage={onRegenerateImage}
          />
        )}
      </div>
    </>
  );
};

export default PokemonBattlefield;
