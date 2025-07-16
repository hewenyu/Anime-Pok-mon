


import React from 'react';
// Fix: Added missing import for StorySegment and Pokemon
import { GameMode, NPC, StorySegment, Pokemon } from '../types'; // Corrected path
import { useGameLogic } from '../hooks/useGameLogic'; // Corrected path
import { useModals } from '../hooks/useModals'; // Corrected path
import { sanitizePokemonData, sanitizeItemData } from '../utils/dataSanitizers'; // Corrected path
// Fix: Added missing import for STORY_DATA
import { STORY_DATA } from '../constants'; // Corrected path

import AdventureView from './AdventureView.tsx';
import BattleView from './BattleView.tsx';
import HistoryModal from './HistoryModal.tsx';
import GlobalMapModal from './GlobalMapModal.tsx';
import NPCListModal from './NPCListModal.tsx';
import NPCChatModal from './NPCChatModal.tsx';
import CustomizeRandomStartScreen from './CustomizeRandomStartScreen.tsx';
import PlayerProfileEditModal from './PlayerProfileEditModal.tsx';
import InventoryModal from './InventoryModal.tsx';
import PokemonDetailModal from './PokemonDetailModal.tsx';


const App: React.FC = () => {
  const gameLogic = useGameLogic();
  const {
    gameState,
    // updateGameState, // Direct updateGameState is less used, actions are preferred
    currentStaticSegmentId, // Keep if AdventureView still needs it directly for rendering static content
    advanceStaticStory,
    handleStaticStoryChoice,
    triggerAIStory, // Main AI trigger
    handleAIChoice,
    handlePlayerCustomInputAction,
    handleBattleEnd,
    handleReRollFullProfile,
    handleRequestAddRandomStarterViaMainButton,
    handleRequestNewItemViaMainButton,
    handleRequestGeneratePlayerDescription,
    handleStartAdventureWithCustomizedProfile,
    handleDirectCustomizationUpdate,
    handleSendCustomizationAssistantMessage,
    requestDynamicTimeSuggestion, // Added from useGameLogic
    handleSavePlayerProfileChanges,
    handleRegeneratePokemonImage,
    fetchInitialNPCDialogueAndOrSuggestions,
    handleSendPlayerMessageToNPC,
    npcInteractionLoading,
    clearCustomizationAssistantResponse, // Added
  } = gameLogic;

  const {
    showHistoryModal, toggleHistoryModal,
    showGlobalMapModal, toggleGlobalMapModal,
    showNPCListModal, toggleNPCListModal,
    selectedNPCForChat, setSelectedNPCForChat,
    npcChatSuggestions, setNpcChatSuggestions,
    handleCloseNPCChatModal,
    showPlayerProfileEditModal, togglePlayerProfileEditModal,
    showInventoryModal, toggleInventoryModal,
    pokemonToViewInModal, openPokemonDetailModal, closePokemonDetailModal,
  } = useModals();


  const handleSelectNPCToChat = (npc: NPC) => {
    setNpcChatSuggestions(null); // Clear previous suggestions
    setSelectedNPCForChat(npc); // Set selected NPC for chat modal
    toggleNPCListModal(); // Close NPC List Modal
    // Fetch initial dialogue, passing modal setters
    fetchInitialNPCDialogueAndOrSuggestions(npc, setSelectedNPCForChat, setNpcChatSuggestions);
  };

  const memoizedHandleSendPlayerMessageToNPC = (npcId: string, messageText: string, suggestionActionTag?: string) => {
    if (selectedNPCForChat && selectedNPCForChat.id === npcId) {
        handleSendPlayerMessageToNPC(npcId, messageText, selectedNPCForChat, setSelectedNPCForChat, setNpcChatSuggestions, suggestionActionTag);
    } else {
        console.error("NPC context mismatch or no NPC selected for sending message.");
    }
  };


  const renderContent = () => {
    // isLoadingAI is now part of gameState.aiLoadingStatus
    const isLoadingAI = gameState.aiLoadingStatus.status !== 'idle';

    switch (gameState.gameMode) {
      case GameMode.CUSTOMIZE_RANDOM_START:
        return <CustomizeRandomStartScreen
                    currentProfile={gameState.playerProfile}
                    currentTeam={gameState.playerTeam}
                    currentItems={gameState.inventory}
                    currentMoney={gameState.money}
                    currentLocation={gameState.currentLocationDescription}
                    currentObjective={gameState.currentObjective}
                    aiNarrativeFromApp={gameState.aiLoadingStatus.status === 'loading' ? (gameState.aiLoadingStatus.message || "处理中...") :
                                          gameState.aiLoadingStatus.status === 'retrying_format_error' ? (gameState.aiLoadingStatus.message || "重试中...") :
                                          (gameState.currentAIScene?.narrative || (isLoadingAI && !gameState.customizationAssistantResponse ? "处理中..." : "自定义你的冒险开始！"))}
                    onReRollFullProfile={handleReRollFullProfile}
                    onRequestAddRandomStarterViaMainButton={handleRequestAddRandomStarterViaMainButton}
                    onRequestNewItemViaMainButton={handleRequestNewItemViaMainButton}
                    onRequestGeneratePlayerDescription={handleRequestGeneratePlayerDescription}
                    onStartAdventure={handleStartAdventureWithCustomizedProfile}
                    isLoadingAI={isLoadingAI} // Main AI loading status
                    initialProfileGenerated={gameState.initialProfileGenerated}
                    aiSuggestedGameStartTime={gameState.aiSuggestedGameStartTime} // Pass this down
                    onSendAssistantMessage={handleSendCustomizationAssistantMessage}
                    requestDynamicTimeSuggestion={requestDynamicTimeSuggestion} // Pass new handler
                    assistantAIResponse={gameState.customizationAssistantResponse}
                    sanitizePokemonFn={sanitizePokemonData}
                    sanitizeItemFn={sanitizeItemData}
                    onUpdateCustomizationDirectly={handleDirectCustomizationUpdate}
                    onRegeneratePokemonImage={handleRegeneratePokemonImage}
                    aiLoadingStatus={gameState.aiLoadingStatus} // Pass the full status object
                    onClearAssistantResponse={clearCustomizationAssistantResponse} // Pass down the new handler
                />;

      case GameMode.ADVENTURE:
        // Determine what content to display in AdventurePanel
        let displayAIContent = !!gameState.currentAIScene;
        let effectiveStaticContent: StorySegment | null = null;
        const currentStaticSeg = STORY_DATA[currentStaticSegmentId];

        // If there's static content, not an AI handoff, AI isn't loading, and no current AI scene, show static.
        if (currentStaticSeg && !currentStaticSeg.isAIHandoff && !isLoadingAI && !gameState.currentAIScene) {
            displayAIContent = false;
            effectiveStaticContent = { ...currentStaticSeg };
        }

        // If AI is loading because static segment was a handoff, or no current AI scene yet, don't show (stale) AI content
        if (isLoadingAI && (currentStaticSeg?.isAIHandoff || gameState.currentAIScene === null)) {
            displayAIContent = false; // Don't show AI content if loading from static handoff
            effectiveStaticContent = null; // Don't show static content either if it was a handoff point
        }

        // Special handling for static segments that trigger battles to auto-generate a choice if none exists
        if (effectiveStaticContent?.triggerBattle && (!effectiveStaticContent.choices || effectiveStaticContent.choices.length === 0)) {
          effectiveStaticContent.choices = [{ text: `与 ${effectiveStaticContent.triggerBattle.enemyPokemon.name} 开始战斗! (触发战斗)`, isBattleTrigger: true, actionTag: `STATIC_BATTLE_TRIGGER_${effectiveStaticContent.id}` }];
        }


        return (<AdventureView
                    playerProfile={gameState.playerProfile}
                    playerTeam={gameState.playerTeam}
                    inventory={gameState.inventory}
                    money={gameState.money}
                    currentStaticContent={effectiveStaticContent}
                    currentAIContent={displayAIContent ? gameState.currentAIScene : null}
                    onStaticChoiceSelect={handleStaticStoryChoice}
                    onAIChoiceSelect={handleAIChoice}
                    onPlayerCustomInputAction={handlePlayerCustomInputAction}
                    gameState={gameState} // Pass full gameState for components that need more context
                    aiLoadingStatus={gameState.aiLoadingStatus} // Pass full loading status object
                    currentLocation={gameState.currentLocationDescription}
                    currentObjective={gameState.currentObjective}
                    currentAreaMap={gameState.currentAreaMap}
                    globalAreaMap={gameState.globalAreaMap}
                    onToggleGlobalMapModal={toggleGlobalMapModal}
                    onToggleHistoryModal={toggleHistoryModal}
                    onToggleNPCListModal={toggleNPCListModal}
                    onToggleInventoryModal={toggleInventoryModal}
                    onEditPlayerProfile={togglePlayerProfileEditModal}
                    onRegeneratePokemonImage={handleRegeneratePokemonImage}
                    onOpenPokemonDetailModal={openPokemonDetailModal} // Pass the function
                />);

      case GameMode.BATTLE:
        const firstPlayerPokemonForBattle = gameState.playerTeam.find(p => p.instanceId === gameState.currentBattlePlayerPokemonId && !p.isFainted);
        const anyConsciousPokemon = gameState.playerTeam.find(p => !p.isFainted && p.isPlayerOwned);

        let initialPlayerPokemonIdForBattle = gameState.currentBattlePlayerPokemonId;
        // If the designated Pokémon is fainted or not found, pick the first available one.
        if (!firstPlayerPokemonForBattle && anyConsciousPokemon && anyConsciousPokemon.instanceId) {
            initialPlayerPokemonIdForBattle = anyConsciousPokemon.instanceId;
        }

        if (!initialPlayerPokemonIdForBattle || !anyConsciousPokemon || !gameState.currentBattleEnemy) {
          // This is an error state. Fallback or trigger AI for recovery.
          // For now, simple message and trigger AI.
          // This logic might be better inside useGameLogic to set an error state.
          triggerAIStory("ERROR_BATTLE_SETUP_FAILED_CONTINUE");
          return <div className="flex items-center justify-center h-screen text-xl">错误：战斗数据加载失败，正在尝试恢复...</div>;
        }
        return (<BattleView
                    playerTeam={gameState.playerTeam}
                    inventory={gameState.inventory}
                    initialEnemyPokemon={gameState.currentBattleEnemy}
                    initialPlayerPokemonInstanceId={initialPlayerPokemonIdForBattle!} // Assert non-null after checks
                    onBattleEnd={handleBattleEnd}
                    playerProfileName={gameState.playerProfile.name}
                    onRegeneratePokemonImage={handleRegeneratePokemonImage}
                />);
      default:
        return <div className="flex items-center justify-center h-screen text-xl">游戏加载中或遇到未知状态...</div>;
    }
  };

  return (
    <>
      {renderContent()}
      {showHistoryModal && <HistoryModal isOpen={showHistoryModal} onClose={toggleHistoryModal} history={gameState.chatHistory} />}
      {showGlobalMapModal && <GlobalMapModal isOpen={showGlobalMapModal} onClose={toggleGlobalMapModal} globalMapData={gameState.globalAreaMap}/>}
      {showNPCListModal && <NPCListModal isOpen={showNPCListModal} onClose={toggleNPCListModal} npcs={gameState.knownNPCs} onSelectNPC={handleSelectNPCToChat} />}
      {selectedNPCForChat && (
        <NPCChatModal
          npc={selectedNPCForChat}
          isOpen={!!selectedNPCForChat}
          onClose={handleCloseNPCChatModal}
          onSendMessage={memoizedHandleSendPlayerMessageToNPC}
          isLoadingAI={npcInteractionLoading || gameState.aiLoadingStatus.status === 'loading' && gameState.aiLoadingStatus.message === '获取NPC对话...'}
          suggestedReplies={npcChatSuggestions}
        />
      )}
      {showPlayerProfileEditModal && (
        <PlayerProfileEditModal
          isOpen={showPlayerProfileEditModal}
          onClose={togglePlayerProfileEditModal}
          currentProfile={gameState.playerProfile}
          onSave={(updatedProfile) => {
            handleSavePlayerProfileChanges(updatedProfile);
            togglePlayerProfileEditModal(); // Close modal after saving
          }}
        />
      )}
      {showInventoryModal && (
        <InventoryModal
          isOpen={showInventoryModal}
          onClose={toggleInventoryModal}
          inventory={gameState.inventory}
        />
      )}
      {pokemonToViewInModal && (
        <PokemonDetailModal
          pokemon={pokemonToViewInModal}
          isOpen={!!pokemonToViewInModal}
          onClose={closePokemonDetailModal}
          onRegenerateImage={handleRegeneratePokemonImage}
        />
      )}
    </>
  );
};

export default App;
