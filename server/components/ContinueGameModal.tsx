import React from 'react';
import { PlayerProfile } from '../types';
import ActionButton from './ActionButton';

// The type for a save slot summary, as returned by the modified getSavedGames
type SaveSlotSummary = {
  slotId: number;
  timestamp: number;
  playerProfile: PlayerProfile;
};

interface ContinueGameModalProps {
  isOpen: boolean;
  savedGames: SaveSlotSummary[];
  onLoadGame: (slotId: number) => void;
  onDeleteGame: (slotId: number) => void;
  onClose: () => void; // To close the modal, e.g., when starting a new game
  onNewGame: () => void;
}

const ContinueGameModal: React.FC<ContinueGameModalProps> = ({
  isOpen,
  savedGames,
  onLoadGame,
  onDeleteGame,
  onClose,
  onNewGame,
}) => {
  if (!isOpen) return null;

  const formatSavedTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="modal-overlay-base">
      <div className="modal-content-base" style={{ maxWidth: '600px' }}>
        <div className="modal-header-base">
          <h2>继续冒险</h2>
          <button onClick={onClose} className="modal-close-button">&times;</button>
        </div>

        <div className="modal-body-base">
          {savedGames.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {savedGames.map((slot) => (
                <li key={slot.slotId} className="save-slot-item">
                  <div className="save-slot-info">
                    <p className="player-name">{slot.playerProfile.name || '无名英雄'}</p>
                    <p className="save-time">存档于: {formatSavedTime(slot.timestamp)}</p>
                    <p className="player-description">{slot.playerProfile.description || '一段未知的旅程...'}</p>
                  </div>
                  <div className="save-slot-actions">
                    <ActionButton
                      onClick={() => {
                        onLoadGame(slot.slotId);
                        onClose();
                      }}
                      className="choice-button"
                    >
                      加载
                    </ActionButton>
                    <ActionButton
                      onClick={() => onDeleteGame(slot.slotId)}
                      className="choice-button secondary"
                    >
                      删除
                    </ActionButton>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center p-8">
              <p className="text-lg text-gray-600">无存档记录</p>
              <p className="text-sm text-gray-500 mt-2">开始一段新的冒险吧！</p>
            </div>
          )}
           <div className="mt-6 text-center">
             <ActionButton
                onClick={onNewGame}
                className="choice-button"
                style={{ minWidth: '150px' }}
              >
                开始新游戏
              </ActionButton>
           </div>
        </div>
      </div>
      <style>{`
        .save-slot-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #eee;
          transition: background-color 0.2s;
        }
        .save-slot-item:hover {
          background-color: #f9f9f9;
        }
        .save-slot-item:last-child {
          border-bottom: none;
        }
        .save-slot-info {
          flex-grow: 1;
        }
        .player-name {
          font-weight: bold;
          font-size: 1.1rem;
          color: #333;
          margin: 0 0 0.25rem 0;
        }
        .save-time {
          font-size: 0.8rem;
          color: #666;
          margin: 0 0 0.5rem 0;
        }
        .player-description {
            font-size: 0.9rem;
            color: #555;
            margin: 0;
        }
        .save-slot-actions {
          display: flex;
          gap: 0.5rem;
          flex-shrink: 0;
          margin-left: 1rem;
        }
      `}</style>
    </div>
  );
};

export default ContinueGameModal;
