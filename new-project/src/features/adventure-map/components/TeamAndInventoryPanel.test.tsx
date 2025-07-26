import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import TeamAndInventoryPanel from './TeamAndInventoryPanel';
import { useCharacterStore, type Pokemon } from '../../../store/characterStore';
import { useUIStore } from '../../../store/uiStore';

const mockOpenModal = vi.fn();

vi.mock('../../../app/components/ui/PokemonCard', () => ({
  __esModule: true,
  default: ({ pokemon, onClick }: { pokemon: Pokemon, onClick: (id: string) => void }) => (
    <div data-testid={`pokemon-card-${pokemon.id}`} onClick={() => onClick(pokemon.id)}>
      {pokemon.name}
    </div>
  ),
}));

vi.mock('../../../store/characterStore');
vi.mock('../../../store/uiStore', () => ({
  useUIStore: vi.fn((selector) => selector({ openModal: mockOpenModal })),
}));

describe('TeamAndInventoryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setup = (team: Pokemon[]) => {
    (useCharacterStore as vi.Mock).mockReturnValue({ team });
    return render(<TeamAndInventoryPanel />);
  };

  it('renders the inventory button', () => {
    setup([]);
    expect(screen.getByRole('button', { name: '背包' })).toBeInTheDocument();
  });

  it('shows a message when the team is empty', () => {
    setup([]);
    expect(screen.getByText('队伍中没有宝可梦。')).toBeInTheDocument();
  });

  it('renders a list of PokemonCards when the team is not empty', () => {
    const mockTeam: Pokemon[] = [
      { id: 'pika01', name: 'Pikachu', level: 5 },
      { id: 'char01', name: 'Charmander', level: 5 },
    ];
    setup(mockTeam);

    expect(screen.getByText('Pikachu')).toBeInTheDocument();
    expect(screen.getByText('Charmander')).toBeInTheDocument();
    expect(screen.queryByText('队伍中没有宝可梦。')).not.toBeInTheDocument();
  });

  it("calls openModal with 'inventory' when the inventory button is clicked", () => {
    setup([]);
    fireEvent.click(screen.getByRole('button', { name: '背包' }));
    expect(mockOpenModal).toHaveBeenCalledWith('inventory');
  });

  it("calls openModal with 'pokemonDetail' and payload when a PokemonCard is clicked", () => {
    const mockTeam: Pokemon[] = [{ id: 'pika01', name: 'Pikachu', level: 5 }];
    setup(mockTeam);

    fireEvent.click(screen.getByTestId('pokemon-card-pika01'));
    expect(mockOpenModal).toHaveBeenCalledWith('pokemonDetail', { pokemonId: 'pika01' });
  });
});