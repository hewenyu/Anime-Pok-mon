import { create } from 'zustand';
import {
  Pokemon,
  InventoryItem,
  BattleChatMessage,
  AIStoryChoice,
  LoadingStatus,
} from '../../../types';

export type BattleScreen =
  | 'MAIN_MENU'
  | 'SELECT_MOVE'
  | 'SELECT_POKEMON'
  | 'SELECT_ITEM'
  | 'ACTION_INFO'
  | 'FORCED_SWITCH'
  | 'BATTLE_OVER_CHOICES';

export type BattleOutcome = 'win' | 'loss' | 'run' | null;

interface BattleState {
  // Battle entities
  playerTeam: Pokemon[];
  currentInventory: InventoryItem[];
  enemyPokemon: Pokemon | null;
  activePlayerPokemon: Pokemon | null;
  
  // Battle flow
  currentScreen: BattleScreen;
  battleOutcome: BattleOutcome;
  isProcessingTurn: boolean;
  pokemonWasCaught: Pokemon | null;
  
  // Battle log
  battleLog: BattleChatMessage[];
  
  // AI and input
  commandParseLoadingStatus: LoadingStatus;
  playerInput: string;
  selectedItemForAISuggestion: InventoryItem | null;
  itemActionSuggestions: AIStoryChoice[] | null;
  itemSubActionLoading: LoadingStatus;
}

interface BattleActions {
  // Initialize battle
  initializeBattle: (
    playerTeam: Pokemon[],
    inventory: InventoryItem[],
    enemyPokemon: Pokemon,
    activePlayerPokemonId: string
  ) => void;
  
  // Battle flow actions
  setCurrentScreen: (screen: BattleScreen) => void;
  setBattleOutcome: (outcome: BattleOutcome) => void;
  setIsProcessingTurn: (processing: boolean) => void;
  setPokemonWasCaught: (pokemon: Pokemon | null) => void;
  
  // Pokemon management
  setActivePlayerPokemon: (pokemon: Pokemon | null) => void;
  updatePokemonState: (instanceId: string, updates: Partial<Pokemon>, isEnemy?: boolean) => void;
  
  // Inventory management
  updateInventory: (updater: (inventory: InventoryItem[]) => InventoryItem[]) => void;
  
  // Battle log
  addBattleLogEntry: (
    text: string,
    speaker?: string,
    type?: BattleChatMessage['type'],
    itemSuggestions?: AIStoryChoice[]
  ) => void;
  clearBattleLog: () => void;
  
  // Input and AI
  setPlayerInput: (input: string) => void;
  setCommandParseLoadingStatus: (status: LoadingStatus) => void;
  setSelectedItemForAISuggestion: (item: InventoryItem | null) => void;
  setItemActionSuggestions: (suggestions: AIStoryChoice[] | null) => void;
  setItemSubActionLoading: (status: LoadingStatus) => void;
  
  // Reset
  resetBattle: () => void;
}

const initialBattleState: BattleState = {
  playerTeam: [],
  currentInventory: [],
  enemyPokemon: null,
  activePlayerPokemon: null,
  currentScreen: 'MAIN_MENU',
  battleOutcome: null,
  isProcessingTurn: false,
  pokemonWasCaught: null,
  battleLog: [],
  commandParseLoadingStatus: { status: 'idle' },
  playerInput: '',
  selectedItemForAISuggestion: null,
  itemActionSuggestions: null,
  itemSubActionLoading: { status: 'idle' },
};

export const useBattleStore = create<BattleState & BattleActions>((set, get) => ({
  ...initialBattleState,

  initializeBattle: (playerTeam, inventory, enemyPokemon, activePlayerPokemonId) => {
    const sanitizePokemon = (pokemon: Pokemon): Pokemon => ({
      ...pokemon,
      statusConditions: pokemon.statusConditions || [],
      statStageModifiers: pokemon.statStageModifiers || [],
      isHit: false,
      isFainted: pokemon.currentHp <= 0,
    });

    const sanitizedPlayerTeam = playerTeam.map(sanitizePokemon);
    const sanitizedEnemyPokemon = sanitizePokemon(enemyPokemon);
    
    const activePlayerPokemon = sanitizedPlayerTeam.find(
      p => p.instanceId === activePlayerPokemonId && !p.isFainted
    ) || sanitizedPlayerTeam.find(p => !p.isFainted) || null;

    set({
      playerTeam: sanitizedPlayerTeam,
      currentInventory: [...inventory],
      enemyPokemon: sanitizedEnemyPokemon,
      activePlayerPokemon,
      currentScreen: 'MAIN_MENU',
      battleOutcome: null,
      isProcessingTurn: false,
      pokemonWasCaught: null,
      battleLog: [],
    });
  },

  setCurrentScreen: (screen) => set({ currentScreen: screen }),
  setBattleOutcome: (outcome) => set({ battleOutcome: outcome }),
  setIsProcessingTurn: (processing) => set({ isProcessingTurn: processing }),
  setPokemonWasCaught: (pokemon) => set({ pokemonWasCaught: pokemon }),

  setActivePlayerPokemon: (pokemon) => set({ activePlayerPokemon: pokemon }),
  
  updatePokemonState: (instanceId, updates, isEnemy = false) => {
    if (isEnemy) {
      set((state) => ({
        enemyPokemon: state.enemyPokemon ? { ...state.enemyPokemon, ...updates } : null,
      }));
    } else {
      set((state) => ({
        playerTeam: state.playerTeam.map((p) =>
          p.instanceId === instanceId ? { ...p, ...updates } : p
        ),
        activePlayerPokemon: state.activePlayerPokemon?.instanceId === instanceId
          ? { ...state.activePlayerPokemon, ...updates }
          : state.activePlayerPokemon,
      }));
    }
  },

  updateInventory: (updater) => set((state) => ({
    currentInventory: updater(state.currentInventory)
  })),

  addBattleLogEntry: (text, speaker = '系统', type = 'system_message', itemSuggestions) => {
    const newEntry: BattleChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      text,
      speaker,
      timestamp: Date.now(),
      type,
      itemSuggestions,
    };
    
    set((state) => ({
      battleLog: [...state.battleLog, newEntry]
    }));
  },

  clearBattleLog: () => set({ battleLog: [] }),

  setPlayerInput: (input) => set({ playerInput: input }),
  setCommandParseLoadingStatus: (status) => set({ commandParseLoadingStatus: status }),
  setSelectedItemForAISuggestion: (item) => set({ selectedItemForAISuggestion: item }),
  setItemActionSuggestions: (suggestions) => set({ itemActionSuggestions: suggestions }),
  setItemSubActionLoading: (status) => set({ itemSubActionLoading: status }),

  resetBattle: () => set(initialBattleState),
}));