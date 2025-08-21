import React, { useEffect, useRef } from 'react';
import { BattleChatMessage } from '../../../types';
import ActionButton from '../../ui/ActionButton';

interface BattleLogProps {
  battleLog: BattleChatMessage[];
  className?: string;
}

const BattleLog: React.FC<BattleLogProps> = ({ battleLog, className = '' }) => {
  const battleLogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (battleLogRef.current) {
      battleLogRef.current.scrollTop = battleLogRef.current.scrollHeight;
    }
  }, [battleLog]);

  return (
    <div
      ref={battleLogRef}
      className={`battle-panel-base p-2 custom-scrollbar overflow-y-auto ${className}`}
    >
      <div className="space-y-1.5">
        {battleLog.map(msg =>
          msg.text === ' ' && msg.speaker === '分隔符' ? (
            <hr key={msg.id} className="battle-log-separator my-1.5" />
          ) : (
            <div key={msg.id}>
              <p
                className={`text-sm animate-message-appear ${
                  msg.type === 'player_action_log' ||
                  msg.type === 'player_command_echo'
                    ? 'battle-log-message-player'
                    : msg.type === 'enemy_action_log'
                      ? 'battle-log-message-enemy'
                      : msg.type === 'ai_feedback'
                        ? 'battle-log-message-ai-feedback'
                        : msg.type === 'ai_item_action_suggestion'
                          ? 'battle-log-message-ai-item-suggestion'
                          : 'battle-log-message-system'
                }`}
              >
                <strong>{msg.speaker}:</strong> {msg.text}
              </p>
              {msg.itemSuggestions && msg.itemSuggestions.length > 0 && (
                <div className="battle-log-ai-item-suggestions mt-1 p-2 rounded">
                  <p className="text-xs font-semibold text-purple-600 mb-1">
                    AI建议:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {msg.itemSuggestions.map((suggestion, index) => (
                      <ActionButton
                        key={index}
                        className="battle-action-button-small text-xs py-1 px-2"
                        onClick={() => {
                          // This would need to be handled by the parent component
                          console.log('Item suggestion clicked:', suggestion);
                        }}
                      >
                        {suggestion.text}
                      </ActionButton>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default BattleLog;
