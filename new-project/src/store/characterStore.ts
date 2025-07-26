import { create } from 'zustand';

// Define the shape of the character's profile
export type Profile = {
  name: string;
  gender: '男' | '女' | '其他';
  age: number;
  description: string;
};

type CharacterState = {
  profile: Profile;
  level: number;
  setProfile: (profile: Profile) => void;
  levelUp: () => void;
};

export const useCharacterStore = create<CharacterState>((set) => ({
  profile: {
    name: '',
    gender: '男',
    age: 18,
    description: '',
  },
  level: 1,
  setProfile: (profile) => set({ profile }),
  levelUp: () => set((state) => ({ level: state.level + 1 })),
}));