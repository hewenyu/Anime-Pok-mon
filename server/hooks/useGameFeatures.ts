import { useGameStore } from '../store/gameStore';
import { useBattleStore } from '../features/battle';
import { useAdventureStore } from '../features/adventure';
import { useCharacterStore } from '../features/character';
import { GameMode } from '../types';

/**
 * Composite hook that demonstrates the new feature-based architecture.
 * This shows how the different stores can work together while maintaining
 * clear separation of concerns.
 */
export const useGameFeatures = () => {
  // Core game state
  const { gameMode, setGameMode, currentGameTime, advanceGameTime } = useGameStore();
  
  // Feature-specific states
  const battleState = useBattleStore();
  const adventureState = useAdventureStore();
  const characterState = useCharacterStore();

  // High-level game actions that coordinate multiple features
  const startNewGame = () => {
    setGameMode(GameMode.CUSTOMIZE_RANDOM_START);
    characterState.resetCharacter();
    adventureState.resetAdventure();
    battleState.resetBattle();
  };

  const startBattle = (
    enemyPokemon: any,
    playerTeam: any[],
    inventory: any[],
    activePlayerPokemonId: string
  ) => {
    setGameMode(GameMode.BATTLE);
    battleState.initializeBattle(playerTeam, inventory, enemyPokemon, activePlayerPokemonId);
  };

  const endBattle = (
    didPlayerWin: boolean,
    finalPlayerTeam: any[],
    finalInventory: any[],
    usedRun: boolean
  ) => {
    // Update character state with battle results
    characterState.setPlayerTeam(finalPlayerTeam);
    characterState.setInventory(finalInventory);
    
    // Add experience, money, etc. based on battle outcome
    if (didPlayerWin) {
      characterState.addMoney(100); // Example reward
    }
    
    // Return to adventure mode
    setGameMode(GameMode.ADVENTURE);
    battleState.resetBattle();
  };

  const startAdventure = () => {
    setGameMode(GameMode.ADVENTURE);
    adventureState.setCurrentStaticSegmentId('ADVENTURE_START');
  };

  return {
    // Game state
    gameMode,
    currentGameTime,
    
    // Feature states (for components that need direct access)
    battle: battleState,
    adventure: adventureState,
    character: characterState,
    
    // High-level actions
    startNewGame,
    startBattle,
    endBattle,
    startAdventure,
    advanceGameTime,
  };
};

/**
 * Simplified hook for components that only need basic game state
 */
export const useGameState = () => {
  const { gameMode, currentGameTime } = useGameStore();
  return { gameMode, currentGameTime };
};

/**
 * Hook specifically for battle components
 */
export const useBattleFeature = () => {
  const battleStore = useBattleStore();
  const { setGameMode } = useGameStore();
  
  const endBattleAndReturnToAdventure = (
    didPlayerWin: boolean,
    finalPlayerTeam: any[],
    finalInventory: any[],
    finalEnemyPokemon: any,
    usedRun: boolean,
    caughtPokemon?: any,
    battleLog?: any[]
  ) => {
    // Here you would typically update character store with results
    // and handle any post-battle logic
    
    setGameMode(GameMode.ADVENTURE);
    battleStore.resetBattle();
  };

  return {
    ...battleStore,
    endBattleAndReturnToAdventure,
  };
};