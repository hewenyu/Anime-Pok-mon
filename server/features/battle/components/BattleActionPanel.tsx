import React from 'react';
import { BattleScreen } from '../store/battleStore';
import { LoadingStatus } from '../../../types';

interface BattleActionPanelProps {
  currentScreen: BattleScreen;
  playerInput: string;
  commandParseLoadingStatus: LoadingStatus;
  itemSubActionLoading: LoadingStatus;
  isProcessingTurn: boolean;
  onPlayerInputChange: (input: string) => void;
  onPlayerInputSubmit: () => void;
  children: React.ReactNode; // For screen content
}

const BattleActionPanel: React.FC<BattleActionPanelProps> = ({
  currentScreen,
  playerInput,
  commandParseLoadingStatus,
  itemSubActionLoading,
  isProcessingTurn,
  onPlayerInputChange,
  onPlayerInputSubmit,
  children,
}) => {
  const isInputDisabled =
    commandParseLoadingStatus.status !== 'idle' ||
    isProcessingTurn ||
    itemSubActionLoading.status !== 'idle';

  const showInputForm =
    currentScreen !== 'ACTION_INFO' &&
    currentScreen !== 'BATTLE_OVER_CHOICES' &&
    currentScreen !== 'FORCED_SWITCH';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onPlayerInputSubmit();
  };

  return (
    <div className="battle-panel-base md:w-2/5 lg:w-2/5 p-2 flex flex-col md:border-t-0 border-purple-300/50 order-2 md:order-2">
      {showInputForm && (
        <form onSubmit={handleSubmit} className="mb-2 flex gap-2">
          <input
            type="text"
            value={playerInput}
            onChange={e => onPlayerInputChange(e.target.value)}
            placeholder="输入战斗指令 (例如: 使用电光一闪)"
            className="input-field flex-grow text-sm"
            disabled={isInputDisabled}
          />
          <button
            type="submit"
            className="choice-button secondary px-4 text-sm"
            disabled={isInputDisabled || !playerInput.trim()}
          >
            发送
          </button>
        </form>
      )}
      <div className="flex-grow overflow-y-auto custom-scrollbar">
        {children}
      </div>
    </div>
  );
};

export default BattleActionPanel;
