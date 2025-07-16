import React, { useState } from 'react';
import { InventoryItem } from '../types';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
}

const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  inventory,
}) => {
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const handleImageError = (
    e: React.SyntheticEvent<HTMLImageElement, Event>
  ) => {
    const target = e.target as HTMLImageElement;
    target.onerror = null; // Prevent infinite loop if placeholder also fails
    // Use a placeholder that includes the first letter of the item name
    const itemName = target.alt || '?';
    target.src = `https://placehold.co/48x48/E0D8F0/4A3F66?text=${encodeURIComponent(itemName.substring(0, 1))}`;
  };

  const toggleItemExpansion = (itemId: string) => {
    setExpandedItemId(prevId => (prevId === itemId ? null : itemId));
  };

  return (
    <div
      className="modal-overlay-base"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="inventoryModalTitle"
    >
      <div
        className="inventory-modal-content modal-content-base max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header-base inventory-modal-header">
          {' '}
          {/* Added specific header class back for title color */}
          <h2 id="inventoryModalTitle" className="text-xl font-bold">
            我的背包
          </h2>{' '}
          {/* Specific color applied by .inventory-modal-content .modal-header-base h2 */}
          <button
            onClick={onClose}
            className="modal-close-button-base"
            aria-label="关闭背包"
          >
            &times;
          </button>
        </div>
        <div className="modal-body-base custom-scrollbar">
          {inventory.length === 0 ? (
            <p className="text-slate-400 text-center py-4">背包是空的。</p>
          ) : (
            <ul className="space-y-2.5">
              {inventory.map(item => (
                <li
                  key={item.id}
                  className="p-3 bg-purple-100/70 rounded-lg shadow border border-purple-300/50 cursor-pointer transition-all hover:bg-purple-200/80"
                  onClick={() => toggleItemExpansion(item.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ')
                      toggleItemExpansion(item.id);
                  }}
                  tabIndex={0}
                  aria-expanded={expandedItemId === item.id}
                  aria-controls={`item-desc-${item.id}`}
                >
                  <div className="flex items-start">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-10 h-10 mr-3 mt-0.5 object-contain rounded bg-white/50 p-0.5 border border-purple-200/70 shadow-sm flex-shrink-0"
                        onError={e => handleImageError(e)} // Pass event to handler
                      />
                    )}
                    <div className="flex-grow">
                      <div className="flex justify-between items-baseline">
                        <span className="font-semibold text-gray-800">
                          {item.name}
                        </span>
                        <span className="text-sm text-slate-600">
                          数量: {item.quantity}
                        </span>
                      </div>
                      {item.effectText && (
                        <p className="text-sm text-indigo-600 font-medium mt-0.5">
                          {item.effectText}
                        </p>
                      )}
                      {expandedItemId !== item.id &&
                        !item.effectText &&
                        item.description && ( // Only show "click for details" if there is a description
                          <p className="text-xs text-slate-500 italic mt-1">
                            点击查看详情
                          </p>
                        )}
                    </div>
                  </div>
                  {expandedItemId === item.id && item.description && (
                    <div
                      id={`item-desc-${item.id}`}
                      className="mt-2 pt-2 border-t border-purple-300/40"
                    >
                      <p className="text-xs text-slate-500 italic">
                        {item.description}
                      </p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryModal;
