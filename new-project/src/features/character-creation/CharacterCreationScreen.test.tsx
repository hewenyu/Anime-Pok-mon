import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CharacterCreationScreen from './CharacterCreationScreen';
import { useCharacterStore } from '../../store/characterStore';
import { useGameStore } from '../../store/gameStore';

// Define a partial state for mocking
// No longer need manual type definitions for mocks

// Mock react-router-dom
const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

// Mock Zustand stores
vi.mock('../../store/characterStore');
vi.mock('../../store/gameStore');

describe('CharacterCreationScreen', () => {
  const mockSetProfile = vi.fn();
  const mockSetGameState = vi.fn();
  const mockedUseCharacterStore = vi.mocked(useCharacterStore);
  const mockedUseGameStore = vi.mocked(useGameStore);

  beforeEach(() => {
    vi.clearAllMocks();

    // Provide mock implementation for the stores using vi.mocked
    mockedUseCharacterStore.mockReturnValue({
      setProfile: mockSetProfile,
      // The rest of the store is not needed for this test
      profile: { id: 0, name: '', gender: '男', age: 0, description: '' },
      level: 1,
      createCharacter: vi.fn(),
      levelUp: vi.fn(),
    });
    mockedUseGameStore.mockReturnValue({
      setGameState: mockSetGameState,
    });
  });

  it('should handle form submission and navigate to the game', async () => {
    render(
      <MemoryRouter>
        <CharacterCreationScreen />
      </MemoryRouter>
    );

    // 1. Find form elements
    const nameInput = screen.getByLabelText(/名称/i);
    const ageInput = screen.getByLabelText(/年龄/i);
    const genderSelect = screen.getByLabelText(/性别/i);
    const descriptionTextarea = screen.getByLabelText(/描述/i);
    const submitButton = screen.getByRole('button', { name: /开始冒险/i });

    // 2. Simulate user input
    fireEvent.change(nameInput, { target: { value: '勇者' } });
    fireEvent.change(ageInput, { target: { value: '25' } });
    fireEvent.change(genderSelect, { target: { value: '男' } });
    fireEvent.change(descriptionTextarea, { target: { value: '一个平平无奇的冒险者。' } });

    // 3. Simulate form submission
    fireEvent.click(submitButton);

    // 4. Assertions
    // Verify characterStore action was called
    expect(mockSetProfile).toHaveBeenCalledWith({
      name: '勇者',
      age: 25,
      gender: '男',
      description: '一个平平无奇的冒险者。',
    });

    // Verify gameStore action was called
    expect(mockSetGameState).toHaveBeenCalledWith('InGame');

    // Verify navigation was called
    expect(mockedNavigate).toHaveBeenCalledWith('/game');
  });

  it('should not submit form or navigate if required fields are empty', () => {
    render(
      <MemoryRouter>
        <CharacterCreationScreen />
      </MemoryRouter>
    );

    const submitButton = screen.getByRole('button', { name: /开始冒险/i });

    // Simulate form submission with empty required fields
    fireEvent.click(submitButton);

    // Assertions
    // Verify that store actions and navigation were NOT called
    expect(mockSetProfile).not.toHaveBeenCalled();
    expect(mockSetGameState).not.toHaveBeenCalled();
    expect(mockedNavigate).not.toHaveBeenCalled();
  });
});