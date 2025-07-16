
import React from 'react';
import { ChatHistoryEntry } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: ChatHistoryEntry[];
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, history }) => {
  if (!isOpen) {
    return null;
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="history-modal-overlay modal-overlay-base" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="historyModalTitle">
      <div className="history-modal-content modal-content-base" onClick={(e) => e.stopPropagation()}>
        <div className="history-modal-header modal-header-base">
          <h2 id="historyModalTitle" className="text-xl font-bold">对话历史</h2> {/* Specific color already applied by .history-modal-header h2 */}
          <button onClick={onClose} className="history-modal-close-button modal-close-button-base" aria-label="关闭历史记录">
            &times;
          </button>
        </div>
        <div className="history-modal-body modal-body-base custom-scrollbar">
          {history.length === 0 ? (
            <p className="text-slate-400 text-center py-4">还没有对话记录。</p>
          ) : (
            history.map((entry) => (
              <div key={entry.id} className="history-entry">
                <div className="history-entry-meta">
                  <span className="history-entry-speaker">{entry.speaker || "旁白"}</span>
                  <span className="history-entry-timestamp">{formatTimestamp(entry.timestamp)}</span>
                </div>
                <p className="history-entry-narrative">{entry.narrative}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;