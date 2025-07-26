import React from 'react';
import type { Pokemon } from '@/types';
import StatBar from './atoms/StatBar';

interface PokemonCardProps {
  pokemon: Pokemon;
  onClick?: (pokemonId: string) => void;
  variant?: 'default' | 'compact';
}

export const PokemonCard: React.FC<PokemonCardProps> = ({ pokemon, onClick, variant = 'default' }) => {
  const handleClick = () => {
    if (onClick) {
      onClick(pokemon.id);
    }
  };

  if (variant === 'compact') {
    return (
      <div
        className="p-2 bg-gray-100 rounded-lg border border-gray-300 cursor-pointer hover:bg-gray-200 text-center"
        onClick={handleClick}
      >
        <img src={pokemon.imageUrl} alt={pokemon.name} className="w-16 h-16 mx-auto mb-2" />
        <p className="font-bold text-sm">{pokemon.name}</p>
        <p className="text-xs">Lv. {pokemon.level}</p>
        <StatBar
          current={pokemon.currentHp}
          max={pokemon.maxHp}
          label="HP"
          barColorClass="bg-green-500"
        />
      </div>
    );
  }

  // Default variant (could be expanded for other uses like battles)
  return (
    <div
      className="p-4 bg-white rounded-lg border border-gray-300 shadow-md cursor-pointer hover:shadow-lg"
      onClick={handleClick}
    >
      <div className="flex items-center">
        <img src={pokemon.imageUrl} alt={pokemon.name} className="w-24 h-24 mr-4" />
        <div>
          <p className="font-bold text-xl">{pokemon.name}</p>
          <p className="text-md">Lv. {pokemon.level}</p>
          <StatBar
            current={pokemon.currentHp}
            max={pokemon.maxHp}
            label="HP"
            barColorClass="bg-green-500"
          />
        </div>
      </div>
    </div>
  );
};