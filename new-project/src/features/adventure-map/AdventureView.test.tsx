import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import AdventureView from './AdventureView';

// Mock the child components to isolate the test to AdventureView
vi.mock('./components/PlayerInfoPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="player-info-panel">Player Info Panel</div>,
}));

vi.mock('./components/TeamAndInventoryPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="team-inventory-panel">Team & Inventory Panel</div>,
}));

// Mock the store, as AdventureView uses it to set the game state
vi.mock('../../store/gameStore', () => ({
  useGameStore: () => ({
    setGameState: vi.fn(),
  }),
}));

describe('AdventureView', () => {
  it('renders the main layout and child panels', () => {
    render(<AdventureView />);

    // Check for the main content area
    expect(screen.getByText('Game Map / Main Content')).toBeInTheDocument();

    // Check if the mocked panels are rendered
    expect(screen.getByTestId('player-info-panel')).toBeInTheDocument();
    expect(screen.getByText('Player Info Panel')).toBeInTheDocument();

    expect(screen.getByTestId('team-inventory-panel')).toBeInTheDocument();
    expect(screen.getByText('Team & Inventory Panel')).toBeInTheDocument();
  });
});