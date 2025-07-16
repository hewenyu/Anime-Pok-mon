import React from 'react';
import { NPC } from '../types';

interface NPCListModalProps {
  isOpen: boolean;
  onClose: () => void;
  npcs: NPC[];
  onSelectNPC: (npc: NPC) => void;
}

const NPCListModal: React.FC<NPCListModalProps> = ({
  isOpen,
  onClose,
  npcs,
  onSelectNPC,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="npc-list-modal-overlay modal-overlay-base"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="npcListModalTitle"
    >
      <div
        className="npc-list-modal-content modal-content-base"
        onClick={e => e.stopPropagation()}
      >
        <div className="npc-list-modal-header modal-header-base">
          <h2 id="npcListModalTitle">已认识的NPC</h2>{' '}
          {/* Specific color applied by .npc-list-modal-header h2 */}
          <button
            onClick={onClose}
            className="npc-list-modal-close-button modal-close-button-base"
            aria-label="关闭NPC列表"
          >
            &times;
          </button>
        </div>
        <div className="npc-list-modal-body modal-body-base custom-scrollbar">
          {npcs.length === 0 ? (
            <p className="text-slate-400 text-center py-4">
              你还没有认识任何人。
            </p>
          ) : (
            <ul>
              {npcs.map(npc => (
                <li
                  key={npc.id}
                  className="npc-list-entry"
                  onClick={() => onSelectNPC(npc)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') onSelectNPC(npc);
                  }}
                  aria-label={`与 ${npc.name} 对话`}
                >
                  {npc.profileImageUrl && (
                    <img
                      src={npc.profileImageUrl}
                      alt={npc.name}
                      className="npc-list-entry-image"
                    />
                  )}
                  {!npc.profileImageUrl && (
                    <div className="npc-list-entry-image flex items-center justify-center text-slate-300 text-xl">
                      ?
                    </div>
                  )}
                  <div className="npc-list-entry-info">
                    <span className="npc-list-entry-name">{npc.name}</span>
                    <span className="npc-list-entry-relation">
                      {' '}
                      ({npc.relationshipStatus})
                    </span>
                    {npc.description && (
                      <p className="npc-list-entry-description">
                        {npc.description}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default NPCListModal;
