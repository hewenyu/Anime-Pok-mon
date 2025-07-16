
import React from 'react';

interface NPCCommunicationFABProps {
  onOpen: () => void;
}

const NPCCommunicationFAB: React.FC<NPCCommunicationFABProps> = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="fab-base npc-communication-fab"
      aria-label="打开NPC交流列表"
      title="与NPC交流"
    >
      交流
    </button>
  );
};

export default NPCCommunicationFAB;
