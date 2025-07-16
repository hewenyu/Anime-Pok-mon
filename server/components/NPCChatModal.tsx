
import React, { useState, useEffect, useRef } from 'react';
import { NPC, ChatHistoryEntry, AIStoryChoice } from '../types';

interface NPCChatModalProps {
  npc: NPC | null;
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (npcId: string, messageText: string, suggestionActionTag?: string) => void;
  isLoadingAI: boolean; 
  suggestedReplies: AIStoryChoice[] | null;
}

const NPCChatModal: React.FC<NPCChatModalProps> = ({ npc, isOpen, onClose, onSendMessage, isLoadingAI, suggestedReplies }) => {
  const [message, setMessage] = useState('');
  const chatBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [npc?.dialogueHistory, isOpen, suggestedReplies]); // Also scroll when suggestions appear/change

  if (!isOpen || !npc) {
    return null;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoadingAI) {
      onSendMessage(npc.id, message.trim());
      setMessage('');
    }
  };

  const handleSuggestionClick = (reply: AIStoryChoice) => {
    if (!isLoadingAI) {
      onSendMessage(npc.id, reply.text, reply.actionTag);
      setMessage(''); 
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="npc-chat-modal-overlay modal-overlay-base" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby={`npcChatModalTitle-${npc.id}`}>
      <div className="npc-chat-modal-content modal-content-base" onClick={(e) => e.stopPropagation()}>
        <div className="npc-chat-modal-header modal-header-base">
          <h2 id={`npcChatModalTitle-${npc.id}`}>
            与 {npc.name} 对话 
            <span className="npc-relationship">({npc.relationshipStatus})</span>
          </h2>
          <button onClick={onClose} className="npc-chat-modal-close-button modal-close-button-base" aria-label={`关闭与 ${npc.name} 的对话`}>
            &times;
          </button>
        </div>
        <div ref={chatBodyRef} className="npc-chat-modal-body modal-body-base custom-scrollbar">
          {[...(npc.dialogueHistory || [])].reverse().map((entry) => (
            <div 
              key={entry.id} 
              className={`npc-chat-log-entry ${entry.speaker === npc.name || entry.type === 'npc_dialogue' ? 'npc' : 'player'}`}
            >
              <span className="npc-chat-log-speaker">{entry.speaker} - {formatTimestamp(entry.timestamp)}</span>
              {entry.narrative}
            </div>
          ))}
          {npc.dialogueHistory.length === 0 && <p className="text-slate-400 text-center py-4">开始你们的对话吧！</p>}
        </div>
        
        {suggestedReplies && suggestedReplies.length > 0 && !isLoadingAI && (
          <div className="my-2 pt-2 border-t border-purple-600/30">
            <p className="text-xs text-slate-300 mb-1.5 ml-1">快速回复：</p>
            <div className="flex flex-wrap gap-2 px-1">
              {suggestedReplies.map((reply, index) => (
                <button
                  key={`suggest-reply-${index}-${reply.actionTag}`}
                  onClick={() => handleSuggestionClick(reply)}
                  className="choice-button secondary py-1.5 px-3 text-sm"
                  title={reply.tooltip}
                  aria-label={`建议回复: ${reply.text}`}
                >
                  {reply.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoadingAI && <p className="npc-chat-loading-indicator">等待 {npc.name} 回应中...</p>}
        
        <form onSubmit={handleSubmit} className="npc-chat-input-area">
          <input
            type="text"
            value={message}
            onChange={handleInputChange}
            placeholder={`给 ${npc.name} 发送消息...`}
            className="input-field"
            disabled={isLoadingAI}
            aria-label="聊天输入框"
          />
          <button type="submit" className="choice-button" disabled={isLoadingAI || !message.trim()}>
            发送
          </button>
        </form>
      </div>
    </div>
  );
};

export default NPCChatModal;
