import { PokemonType } from '../types';

// Record mapping PokemonType to Tailwind CSS classes for styling type badges.
export const TYPE_COLORS: Record<PokemonType, string> = {
  [PokemonType.NORMAL]: 'bg-gray-400 text-black',
  [PokemonType.FIRE]: 'bg-red-600 text-white',
  [PokemonType.WATER]: 'bg-blue-500 text-white',
  [PokemonType.GRASS]: 'bg-green-500 text-white',
  [PokemonType.ELECTRIC]: 'bg-yellow-400 text-black',
  [PokemonType.FIGHTING]: 'bg-orange-700 text-white',
  [PokemonType.PSYCHIC]: 'bg-pink-500 text-white',
  [PokemonType.DARK]: 'bg-gray-800 text-white',
  [PokemonType.STEEL]: 'bg-neutral-400 text-black',
  [PokemonType.DRAGON]: 'bg-indigo-600 text-white',
  [PokemonType.FLYING]: 'bg-sky-400 text-white',
  [PokemonType.GROUND]: 'bg-yellow-600 text-white',
  [PokemonType.ROCK]: 'bg-yellow-700 text-white',
  [PokemonType.BUG]: 'bg-lime-500 text-white',
  [PokemonType.GHOST]: 'bg-purple-700 text-white',
  [PokemonType.ICE]: 'bg-cyan-300 text-sky-800',
  [PokemonType.POISON]: 'bg-purple-500 text-white',
  [PokemonType.FAIRY]: 'bg-pink-300 text-pink-800',
};