import React from 'react';
import { BattleRecord } from '../types';

interface BattleHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  battleHistory: BattleRecord[];
}

const BattleHistoryModal: React.FC<BattleHistoryModalProps> = ({
  isOpen,
  onClose,
  battleHistory,
}) => {
  if (!isOpen) return null;

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return '未知';
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0
      ? `${minutes}分${remainingSeconds}秒`
      : `${remainingSeconds}秒`;
  };

  const getOutcomeText = (outcome: string) => {
    switch (outcome) {
      case 'win':
        return '胜利';
      case 'loss':
        return '失败';
      case 'run':
        return '逃跑';
      case 'catch':
        return '捕获';
      default:
        return outcome;
    }
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'win':
        return 'text-green-600';
      case 'loss':
        return 'text-red-600';
      case 'run':
        return 'text-yellow-600';
      case 'catch':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-purple-800">战斗记录</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {battleHistory.length === 0 ? (
          <p className="text-center text-gray-500 py-8">暂无战斗记录</p>
        ) : (
          <div className="space-y-4">
            {battleHistory
              .slice()
              .reverse()
              .map(battle => (
                <div
                  key={battle.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {battle.playerPokemon} vs {battle.enemyPokemon}
                      </h3>
                      <p className="text-sm text-gray-600">{battle.location}</p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-semibold ${getOutcomeColor(battle.outcome)}`}
                      >
                        {getOutcomeText(battle.outcome)}
                      </span>
                      <p className="text-sm text-gray-500">
                        {formatTimestamp(battle.timestamp)}
                      </p>
                      {battle.duration && (
                        <p className="text-sm text-gray-500">
                          用时: {formatDuration(battle.duration)}
                        </p>
                      )}
                    </div>
                  </div>

                  {battle.caughtPokemon && (
                    <p className="text-sm text-purple-600 mb-2">
                      捕获了: {battle.caughtPokemon}
                    </p>
                  )}

                  {battle.battleLog.length > 0 && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                        查看详细战斗记录 ({battle.battleLog.length} 条消息)
                      </summary>
                      <div className="mt-2 max-h-48 overflow-y-auto bg-gray-50 p-3 rounded">
                        {battle.battleLog.map((log, index) => (
                          <div key={log.id || index} className="mb-1 text-sm">
                            <span className="font-medium text-gray-700">
                              {log.speaker}:
                            </span>{' '}
                            <span className="text-gray-800">{log.text}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BattleHistoryModal;
