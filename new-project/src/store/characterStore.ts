import { create } from 'zustand';
import type { Pokemon } from '../types';

// Define the shape of the character's profile
export type Profile = {
  name: string;
  gender: 'Male' | 'Female' | 'Other';
  age: number;
  description: string;
};

export type Stats = {
  stamina: number;
  maxStamina: number;
  energy: number;
  maxEnergy: number;
};

import type { InventoryItem } from '../types';

export type CharacterStoreState = {
  profile: Profile;
  stats: Stats;
  healthStatus: string;
  money: number;
  team: Pokemon[];
  inventory: InventoryItem[];
  setProfile: (profile: Profile) => void;
  getPokemonByInstanceId: (instanceId: string) => Pokemon | undefined;
};

export const useCharacterStore = create<CharacterStoreState>((set, get) => ({
  profile: {
    name: 'Player',
    age: 18,
    gender: 'Other',
    description: 'A new adventurer.',
  },
  stats: {
    stamina: 100,
    maxStamina: 100,
    energy: 100,
    maxEnergy: 100,
  },
  healthStatus: 'Healthy',
  money: 1000,
  team: [],
  inventory: [],
  setProfile: (profile) => set({ profile }),
  getPokemonByInstanceId: (instanceId: string): Pokemon | undefined => {
    const { team } = get();
    return team.find((p) => p.instanceId === instanceId);
  },
}));