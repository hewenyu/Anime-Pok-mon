import { create } from 'zustand';
import {
  PlayerProfile,
  Pokemon,
  InventoryItem,
  LoadingStatus,
} from '../../../types';

interface CharacterState {
  // Player profile
  playerProfile: PlayerProfile;

  // Team and inventory
  playerTeam: Pokemon[];
  inventory: InventoryItem[];
  money: number;

  // Customization state
  customizationAssistantResponse: any;
  aiSuggestedGameStartTime: number | null;
  initialProfileGenerated: boolean;

  // Loading states
  profileGenerationLoading: LoadingStatus;
}

interface CharacterActions {
  // Player profile
  updatePlayerProfile: (updates: Partial<PlayerProfile>) => void;
  setPlayerProfile: (profile: PlayerProfile) => void;

  // Team management
  addPokemonToTeam: (pokemon: Pokemon) => void;
  removePokemonFromTeam: (instanceId: string) => void;
  updatePokemonInTeam: (instanceId: string, updates: Partial<Pokemon>) => void;
  setPlayerTeam: (team: Pokemon[]) => void;

  // Inventory management
  addInventoryItem: (item: InventoryItem) => void;
  removeInventoryItem: (itemName: string, quantity?: number) => void;
  updateInventoryItem: (
    itemName: string,
    updates: Partial<InventoryItem>
  ) => void;
  setInventory: (inventory: InventoryItem[]) => void;

  // Money
  setMoney: (amount: number) => void;
  addMoney: (amount: number) => void;
  spendMoney: (amount: number) => boolean; // Returns true if successful

  // Customization
  setCustomizationAssistantResponse: (response: any) => void;
  setAISuggestedGameStartTime: (time: number | null) => void;
  setInitialProfileGenerated: (generated: boolean) => void;

  // Loading states
  setProfileGenerationLoading: (loading: LoadingStatus) => void;

  // Reset
  resetCharacter: () => void;
}

const initialCharacterState: CharacterState = {
  playerProfile: {
    name: '',
    description: '',
    age: 16,
    hometown: '',
    goals: '',
    appearance: '',
    personality: '',
  },
  playerTeam: [],
  inventory: [],
  money: 0,
  customizationAssistantResponse: null,
  aiSuggestedGameStartTime: null,
  initialProfileGenerated: false,
  profileGenerationLoading: { status: 'idle' },
};

export const useCharacterStore = create<CharacterState & CharacterActions>(
  (set, get) => ({
    ...initialCharacterState,

    updatePlayerProfile: updates =>
      set(state => ({
        playerProfile: { ...state.playerProfile, ...updates },
      })),

    setPlayerProfile: profile => set({ playerProfile: profile }),

    addPokemonToTeam: pokemon =>
      set(state => {
        // Ensure we don't exceed team size limits
        if (state.playerTeam.length >= 6) {
          return state; // Don't add if team is full
        }
        return { playerTeam: [...state.playerTeam, pokemon] };
      }),

    removePokemonFromTeam: instanceId =>
      set(state => ({
        playerTeam: state.playerTeam.filter(p => p.instanceId !== instanceId),
      })),

    updatePokemonInTeam: (instanceId, updates) =>
      set(state => ({
        playerTeam: state.playerTeam.map(p =>
          p.instanceId === instanceId ? { ...p, ...updates } : p
        ),
      })),

    setPlayerTeam: team => set({ playerTeam: team }),

    addInventoryItem: item =>
      set(state => {
        const existingItemIndex = state.inventory.findIndex(
          i => i.name === item.name
        );
        if (existingItemIndex >= 0) {
          // Item exists, increase quantity
          const newInventory = [...state.inventory];
          newInventory[existingItemIndex] = {
            ...newInventory[existingItemIndex],
            quantity: newInventory[existingItemIndex].quantity + item.quantity,
          };
          return { inventory: newInventory };
        } else {
          // New item
          return { inventory: [...state.inventory, item] };
        }
      }),

    removeInventoryItem: (itemName, quantity = 1) =>
      set(state => {
        const existingItemIndex = state.inventory.findIndex(
          i => i.name === itemName
        );
        if (existingItemIndex >= 0) {
          const existingItem = state.inventory[existingItemIndex];
          const newInventory = [...state.inventory];

          if (existingItem.quantity <= quantity) {
            // Remove item completely
            newInventory.splice(existingItemIndex, 1);
          } else {
            // Reduce quantity
            newInventory[existingItemIndex] = {
              ...existingItem,
              quantity: existingItem.quantity - quantity,
            };
          }
          return { inventory: newInventory };
        }
        return state; // Item not found
      }),

    updateInventoryItem: (itemName, updates) =>
      set(state => ({
        inventory: state.inventory.map(item =>
          item.name === itemName ? { ...item, ...updates } : item
        ),
      })),

    setInventory: inventory => set({ inventory }),

    setMoney: amount => set({ money: Math.max(0, amount) }),

    addMoney: amount => set(state => ({ money: state.money + amount })),

    spendMoney: amount => {
      const currentState = get();
      if (currentState.money >= amount) {
        set({ money: currentState.money - amount });
        return true;
      }
      return false;
    },

    setCustomizationAssistantResponse: response =>
      set({ customizationAssistantResponse: response }),
    setAISuggestedGameStartTime: time =>
      set({ aiSuggestedGameStartTime: time }),
    setInitialProfileGenerated: generated =>
      set({ initialProfileGenerated: generated }),

    setProfileGenerationLoading: loading =>
      set({ profileGenerationLoading: loading }),

    resetCharacter: () => set(initialCharacterState),
  })
);
