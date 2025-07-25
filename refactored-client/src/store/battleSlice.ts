import type { StateCreator } from 'zustand';
import { BattleGameStatus } from '../types';
import type { Pokemon, BattleGameStatus as BattleGameStatusType } from '../types';

export interface BattleSlice {
  battleStatus: BattleGameStatusType;
  playerPokemon: Pokemon | null;
  enemyPokemon: Pokemon | null;
  actions: {
    startBattle: (playerPokemon: Pokemon, enemyPokemon: Pokemon) => void;
    endBattle: () => void;
    setBattleStatus: (status: BattleGameStatusType) => void;
  };
}

const initialBattleState: Omit<BattleSlice, 'actions'> = {
  battleStatus: BattleGameStatus.NOT_IN_BATTLE,
  playerPokemon: null,
  enemyPokemon: null,
};

export const createBattleSlice: StateCreator<BattleSlice, [], [], BattleSlice> = (set) => ({
  ...initialBattleState,
  actions: {
    startBattle: (playerPokemon, enemyPokemon) =>
      set({
        playerPokemon,
        enemyPokemon,
        battleStatus: BattleGameStatus.SELECTING_ACTION,
      }),
    endBattle: () => set({ ...initialBattleState }),
    setBattleStatus: (status) => set({ battleStatus: status }),
  },
});