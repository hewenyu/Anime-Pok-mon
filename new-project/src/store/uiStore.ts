import { create } from 'zustand';

export type ModalType = 'editProfile' | 'worldMap' | 'inventory' | 'pokemonDetail' | 'saveGame';

interface ModalPayload {
  pokemonId?: string;
  pokemonInstanceId?: string;
}

interface UIState {
  isModalOpen: boolean;
  modalType: ModalType | null;
  modalPayload: ModalPayload | null;
  openModal: (type: ModalType, payload?: ModalPayload) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isModalOpen: false,
  modalType: null,
  modalPayload: null,
  openModal: (type, payload = {}) => set({ isModalOpen: true, modalType: type, modalPayload: payload }),
  closeModal: () => set({ isModalOpen: false, modalType: null, modalPayload: null }),
}));