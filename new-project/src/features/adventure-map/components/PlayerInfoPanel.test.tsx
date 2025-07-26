import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import PlayerInfoPanel from './PlayerInfoPanel';

const mockOpenModal = vi.fn();

vi.mock('../../../store/characterStore', () => ({
  useCharacterStore: vi.fn().mockReturnValue({
    profile: {
      name: 'Ash',
      age: 15,
      gender: 'Male',
      description: 'A young trainer',
    },
    stats: {
      stamina: 80,
      maxStamina: 100,
      energy: 60,
      maxEnergy: 100,
    },
    healthStatus: 'Healthy',
    money: 500,
  }),
}));

vi.mock('../../../store/gameStore', () => ({
  useGameStore: vi.fn().mockReturnValue({
    location: 'Pallet Town',
    objective: 'Become a Pokemon Master',
    areaMap: `
      #######
      # P   #
      #######
    `,
    gameTime: 'Day 1, 09:00 AM',
  }),
}));

vi.mock('../../../store/uiStore', () => ({
  useUIStore: vi.fn((selector) => selector({ openModal: mockOpenModal })),
}));


describe('PlayerInfoPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders player profile information correctly', () => {
    render(<PlayerInfoPanel />);
    expect(screen.getByText('Ash')).toBeInTheDocument();
    expect(screen.getByText(/Age: 15/)).toBeInTheDocument();
    expect(screen.getByText(/Gender: Male/)).toBeInTheDocument();
    expect(screen.getByText(/"A young trainer"/)).toBeInTheDocument();
  });

  it('renders player stats using StatBar', () => {
    render(<PlayerInfoPanel />);
    expect(screen.getByText('Stamina:')).toBeInTheDocument();
    expect(screen.getByText('80 / 100')).toBeInTheDocument();
    expect(screen.getByText('Energy:')).toBeInTheDocument();
    expect(screen.getByText('60 / 100')).toBeInTheDocument();
  });

  it('renders health status and money', () => {
    render(<PlayerInfoPanel />);
    expect(screen.getByText('Status:')).toBeInTheDocument();
    expect(screen.getByText('Healthy')).toBeInTheDocument();
    expect(screen.getByText('Money:')).toBeInTheDocument();
    expect(screen.getByText('$500')).toBeInTheDocument();
  });

  it('renders game information', () => {
    render(<PlayerInfoPanel />);
    expect(screen.getByText(/Time: Day 1, 09:00 AM/)).toBeInTheDocument();
    expect(screen.getByText('Location:')).toBeInTheDocument();
    expect(screen.getByText('Pallet Town')).toBeInTheDocument();
    expect(screen.getByText('Objective:')).toBeInTheDocument();
    expect(screen.getByText('Become a Pokemon Master')).toBeInTheDocument();
    const mapElement = screen.getByText(/# P/);
    expect(mapElement.textContent).toContain('# P   #');
  });

  it('renders action buttons', () => {
    render(<PlayerInfoPanel />);
    expect(screen.getByRole('button', { name: 'View World Map' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Game' })).toBeInTheDocument();
  });

  it("calls openModal with 'editProfile' when player name is clicked", () => {
    render(<PlayerInfoPanel />);
    fireEvent.click(screen.getByText('Ash'));
    expect(mockOpenModal).toHaveBeenCalledWith('editProfile');
  });

  it("calls openModal with 'worldMap' when 'View World Map' button is clicked", () => {
    render(<PlayerInfoPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'View World Map' }));
    expect(mockOpenModal).toHaveBeenCalledWith('worldMap');
  });

  it("calls openModal with 'saveGame' when 'Save Game' button is clicked", () => {
    render(<PlayerInfoPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Save Game' }));
    expect(mockOpenModal).toHaveBeenCalledWith('saveGame');
  });
});