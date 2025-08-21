import React from 'react';
import { Pokemon } from '../types';
import PokemonCard from './PokemonCard';
// Removed PokemonDetailModal import as it's handled by App.tsx

interface TeamAndInventoryPanelProps {
  playerTeam: Pokemon[];
  onOpenInventoryModal: () => void;
  onRegeneratePokemonImage: (instanceId: string) => void;
  onOpenPokemonDetailModal: (pokemon: Pokemon) => void; // Added prop
}

const SectionTitle: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <h3
    className={`text-lg font-semibold mb-2 text-purple-600 ${className || ''}`}
  >
    {children}
  </h3>
);

const TeamAndInventoryPanel: React.FC<TeamAndInventoryPanelProps> = ({
  playerTeam,
  onOpenInventoryModal,
  onRegeneratePokemonImage,
  onOpenPokemonDetailModal, // Use prop
}) => {
  // Removed local state for selectedPokemonForDetail and modal management

  return (
    <>
      <div className="sidebar-panel h-full overflow-y-auto custom-scrollbar flex flex-col">
        <SectionTitle className="border-b border-purple-300/70 pb-2">
          队伍与背包
        </SectionTitle>
        <button
          onClick={onOpenInventoryModal}
          className="choice-button w-full text-sm py-2.5 mb-4"
          aria-label="打开背包查看道具"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2 inline-block"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 2a1 1 0 00-1 1v1H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2h-3V3a1 1 0 00-1-1zm3 8a1 1 0 100-2 1 1 0 000 2zM7 10a1 1 0 100-2 1 1 0 000 2zm3 5a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          背包
        </button>

        <SectionTitle className="border-t border-purple-300/70 pt-3">
          同行宝可梦
        </SectionTitle>
        {playerTeam.length > 0 ? (
          <div className="space-y-2.5">
            {playerTeam.map(pokemon =>
              pokemon && pokemon.instanceId ? (
                <div
                  key={pokemon.instanceId}
                  onClick={() => onOpenPokemonDetailModal(pokemon)} // Use prop to open modal
                  className="pokemon-sidebar-card-clickable"
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ')
                      onOpenPokemonDetailModal(pokemon);
                  }}
                  aria-label={`查看 ${pokemon.name} 的详情`}
                >
                  <PokemonCard
                    pokemon={pokemon}
                    isBattleCard={false}
                    onRegenerateImage={onRegeneratePokemonImage}
                  />
                </div>
              ) : null
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">队伍中没有宝可梦。</p>
        )}
      </div>
      {/* PokemonDetailModal is no longer rendered here; it's managed by App.tsx */}
    </>
  );
};

export default TeamAndInventoryPanel;
