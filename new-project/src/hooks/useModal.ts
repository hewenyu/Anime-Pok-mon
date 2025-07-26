import { useUIStore } from '../store/uiStore';
import type { ModalType } from '../store/uiStore';

/**
 * A hook to control a specific modal's state.
 * It connects to the global UI store but provides a simplified API for a single modal type.
 *
 * @param modalType The type of the modal to control.
 * @returns An object with `isOpen`, `openModal`, and `closeModal` functions.
 */
export const useModal = (modalType: ModalType) => {
  const { 
    modalType: activeModalType, 
    openModal: storeOpenModal, 
    closeModal: storeCloseModal 
  } = useUIStore();

  const isOpen = activeModalType === modalType;

  const openModal = () => {
    storeOpenModal(modalType);
  };

  const closeModal = () => {
    // Only close if this specific modal is the one that's open
    if (isOpen) {
      storeCloseModal();
    }
  };

  return {
    isOpen,
    openModal,
    closeModal,
  };
};