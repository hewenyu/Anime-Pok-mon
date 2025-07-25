import type { StateCreator } from 'zustand';
import type {
  PlayerProfile,
  Pokemon,
  InventoryItem,
  PlayerGender,
  AIEventTrigger,
} from '../types';

export interface PlayerSlice {
  playerProfile: PlayerProfile;
  playerTeam: Pokemon[];
  inventory: InventoryItem[];
  money: number;
  actions: {
    setPlayerProfile: (profile: PlayerProfile) => void;
    addPokemonToTeam: (pokemon: Pokemon) => void;
    addItemToInventory: (item: InventoryItem) => void;
    updateMoney: (amount: number) => void;
    processCharacterEvent: (event: AIEventTrigger) => void;
  };
}

const initialPlayerState: {
  playerProfile: PlayerProfile;
  playerTeam: Pokemon[];
  inventory: InventoryItem[];
  money: number;
} = {
  playerProfile: {
    name: '冒险者',
    gender: '男' as PlayerGender,
    age: 16,
    description: '一位充满好奇心的冒险者。',
    stamina: 100,
    maxStamina: 100,
    energy: 100,
    maxEnergy: 100,
    healthStatus: '健康',
  },
  playerTeam: [],
  inventory: [],
  money: 500,
};

export const createPlayerSlice: StateCreator<PlayerSlice, [], [], PlayerSlice> = (set) => ({
  ...initialPlayerState,
  actions: {
    setPlayerProfile: (profile) => set(() => ({ playerProfile: profile })),
    addPokemonToTeam: (pokemon) => set((state) => ({ playerTeam: [...state.playerTeam, pokemon] })),
    addItemToInventory: (item) => set((state) => {
      const existingItem = state.inventory.find((i) => i.id === item.id);
      if (existingItem) {
        return {
          inventory: state.inventory.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + (item.quantity || 1) } : i
          ),
        };
      }
      return { inventory: [...state.inventory, { ...item, quantity: item.quantity || 1 }] };
    }),
    updateMoney: (amount) => set((state) => ({ money: state.money + amount })),
    processCharacterEvent: (event) =>
      set((state) => {
        switch (event.type) {
          case 'GIVE_ITEM':
            if (event.itemDetails) {
              const itemToAdd = event.itemDetails as InventoryItem;
              const quantityToAdd = event.quantity || itemToAdd.quantity || 1;
              const existingItem = state.inventory.find(
                (i) => i.id === itemToAdd.id || i.name === itemToAdd.name
              );
              if (existingItem) {
                return {
                  inventory: state.inventory.map((i) =>
                    i.id === existingItem.id
                      ? { ...i, quantity: i.quantity + quantityToAdd }
                      : i
                  ),
                };
              }
              return {
                inventory: [
                  ...state.inventory,
                  { ...itemToAdd, quantity: quantityToAdd },
                ],
              };
            }
            break;
          case 'ADD_POKEMON_TO_TEAM':
            if (event.pokemonDetails) {
              const newPokemon = event.pokemonDetails as Pokemon;
              return {
                playerTeam: [...state.playerTeam, newPokemon],
              };
            }
            break;
          case 'UPDATE_MONEY':
            if (event.quantity) {
              return { money: state.money + event.quantity };
            }
            break;
          case 'SET_PLAYER_PROFILE':
            if (event.profileDetails) {
              return {
                playerProfile: {
                  ...state.playerProfile,
                  ...event.profileDetails,
                },
              };
            }
            break;
          // Other events like HEAL_TEAM can be added here later
        }
        return {}; // No change if event is not handled
      }),
  },
});