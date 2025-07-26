import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useCharacterStore } from '../../store/characterStore';
import MainMenuScreen from './MainMenuScreen';
import React from 'react';

// Mock the actual components for testing navigation
const CharacterCreationScreen = () => <div>Character Creation Page</div>;
const GameScreen = () => <div>Game Page</div>;

// Get the initial state from the store to reset it before each test
const originalState = useCharacterStore.getState();

describe('MainMenuScreen', () => {
  beforeEach(() => {
    // Reset the store to its initial state before each test
    useCharacterStore.setState(originalState);
  });

  const renderWithRouter = (initialEntries = ['/']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/" element={<MainMenuScreen />} />
          <Route
            path="/character-creation"
            element={<CharacterCreationScreen />}
          />
          <Route path="/game" element={<GameScreen />} />
        </Routes>
      </MemoryRouter>
    );
  };

  test('renders Continue button as disabled when no character exists', () => {
    renderWithRouter();
    const continueButton = screen.getByRole('button', { name: /继续游戏/i });
    expect(continueButton).toBeInTheDocument();
    expect(continueButton).toBeDisabled();
  });

  test('renders Continue button as enabled when a character exists', () => {
    // Simulate character creation by updating the store
    useCharacterStore.setState({
      character: {
        name: 'Test Character',
        level: 1,
        stats: { hp: 40, attack: 10, defense: 5 },
      },
    });

    renderWithRouter();
    const continueButton = screen.getByRole('button', { name: /继续游戏/i });
    expect(continueButton).toBeInTheDocument();
    expect(continueButton).toBeEnabled();
  });

  test('navigates to /character-creation when New Game button is clicked', () => {
    renderWithRouter();
    const newGameButton = screen.getByRole('button', { name: /新游戏/i });
    fireEvent.click(newGameButton);

    // Verify navigation to the character creation screen
    expect(screen.getByText('Character Creation Page')).toBeInTheDocument();
  });

  test('navigates to /game when Continue button is clicked and enabled', () => {
    // Create a character to enable the button
    useCharacterStore.setState({
      character: {
        name: 'Test Character',
        level: 1,
        stats: { hp: 40, attack: 10, defense: 5 },
      },
    });

    renderWithRouter();
    const continueButton = screen.getByRole('button', { name: /继续游戏/i });
    expect(continueButton).toBeEnabled(); // Sanity check
    fireEvent.click(continueButton);

    // Verify navigation to the game screen
    expect(screen.getByText('Game Page')).toBeInTheDocument();
  });
});