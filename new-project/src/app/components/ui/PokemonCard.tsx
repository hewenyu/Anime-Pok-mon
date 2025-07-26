import React from 'react';
import type { Pokemon } from '../../../store/characterStore';

interface PokemonCardProps {
  pokemon: Pokemon;
  onClick: (pokemonId: string) => void;
}

const PokemonCard: React.FC<PokemonCardProps> = ({ pokemon, onClick }) => {
  return (
    <div 
      className="p-2 bg-gray-700 rounded-lg border border-gray-600 cursor-pointer hover:bg-gray-600"
      onClick={() => onClick(pokemon.id)}
    >
      <p className="font-bold">{pokemon.name}</p>
      <p className="text-sm">Lv. {pokemon.level}</p>
    </div>
  );
};

export default PokemonCard;