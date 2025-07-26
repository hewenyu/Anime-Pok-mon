import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CharacterCreationScreen from './CharacterCreationScreen';
import { useCharacterStore, type Profile } from '../../store/characterStore';
import { useGameStore, type GameMode } from '../../store/gameStore';

// Define a partial state for mocking
type CharacterState = { setProfile: (profile: Profile) => void; };
type GameState = { setGameMode: (mode: GameMode) => void; };

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
  const setProfile = vi.fn();
  const setGameMode = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Provide mock implementation for the stores
    (useCharacterStore as unknown as vi.Mock).mockImplementation(
      (selector: (state: CharacterState) => unknown) => selector({ setProfile })
    );
    (useGameStore as unknown as vi.Mock).mockImplementation(
      (selector: (state: GameState) => unknown) => selector({ setGameMode })
    );
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
    expect(setProfile).toHaveBeenCalledWith({
      name: '勇者',
      age: 25,
      gender: '男',
      description: '一个平平无奇的冒险者。',
    });

    // Verify gameStore action was called
    expect(setGameMode).toHaveBeenCalledWith('InGame');

    // Verify navigation was called
    expect(mockedNavigate).toHaveBeenCalledWith('/game');
  });
});