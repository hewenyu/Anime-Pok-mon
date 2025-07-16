import React from 'react';

interface ContinueGameModalProps {
  isOpen: boolean;
  savedGameTimestamp: number;
  onContinue: () => void;
  onRestart: () => void;
}

const ContinueGameModal: React.FC<ContinueGameModalProps> = ({
  isOpen,
  savedGameTimestamp,
  onContinue,
  onRestart,
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
      <div className="modal-content-base" style={{ maxWidth: '500px' }}>
        <div className="modal-header-base">
          <h2>继续冒险</h2>
        </div>

        <div className="modal-body-base">
          <div className="text-center mb-6">
            <div className="mb-4">
              <div className="text-lg mb-2">发现了上次的冒险记录！</div>
              <div className="text-sm text-gray-600">
                保存时间：{formatSavedTime(savedGameTimestamp)}
              </div>
            </div>

            <div className="text-base mb-6">
              你想要继续上次的冒险，还是开始全新的冒险？
            </div>

            <div className="flex gap-4 justify-center">
              <button
                className="choice-button"
                onClick={onContinue}
                style={{ minWidth: '120px' }}
              >
                继续冒险
              </button>

              <button
                className="choice-button secondary"
                onClick={onRestart}
                style={{ minWidth: '120px' }}
              >
                重新开始
              </button>
            </div>

            <div className="text-xs text-gray-500 mt-4">
              选择&quot;重新开始&quot;将清除之前的存档
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContinueGameModal;
