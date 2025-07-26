import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TypeBadge } from './TypeBadge';
import { PokemonType } from '@/types';

describe('TypeBadge', () => {
  it('should render the type name', () => {
    render(<TypeBadge type={PokemonType.FIRE} />);
    expect(screen.getByText(PokemonType.FIRE)).toBeInTheDocument();
  });

  it('should apply the correct class for a given type', () => {
    const { container } = render(<TypeBadge type={PokemonType.WATER} />);
    // This is a basic test. We'll rely on the implementation to map types to colors.
    // A more robust test could check for specific color classes if they are standardized.
    expect(container.firstChild).toHaveClass('bg-blue-500');
  });

  it('should have a default class if type has no specific color', () => {
    // Assuming 'NORMAL' type might have a default gray color
    const { container } = render(<TypeBadge type={PokemonType.NORMAL} />);
    expect(container.firstChild).toHaveClass('bg-gray-400');
  });
});