import React from 'react';
import styles from './ContinueGameModal.module.css';
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
      <div className={styles.modalContent}>
        <div className="modal-header-base">
          <h2>继续冒险</h2>
          <button onClick={onClose} className="modal-close-button">
            &times;
          </button>
        </div>

        <div className="modal-body-base">
          {savedGames.length > 0 ? (
            <ul className={styles.list}>
              {savedGames.map(slot => (
                <li key={slot.slotId} className={styles.saveSlotItem}>
                  <div className={styles.saveSlotInfo}>
                    <p className={styles.playerName}>
                      {slot.playerProfile.name || '无名英雄'}
                    </p>
                    <p className={styles.saveTime}>
                      存档于: {formatSavedTime(slot.timestamp)}
                    </p>
                    <p className={styles.playerDescription}>
                      {slot.playerProfile.description || '一段未知的旅程...'}
                    </p>
                  </div>
                  <div className={styles.saveSlotActions}>
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
              className={`${styles.newGameButton} choice-button`}
            >
              开始新游戏
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContinueGameModal;
