import React, { useState, useEffect } from 'react';
import { PlayerProfile, PlayerGender } from '../types';

interface PlayerProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: PlayerProfile;
  onSave: (updatedProfile: PlayerProfile) => void;
}

const PlayerProfileEditModal: React.FC<PlayerProfileEditModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onSave,
}) => {
  const [editableName, setEditableName] = useState(currentProfile.name || '');
  const [editableGender, setEditableGender] = useState<PlayerGender>(
    currentProfile.gender || '男'
  );
  const [editableAge, setEditableAge] = useState<string>(
    currentProfile.age?.toString() || ''
  );
  const [editableDescription, setEditableDescription] = useState(
    currentProfile.description || ''
  );
  // Other stats like stamina, energy are generally game-controlled, not directly player-editable here.

  useEffect(() => {
    if (isOpen) {
      setEditableName(currentProfile.name || '');
      setEditableGender(currentProfile.gender || '男');
      setEditableAge(currentProfile.age?.toString() || '');
      setEditableDescription(currentProfile.description || '');
    }
  }, [isOpen, currentProfile]);

  if (!isOpen) {
    return null;
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const ageNum = parseInt(editableAge, 10);
    onSave({
      ...currentProfile, // Preserve other stats like stamina, etc.
      name: editableName.trim() || '冒险者',
      gender: editableGender,
      age: !isNaN(ageNum) && ageNum > 0 ? ageNum : undefined,
      description: editableDescription.trim(),
    });
  };

  return (
    <div
      className="modal-overlay-base"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="playerProfileEditModalTitle"
    >
      <div
        className="modal-content-base max-w-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header-base">
          <h2
            id="playerProfileEditModalTitle"
            className="text-xl font-bold text-yellow-300"
          >
            编辑角色信息
          </h2>
          <button
            onClick={onClose}
            className="modal-close-button-base"
            aria-label="关闭编辑角色信息"
          >
            &times;
          </button>
        </div>
        <form
          onSubmit={handleSave}
          className="modal-body-base custom-scrollbar space-y-4"
        >
          <div>
            <label htmlFor="editPlayerName" className="label-text">
              姓名:
            </label>
            <input
              type="text"
              id="editPlayerName"
              value={editableName}
              onChange={e => setEditableName(e.target.value)}
              className="input-field w-full"
              maxLength={15}
            />
          </div>
          <div>
            <label htmlFor="editPlayerGender" className="label-text">
              性别:
            </label>
            <select
              id="editPlayerGender"
              value={editableGender}
              onChange={e => setEditableGender(e.target.value as PlayerGender)}
              className="input-field w-full"
            >
              <option value="男">男</option>
              <option value="女">女</option>
            </select>
          </div>
          <div>
            <label htmlFor="editPlayerAge" className="label-text">
              年龄:
            </label>
            <input
              type="number"
              id="editPlayerAge"
              value={editableAge}
              onChange={e => setEditableAge(e.target.value)}
              className="input-field w-full"
              min="1"
              max="120"
            />
          </div>
          <div>
            <label htmlFor="editPlayerDescription" className="label-text">
              人物说明 (性格/背景):
            </label>
            <textarea
              id="editPlayerDescription"
              value={editableDescription}
              onChange={e => setEditableDescription(e.target.value)}
              className="input-field w-full h-24 custom-scrollbar"
              maxLength={150}
              placeholder="描述你的角色..."
            />
          </div>
          <div className="pt-4 border-t border-purple-600/30 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="choice-button secondary"
            >
              取消
            </button>
            <button type="submit" className="choice-button">
              保存更改
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlayerProfileEditModal;
