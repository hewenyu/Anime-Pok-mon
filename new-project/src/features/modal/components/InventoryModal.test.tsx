import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryModal } from './InventoryModal';
import { useModal } from '@/hooks/useModal';
import { useCharacterStore } from '@/store/characterStore';
import { useUIStore } from '@/store/uiStore';
import type { InventoryItem, Pokemon } from '@/types';

// Mock dependencies
vi.mock('@/hooks/useModal');
vi.mock('@/store/characterStore');
vi.mock('@/store/uiStore');

const mockUseModal = vi.mocked(useModal);
const mockUseCharacterStore = vi.mocked(useCharacterStore);
const mockUseUiStore = vi.mocked(useUIStore);

const mockItems: InventoryItem[] = [
  { id: '1', name: '伤药', quantity: 10, description: '恢复20点HP' },
  { id: '2', name: '解毒药', quantity: 5, description: '治愈中毒状态' },
];

const mockPokemonTeam: Pokemon[] = [
  { id: 'p1', name: '皮卡丘', level: 12, currentHp: 35, maxHp: 35, types: [], imageUrl: '', moves: [] },
  { id: 'p2', name: '小火龙', level: 10, currentHp: 30, maxHp: 30, types: [], imageUrl: '', moves: [] },
];

describe('InventoryModal', () => {
  const closeModal = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseModal.mockReturnValue({
      isOpen: true,
      openModal: vi.fn(),
      closeModal: closeModal,
    });
    mockUseCharacterStore.mockReturnValue({
      inventory: [],
      team: [],
      // Add other required properties from CharacterStoreState
      profile: { name: 'Test Player', age: 10, gender: 'Other', description: '' },
      stats: { stamina: 100, maxStamina: 100, energy: 100, maxEnergy: 100 },
      healthStatus: 'Healthy',
      money: 1000,
      setProfile: vi.fn(),
    });
    mockUseUiStore.mockReturnValue({
      modalId: 'inventory',
      openModal: vi.fn(),
      closeModal: closeModal,
    });
  });

  it('should not render when modalId is not "inventory"', () => {
    mockUseUiStore.mockReturnValue({ isModalOpen: true, modalType: 'editProfile', modalPayload: null, openModal: vi.fn(), closeModal });
    render(<InventoryModal />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render correctly with tabs when open', () => {
    render(<InventoryModal />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('背包')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '物品' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '宝可梦' })).toBeInTheDocument();
  });

  it('should call closeModal when the close button is clicked', () => {
    render(<InventoryModal />);
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    expect(closeModal).toHaveBeenCalledTimes(1);
  });

  describe('Items Tab', () => {
    it('should display "背包是空的。" when inventory is empty', () => {
      render(<InventoryModal />);
      fireEvent.click(screen.getByRole('tab', { name: '物品' }));
      expect(screen.getByText('背包是空的。')).toBeInTheDocument();
    });

    it('should display list of items when inventory is not empty', () => {
      mockUseCharacterStore.mockReturnValue({
        inventory: mockItems,
        team: [],
        profile: { name: 'Test Player', age: 10, gender: 'Other', description: '' },
        stats: { stamina: 100, maxStamina: 100, energy: 100, maxEnergy: 100 },
        healthStatus: 'Healthy',
        money: 1000,
        setProfile: vi.fn(),
      });
      render(<InventoryModal />);
      fireEvent.click(screen.getByRole('tab', { name: '物品' }));
      expect(screen.getByText('伤药')).toBeInTheDocument();
      expect(screen.getByText('x10')).toBeInTheDocument();
      expect(screen.getByText('解毒药')).toBeInTheDocument();
      expect(screen.getByText('x5')).toBeInTheDocument();
    });

    it('should show item description on click', () => {
      mockUseCharacterStore.mockReturnValue({
        inventory: mockItems,
        team: [],
        profile: { name: 'Test Player', age: 10, gender: 'Other', description: '' },
        stats: { stamina: 100, maxStamina: 100, energy: 100, maxEnergy: 100 },
        healthStatus: 'Healthy',
        money: 1000,
        setProfile: vi.fn(),
      });
      render(<InventoryModal />);
      fireEvent.click(screen.getByRole('tab', { name: '物品' }));
      fireEvent.click(screen.getByText('伤药'));
      expect(screen.getByText('恢复20点HP')).toBeInTheDocument();
    });
  });

  describe('Pokémon Tab', () => {
    it('should display the list of pokemon in the team', () => {
      mockUseCharacterStore.mockReturnValue({
        inventory: [],
        team: mockPokemonTeam,
        profile: { name: 'Test Player', age: 10, gender: 'Other', description: '' },
        stats: { stamina: 100, maxStamina: 100, energy: 100, maxEnergy: 100 },
        healthStatus: 'Healthy',
        money: 1000,
        setProfile: vi.fn(),
      });
      render(<InventoryModal />);
      fireEvent.click(screen.getByRole('tab', { name: '宝可梦' }));
      expect(screen.getByText('皮卡丘')).toBeInTheDocument();
      expect(screen.getByText('Lv. 12')).toBeInTheDocument();
      expect(screen.getByText('小火龙')).toBeInTheDocument();
      expect(screen.getByText('Lv. 10')).toBeInTheDocument();
    });
  });
});