import React from 'react';
import { PlayerProfile } from '../types';
import GameTimeDisplay from './GameTimeDisplay';

interface PlayerInfoPanelProps {
  playerProfile: PlayerProfile;
  money: number;
  currentLocation: string;
  currentObjective: string;
  currentAreaMap: string | null;
  onOpenGlobalMapModal: () => void;
  onEditPlayerProfile: () => void;
  currentGameTime: number;
}

const PlayerStatBar: React.FC<{
  label: string;
  current: number;
  max: number;
  barColorClass: string;
  textColorClass?: string;
}> = ({
  label,
  current,
  max,
  barColorClass,
  textColorClass = 'text-gray-700',
}) => {
  const percentage = max > 0 ? Math.max(0, (current / max) * 100) : 0;
  return (
    <div className="my-1.5">
      <div className="flex justify-between items-baseline text-sm mb-0.5">
        <span className={`font-semibold ${textColorClass}`}>{label}</span>
        <span className={`text-xs ${textColorClass}`}>
          {current} / {max}
        </span>
      </div>
      <div className="w-full bg-gray-300/50 rounded-full h-2.5 border border-gray-400/30 shadow-inner overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-linear ${barColorClass} shadow-sm`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
};

const SectionTitle: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <h3
    className={`text-lg font-semibold mb-2 text-purple-600 border-t border-purple-300/70 pt-3 ${className || ''}`}
  >
    {children}
  </h3>
);

const PlayerInfoPanel: React.FC<PlayerInfoPanelProps> = ({
  playerProfile,
  money,
  currentLocation,
  currentObjective,
  currentAreaMap,
  onOpenGlobalMapModal,
  onEditPlayerProfile,
  currentGameTime,
}) => {
  return (
    <div className="sidebar-panel h-full overflow-y-auto custom-scrollbar flex flex-col">
      <GameTimeDisplay timestamp={currentGameTime} />

      <div className="mb-3">
        <h2
          className="text-xl md:text-2xl font-bold mb-2 text-pink-600 border-b border-pink-400/50 pb-2 drop-shadow-sm cursor-pointer hover:text-pink-500 transition-colors"
          onClick={onEditPlayerProfile}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') onEditPlayerProfile();
          }}
          title="编辑角色信息"
          aria-label={`编辑 ${playerProfile.name || '训练家'} 的信息`}
        >
          {playerProfile.name || '训练家'}
        </h2>
        <div className="text-sm space-y-0.5">
          <p>
            <span className="font-semibold text-sky-700">性别:</span>{' '}
            <span className="text-gray-800">{playerProfile.gender}</span>
          </p>
          {playerProfile.age && (
            <p>
              <span className="font-semibold text-sky-700">年龄:</span>{' '}
              <span className="text-gray-800">{playerProfile.age}</span>
            </p>
          )}
          {playerProfile.description && (
            <p>
              <span className="font-semibold text-sky-700">说明:</span>{' '}
              <span className="text-gray-800 italic text-xs">
                {playerProfile.description}
              </span>
            </p>
          )}

          <PlayerStatBar
            label="体力"
            current={playerProfile.stamina ?? 0}
            max={playerProfile.maxStamina ?? 0}
            barColorClass="bg-gradient-to-r from-rose-500 to-pink-600"
            textColorClass="text-rose-700"
          />
          <PlayerStatBar
            label="精力"
            current={playerProfile.energy ?? 0}
            max={playerProfile.maxEnergy ?? 0}
            barColorClass="bg-gradient-to-r from-teal-400 to-cyan-600"
            textColorClass="text-teal-700"
          />
          <p className="mt-1.5">
            <span className="font-semibold text-sky-700">健康状况:</span>{' '}
            <span className="text-gray-800">{playerProfile.healthStatus}</span>
          </p>
          <div className="mt-2 pt-2 border-t border-purple-300/50">
            <span className="font-semibold text-sky-700">金钱: </span>
            <span className="text-lg text-green-600 font-mono">
              ${money.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-3">
        <SectionTitle className="mt-1">状态与位置</SectionTitle>
        <div className="mt-1 text-sm space-y-1">
          <div>
            <p className="text-sky-700 font-semibold">当前位置:</p>
            <p className="text-gray-800">{currentLocation}</p>
          </div>
          <div>
            <p className="text-sky-700 font-semibold mt-1">当前目标:</p>
            <p className="text-gray-800">{currentObjective}</p>
          </div>
          <div className="mt-1">
            <p className="text-sky-700 font-semibold">当前区域地图:</p>
            {typeof currentAreaMap === 'string' &&
            currentAreaMap.trim() !== '' ? (
              <div className="area-map-container custom-scrollbar">
                <pre className="area-map-text">{currentAreaMap}</pre>
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic mt-1">
                当前区域地图未探索或不可用
              </p>
            )}
          </div>
          <button
            onClick={onOpenGlobalMapModal}
            className="choice-button secondary w-full text-sm mt-3 py-2"
            aria-label="查看世界地图"
          >
            查看世界地图
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerInfoPanel;
