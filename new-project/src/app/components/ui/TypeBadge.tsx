import React from 'react';
import { PokemonType } from '@/types';
import { cn } from '@/utils/cn'; // Assuming a utility for conditional classes

interface TypeBadgeProps {
  type: PokemonType;
  className?: string;
}

const typeColorMap: Record<PokemonType, string> = {
  [PokemonType.NORMAL]: 'bg-gray-400 text-white',
  [PokemonType.FIRE]: 'bg-red-500 text-white',
  [PokemonType.WATER]: 'bg-blue-500 text-white',
  [PokemonType.GRASS]: 'bg-green-500 text-white',
  [PokemonType.ELECTRIC]: 'bg-yellow-400 text-black',
  [PokemonType.ICE]: 'bg-cyan-300 text-black',
  [PokemonType.FIGHTING]: 'bg-orange-700 text-white',
  [PokemonType.POISON]: 'bg-purple-600 text-white',
  [PokemonType.GROUND]: 'bg-amber-600 text-white',
  [PokemonType.FLYING]: 'bg-indigo-400 text-white',
  [PokemonType.PSYCHIC]: 'bg-pink-500 text-white',
  [PokemonType.BUG]: 'bg-lime-500 text-black',
  [PokemonType.ROCK]: 'bg-stone-500 text-white',
  [PokemonType.GHOST]: 'bg-violet-700 text-white',
  [PokemonType.DRAGON]: 'bg-teal-600 text-white',
  [PokemonType.DARK]: 'bg-zinc-700 text-white',
  [PokemonType.STEEL]: 'bg-slate-500 text-white',
  [PokemonType.FAIRY]: 'bg-rose-400 text-white',
};

export const TypeBadge: React.FC<TypeBadgeProps> = ({ type, className }) => {
  const colorClass = typeColorMap[type] || 'bg-gray-200 text-gray-800';

  return (
    <span
      className={cn(
        'inline-block rounded-full px-3 py-1 text-sm font-semibold',
        colorClass,
        className
      )}
    >
      {type}
    </span>
  );
};