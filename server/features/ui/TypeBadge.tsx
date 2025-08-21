import React from 'react';
import { PokemonType } from '../types';
import { TYPE_COLORS } from '../constants'; // TYPE_COLORS contains Tailwind classes

interface TypeBadgeProps {
  type: PokemonType;
}

const TypeBadge: React.FC<TypeBadgeProps> = ({ type }) => {
  // TYPE_COLORS provides Tailwind classes like 'bg-red-600 text-white'
  // These will be combined with the new base CSS for general badge shape/shadow.
  // The specific background/text color will come from TYPE_COLORS.
  const colorClass = TYPE_COLORS[type] || 'bg-gray-400 text-black'; // Fallback

  // We add a base class for common styling (padding, font, shadow) defined in index.html's CSS
  const baseBadgeStyle = 'type-badge-base';

  return <span className={`${baseBadgeStyle} ${colorClass}`}>{type}</span>;
};

export default TypeBadge;
