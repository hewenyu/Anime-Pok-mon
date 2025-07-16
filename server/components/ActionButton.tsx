
import React from 'react';
import { TYPE_COLORS } from '../constants'; // For move type specific colors
import { PokemonType } from '../types';

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'move';
  moveType?: PokemonType; // for move buttons
}

const ActionButton: React.FC<ActionButtonProps> = ({ children, className, variant = 'primary', moveType, ...props }) => {
  // Base style from index.html for 'choice-button'
  let baseStyle = "choice-button"; 
  
  // Specific styles for different variants
  let variantStyle = "";
  if (variant === 'move' && moveType) {
    // TYPE_COLORS returns Tailwind classes like "bg-red-600 text-white".
    // For more complex gradient or specific anime button styles, we might need custom CSS per type
    // or make TYPE_COLORS return style objects/more specific classes.
    // For now, we'll leverage TYPE_COLORS and assume they are styled adequately by global CSS or can be overridden.
    // The base 'choice-button' style from index.html will provide the general shape and feel.
    // We can add a specific class if needed for further CSS targeting.
    variantStyle = TYPE_COLORS[moveType] || 'bg-gray-500 text-white'; // Fallback if type color not found
    // To ensure it doesn't conflict with the pink default 'choice-button' gradient, we remove and re-add.
    // This is a bit of a hack; ideally, choice-button variants would be distinct classes.
    baseStyle = ""; // Clear base if it's a move, as TYPE_COLORS provides bg
    variantStyle = `choice-button ${variantStyle}`; // Re-apply base shape, then specific move colors
  } else if (variant === 'primary') {
    // Primary is already the default choice-button style (pink)
    variantStyle = ""; 
  } else if (variant === 'secondary') {
    // For secondary actions, use the .secondary variant of choice-button
    variantStyle = "secondary";
  }


  return (
    <button
      className={`${baseStyle} ${variantStyle} ${className || ''} w-full`} // Ensure buttons take full width in grids
      {...props}
    >
      {children}
    </button>
  );
};

export default ActionButton;
