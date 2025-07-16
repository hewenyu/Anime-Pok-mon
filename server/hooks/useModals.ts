


import { useState, useCallback } from 'react';
// Fix: Added Pokemon to import for correct typing
import { NPC, AIStoryChoice, Pokemon } from '../types';

export const useModals = () => {
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showGlobalMapModal, setShowGlobalMapModal] = useState(false);
  const [showNPCListModal, setShowNPCListModal] = useState(false);
  const [selectedNPCForChat, setSelectedNPCForChat] = useState<NPC | null>(null);
  const [npcChatSuggestions, setNpcChatSuggestions] = useState<AIStoryChoice[] | null>(null);
  const [showPlayerProfileEditModal, setShowPlayerProfileEditModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
// Fix: Changed type of pokemonToViewInModal from NPC | null to Pokemon | null
  const [pokemonToViewInModal, setPokemonToViewInModal] = useState<Pokemon | null>(null);

  const toggleHistoryModal = useCallback(() => setShowHistoryModal(prev => !prev), []);
  const toggleGlobalMapModal = useCallback(() => setShowGlobalMapModal(prev => !prev), []);
  const toggleNPCListModal = useCallback(() => setShowNPCListModal(prev => !prev), []);
  const togglePlayerProfileEditModal = useCallback(() => setShowPlayerProfileEditModal(prev => !prev), []);
  const toggleInventoryModal = useCallback(() => setShowInventoryModal(prev => !prev), []);
  
// Fix: Changed parameter type from `any` to `Pokemon`
  const openPokemonDetailModal = useCallback((pokemon: Pokemon) => setPokemonToViewInModal(pokemon), []);
  const closePokemonDetailModal = useCallback(() => setPokemonToViewInModal(null), []);

  const handleCloseNPCChatModal = useCallback(() => {
    setSelectedNPCForChat(null);
    setNpcChatSuggestions(null);
  }, []);

  return {
    showHistoryModal,
    toggleHistoryModal,
    showGlobalMapModal,
    toggleGlobalMapModal,
    showNPCListModal,
    toggleNPCListModal,
    selectedNPCForChat,
    setSelectedNPCForChat,
    npcChatSuggestions,
    setNpcChatSuggestions,
    handleCloseNPCChatModal,
    showPlayerProfileEditModal,
    togglePlayerProfileEditModal,
    showInventoryModal,
    toggleInventoryModal,
    pokemonToViewInModal,
    openPokemonDetailModal,
    closePokemonDetailModal,
  };
};