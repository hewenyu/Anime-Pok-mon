import React from 'react';

interface GlobalMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  globalMapData: Record<string, string>; // Key: location name, Value: textual map data
}

const GlobalMapModal: React.FC<GlobalMapModalProps> = ({
  isOpen,
  onClose,
  globalMapData,
}) => {
  if (!isOpen) {
    return null;
  }

  // Get keys and reverse them to show newest first
  const discoveredLocations = Object.keys(globalMapData).reverse();

  return (
    <div
      className="global-map-modal-overlay modal-overlay-base"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="globalMapModalTitle"
    >
      <div
        className="global-map-modal-content modal-content-base"
        onClick={e => e.stopPropagation()}
      >
        <div className="global-map-modal-header modal-header-base">
          <h2 id="globalMapModalTitle">世界地图</h2>{' '}
          {/* Specific color already applied by .global-map-modal-header h2 */}
          <button
            onClick={onClose}
            className="global-map-modal-close-button modal-close-button-base"
            aria-label="关闭世界地图"
          >
            &times;
          </button>
        </div>
        <div className="global-map-modal-body modal-body-base custom-scrollbar">
          {discoveredLocations.length === 0 ? (
            <p className="text-slate-400 text-center py-4">
              世界地图上还没有任何记录。
            </p>
          ) : (
            discoveredLocations.map(locationName => (
              <div key={locationName} className="global-map-entry">
                <h3 className="global-map-entry-location">{locationName}</h3>
                <pre className="global-map-entry-data">
                  {globalMapData[locationName]}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalMapModal;
