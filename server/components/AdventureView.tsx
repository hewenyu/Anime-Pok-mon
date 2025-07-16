import React from 'react';
import {
  GameState,
  PlayerProfile,
  Pokemon,
  InventoryItem,
  StorySegment,
  AIStoryResponse,
  StoryChoice,
  AIStoryChoice,
  GameMode,
  LoadingStatus,
} from '../types';
import AdventurePanel from './AdventurePanel';
import PlayerInfoPanel from './PlayerInfoPanel';
import TeamAndInventoryPanel from './TeamAndInventoryPanel';

interface AdventureViewProps {
  playerProfile: PlayerProfile;
  playerTeam: Pokemon[];
  inventory: InventoryItem[];
  money: number;
  currentStaticContent: StorySegment | null;
  currentAIContent: AIStoryResponse | null;
  onStaticChoiceSelect: (choice: StoryChoice) => void;
  onAIChoiceSelect: (choice: AIStoryChoice) => void;
  onPlayerCustomInputAction: (inputText: string) => void;
  gameState: GameState;
  aiLoadingStatus: LoadingStatus;
  currentLocation: string;
  currentObjective: string;
  currentAreaMap: string | null;
  globalAreaMap: Record<string, string>;
  onToggleGlobalMapModal: () => void;
  onToggleHistoryModal: () => void;
  onToggleNPCListModal: () => void;
  onToggleInventoryModal: () => void;
  onEditPlayerProfile: () => void;
  onRegeneratePokemonImage: (instanceId: string) => void;
  onOpenPokemonDetailModal: (pokemon: Pokemon) => void; // Added prop
}

const AdventureView: React.FC<AdventureViewProps> = props => {
  if (props.gameState.gameMode !== GameMode.ADVENTURE) {
    return null;
  }

  return (
    <div className="flex flex-col md:flex-row h-screen">
      {/* Left Sidebar: Player Info */}
      <aside className="sidebar-container w-full md:w-64 lg:w-80 flex-shrink-0 order-1 md:order-1 p-2 md:p-3 lg:p-4 h-auto md:h-screen md:max-h-screen flex flex-col">
        <PlayerInfoPanel
          playerProfile={props.playerProfile}
          money={props.money}
          currentLocation={props.currentLocation}
          currentObjective={props.currentObjective}
          currentAreaMap={props.currentAreaMap}
          onOpenGlobalMapModal={props.onToggleGlobalMapModal}
          onEditPlayerProfile={props.onEditPlayerProfile}
          currentGameTime={props.gameState.currentGameTime}
        />
      </aside>

      {/* Main content area: Adventure Narrative and Actions */}
      <main className="flex-grow order-2 md:order-2 p-2 md:p-3 lg:p-4 h-full md:max-h-screen flex flex-col">
        <AdventurePanel
          currentStaticContent={props.currentStaticContent}
          currentAIContent={props.currentAIContent}
          playerProfile={props.playerProfile}
          playerTeam={props.playerTeam}
          onStaticChoiceSelect={props.onStaticChoiceSelect}
          onAIChoiceSelect={props.onAIChoiceSelect}
          onPlayerCustomInputAction={props.onPlayerCustomInputAction}
          gameState={props.gameState}
          aiLoadingStatus={props.aiLoadingStatus}
          onToggleHistoryModal={props.onToggleHistoryModal}
          onToggleNPCListModal={props.onToggleNPCListModal}
        />
      </main>

      {/* Right Sidebar: Team and Inventory Button */}
      <aside className="sidebar-container w-full md:w-64 lg:w-80 flex-shrink-0 order-3 md:order-3 p-2 md:p-3 lg:p-4 h-auto md:h-screen md:max-h-screen flex flex-col">
        <TeamAndInventoryPanel
          playerTeam={props.playerTeam}
          onOpenInventoryModal={props.onToggleInventoryModal}
          onRegeneratePokemonImage={props.onRegeneratePokemonImage}
          onOpenPokemonDetailModal={props.onOpenPokemonDetailModal} // Pass prop
        />
      </aside>
    </div>
  );
};

export default AdventureView;
