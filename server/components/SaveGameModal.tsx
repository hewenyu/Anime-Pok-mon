import React, { useState, useEffect } from 'react';
import styles from './SaveGameModal.module.css';
import { GameState, PlayerProfile } from '../types';
import ActionButton from './ActionButton';
import { getSavedGames, saveGameState } from '../utils/gameStateStorage';

type SaveSlotSummary = {
  slotId: number;
  timestamp: number;
  playerProfile: PlayerProfile;
};

interface SaveGameModalProps {
  isOpen: boolean;
  currentGameState: GameState;
  onClose: () => void;
  onSaveSuccess: () => void;
}

const SaveGameModal: React.FC<SaveGameModalProps> = ({
  isOpen,
  currentGameState,
  onClose,
  onSaveSuccess,
}) => {
  const [savedGames, setSavedGames] = useState<SaveSlotSummary[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchSavedGames = async () => {
        const games = await getSavedGames();
        setSavedGames(games);
      };
      fetchSavedGames();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (selectedSlot === null) {
      alert('请选择一个存档槽位！');
      return;
    }
    try {
      await saveGameState(selectedSlot, currentGameState);
      onSaveSuccess();
      onClose();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存游戏失败！');
    }
  };

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

  const renderSlot = (slotId: number) => {
    const existingSave = savedGames.find(g => g.slotId === slotId);
    return (
      <li
        key={slotId}
        className={`${styles.saveSlotItem} ${
          selectedSlot === slotId ? styles.selected : ''
        }`}
        onClick={() => setSelectedSlot(slotId)}
      >
        {existingSave ? (
          <div className={styles.saveSlotInfo}>
            <p className={styles.playerName}>
              {existingSave.playerProfile.name || '无名英雄'}
            </p>
            <p className={styles.saveTime}>
              存档于: {formatSavedTime(existingSave.timestamp)}
            </p>
            <p className={styles.playerDescription}>
              {existingSave.playerProfile.description || '一段未知的旅程...'}
            </p>
          </div>
        ) : (
          <div className={styles.saveSlotInfo}>
            <p className={styles.playerName}>[ 空存档位 {slotId} ]</p>
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="modal-overlay-base">
      <div className={styles.modalContent}>
        <div className="modal-header-base">
          <h2>保存游戏</h2>
          <button onClick={onClose} className="modal-close-button">
            &times;
          </button>
        </div>
        <div className="modal-body-base">
          <ul className={styles.list}>
            {[1, 2, 3].map(slotId => renderSlot(slotId))}
          </ul>
          <div className="mt-6 text-center">
            <ActionButton
              onClick={handleSave}
              disabled={selectedSlot === null}
              className="choice-button"
            >
              保存到所选槽位
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaveGameModal;
