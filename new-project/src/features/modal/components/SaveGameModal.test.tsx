import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useModal } from '../../../hooks/useModal';
import { useGameStore } from '../../../store/gameStore';
import { SaveGameModal } from './SaveGameModal';
import type { SaveSlotSummary } from '../../../types';

// Mock hooks
vi.mock('../../../hooks/useModal');
vi.mock('../../../store/gameStore');

const mockUseModal = vi.mocked(useModal);
const mockUseGameStore = vi.mocked(useGameStore);

const mockSavedGames: SaveSlotSummary[] = [
  { slotId: 1, timestamp: Date.now(), playerProfile: { name: '小智' }, isEmpty: false },
  { slotId: 2, timestamp: 0, playerProfile: { name: '空插槽' }, isEmpty: true },
  { slotId: 3, timestamp: 0, playerProfile: { name: '空插槽' }, isEmpty: true },
];

describe('SaveGameModal', () => {
  const fetchSavedGames = vi.fn();
  const saveGame = vi.fn();
  const closeModal = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseModal.mockReturnValue({
      isOpen: true,
      openModal: vi.fn(),
      closeModal: closeModal,
    });
    mockUseGameStore.mockReturnValue({
      savedGames: mockSavedGames,
      fetchSavedGames: fetchSavedGames,
      saveGame: saveGame,
    });
  });

  it('should not render if isOpen is false', () => {
    mockUseModal.mockReturnValueOnce({ isOpen: false, openModal: vi.fn(), closeModal });
    render(<SaveGameModal />);
    expect(screen.queryByText('保存游戏')).toBeNull();
  });

  it('should render the modal with save slots when open', () => {
    render(<SaveGameModal />);
    expect(screen.getByText('保存游戏')).toBeInTheDocument();
    expect(screen.getByText('小智')).toBeInTheDocument();
    expect(screen.getAllByText('空插槽')).toHaveLength(2);
  });

  it('should call fetchSavedGames on mount if open', () => {
    render(<SaveGameModal />);
    expect(fetchSavedGames).toHaveBeenCalledTimes(1);
  });

  it('should enable save button only when a slot is selected', () => {
    render(<SaveGameModal />);
    const saveButton = screen.getByRole('button', { name: '保存' });
    expect(saveButton).toBeDisabled();

    fireEvent.click(screen.getByText('小智'));
    expect(saveButton).not.toBeDisabled();
  });

  it('should call saveGame and closeModal when save button is clicked', async () => {
    saveGame.mockResolvedValue(undefined);
    render(<SaveGameModal />);

    fireEvent.click(screen.getAllByText('空插槽')[0]); // Select the first empty slot (slot 2)
    const saveButton = screen.getByRole('button', { name: '保存' });
    fireEvent.click(saveButton);

    expect(saveGame).toHaveBeenCalledWith(2);
    // Use a small timeout to allow for the async saveGame to resolve
    await new Promise(r => setTimeout(r, 0));
    expect(closeModal).toHaveBeenCalledTimes(1);
  });

  it('should call closeModal when the close button is clicked', () => {
    render(<SaveGameModal />);
    const closeButton = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeButton);
    expect(closeModal).toHaveBeenCalledTimes(1);
  });
});