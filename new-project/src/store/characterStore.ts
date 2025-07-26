import { create } from 'zustand';

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

// A simplified Pokemon type for now
export type Pokemon = {
  id: string;
  name: string;
  level: number;
  // other details...
};

export type CharacterStoreState = {
  profile: Profile;
  stats: Stats;
  healthStatus: string;
  money: number;
  team: Pokemon[];
  setProfile: (profile: Profile) => void;
  // other actions can be added here
};

export const useCharacterStore = create<CharacterStoreState>((set) => ({
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
  setProfile: (profile) => set({ profile }),
}));