import { useState, useEffect } from 'react';
import { useModal } from '../../../hooks/useModal';
import { useGameStore } from '../../../store/gameStore';
import type { SaveSlotSummary } from '../../../types';

export const SaveGameModal = () => {
  const { isOpen, closeModal } = useModal('saveGame');
  const { savedGames, fetchSavedGames, saveGame } = useGameStore();
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSavedGames();
    }
  }, [isOpen, fetchSavedGames]);

  const handleSave = async () => {
    if (selectedSlot === null) return;
    
    try {
      await saveGame(selectedSlot);
      console.log(`Game saved to slot ${selectedSlot}`);
      closeModal();
    } catch (error) {
      console.error('Failed to save game:', error);
      // Here you might want to show an error message to the user
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">保存游戏</h2>
          <button onClick={closeModal} className="text-gray-500 hover:text-gray-800" aria-label="Close">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-2">
          {savedGames.map((slot: SaveSlotSummary) => (
            <div
              key={slot.slotId}
              onClick={() => setSelectedSlot(slot.slotId)}
              className={`p-4 border rounded-lg cursor-pointer ${selectedSlot === slot.slotId ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
            >
              <p className="font-semibold">插槽 {slot.slotId}</p>
              {slot.isEmpty ? (
                <p className="text-gray-500">{slot.playerProfile.name}</p>
              ) : (
                <div>
                  <p>{slot.playerProfile.name}</p>
                  <p className="text-sm text-gray-600">{new Date(slot.timestamp).toLocaleString()}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={selectedSlot === null}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-400"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};