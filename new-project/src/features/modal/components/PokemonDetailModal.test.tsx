import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PokemonDetailModal from './PokemonDetailModal';
import { useUIStore } from '@/store/uiStore';
import { useCharacterStore } from '@/store/characterStore';
import { PokemonType, type Pokemon } from '@/types';

// Mock stores
vi.mock('@/store/uiStore');
vi.mock('@/store/characterStore');

const mockUseUiStore = vi.mocked(useUIStore);
const mockUseCharacterStore = vi.mocked(useCharacterStore);

const mockPikachu: Pokemon = {
  instanceId: 'uuid-p1',
  id: 'p1',
  name: '皮卡丘',
  level: 12,
  types: [PokemonType.ELECTRIC],
  currentHp: 35,
  maxHp: 35,
  imageUrl: 'pikachu.png',
  moves: [],
};

describe('PokemonDetailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks to a default state before each test
    mockUseUiStore.mockReturnValue({
      isModalOpen: false,
      modalType: null,
      modalPayload: null,
      openModal: vi.fn(),
      closeModal: vi.fn(),
    });
    mockUseCharacterStore.mockReturnValue({
      getPokemonByInstanceId: vi.fn(),
      // Provide default values for other required properties
      profile: { name: 'Test', age: 10, gender: 'Other', description: '' },
      stats: { stamina: 100, maxStamina: 100, energy: 100, maxEnergy: 100 },
      healthStatus: 'Healthy',
      money: 1000,
      team: [],
      inventory: [],
      setProfile: vi.fn(),
    });
  });

  it('should not render if modalType is not "pokemonDetail"', () => {
    mockUseUiStore.mockReturnValue({
      isModalOpen: true,
      modalType: 'inventory',
      modalPayload: null,
      openModal: vi.fn(),
      closeModal: vi.fn(),
    });
    render(<PokemonDetailModal />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render "未找到宝可梦" if pokemonInstanceId is invalid', () => {
    mockUseUiStore.mockReturnValue({
      isModalOpen: true,
      modalType: 'pokemonDetail',
      modalPayload: { pokemonInstanceId: 'invalid-id' },
      openModal: vi.fn(),
      closeModal: vi.fn(),
    });
    // Ensure the store returns undefined for the invalid id
    vi.mocked(useCharacterStore).mockReturnValue({
      ...useCharacterStore.getState(),
      getPokemonByInstanceId: vi.fn().mockReturnValue(undefined),
    });

    render(<PokemonDetailModal />);
    expect(screen.getByText('未找到宝可梦')).toBeInTheDocument();
  });

  it('should render pokemon details when a valid pokemonInstanceId is provided', () => {
    mockUseUiStore.mockReturnValue({
      isModalOpen: true,
      modalType: 'pokemonDetail',
      modalPayload: { pokemonInstanceId: 'uuid-p1' },
      openModal: vi.fn(),
      closeModal: vi.fn(),
    });
    // Ensure the store returns the mock pokemon for the valid id
    vi.mocked(useCharacterStore).mockReturnValue({
      ...useCharacterStore.getState(),
      getPokemonByInstanceId: vi.fn().mockReturnValue(mockPikachu),
    });

    render(<PokemonDetailModal />);

    expect(screen.getByText('皮卡丘')).toBeInTheDocument();
    expect(screen.getByText('Lv. 12')).toBeInTheDocument();
    // We will test for the type badge in its own test file, but we can check for its text
    expect(screen.getByText(PokemonType.ELECTRIC)).toBeInTheDocument();
  });
});