
import React, { useState, useEffect } from 'react';
import { Pokemon, PokemonType, ActiveStatusCondition, PokemonMoveInstance } from '../types';
import TypeBadge from './TypeBadge';
import { STATUS_CONDITION_INFO } from '../constants'; // For status display

interface PokemonCardProps {
  pokemon: Pokemon;
  isPlayerCard?: boolean;
  isBattleCard?: boolean;
  onRegenerateImage?: (instanceId: string) => void;
}

const ResourceBar: React.FC<{current: number, max: number, colorClass: string, label: string, barHeight?: string, textClass?: string}> =
  ({ current, max, colorClass, label, barHeight = "h-2 md:h-2.5", textClass = "text-gray-700" }) => {
  const percentage = max > 0 ? Math.max(0, (current / max) * 100) : 0;
  return (
    <div className="w-full bg-gray-300/70 rounded-full border border-gray-400/30 shadow-inner overflow-hidden my-0.5"
         aria-label={`${label}: ${current}/${max}`}>
      <div className={`${barHeight} bg-gray-200 rounded-full`}>
        <div
          className={`h-full rounded-full transition-all duration-300 ease-linear ${colorClass} flex items-center justify-end shadow-sm`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={max}
        >
        </div>
      </div>
    </div>
  );
};


const PokemonCard: React.FC<PokemonCardProps> = ({ pokemon, isPlayerCard = false, isBattleCard = true, onRegenerateImage }) => {
  const { name, level, currentHp, maxHp, currentXp, xpToNextLevel, types, imageUrl, isFainted, isHit, statusConditions, instanceId } = pokemon;
  const [imageLoadError, setImageLoadError] = useState(false);

  useEffect(() => {
    setImageLoadError(false);
  }, [imageUrl, instanceId]); // Added instanceId to reset error state if pokemon instance changes

  const handleImageError = () => {
    setImageLoadError(true);
  };

  const cardClasses = `
    p-3 md:p-4 rounded-xl shadow-lg
    bg-gradient-to-br from-white/80 via-pink-50/70 to-purple-100/70 backdrop-blur-md 
    border border-purple-300/40
    ${isBattleCard ? 'min-w-[250px] sm:min-w-[270px] md:min-w-[300px] max-w-sm' : 'w-full'}
    ${isFainted && isBattleCard ? 'animate-faint opacity-60' : ''}
    ${isHit && isBattleCard ? 'animate-shake' : ''}
    transition-all duration-300 text-gray-800
  `;

  const getHpColorClass = (current: number, max: number) => {
    const percentage = max > 0 ? (current / max) * 100 : 0;
    if (percentage <= 20) return 'bg-gradient-to-r from-red-500 to-red-700';
    if (percentage <= 50) return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
    return 'bg-gradient-to-r from-green-500 to-green-600';
  };

  const xpColorClass = 'bg-gradient-to-r from-purple-500 to-fuchsia-600';

  const nameColor = 'text-purple-700';
  const levelColor = 'text-pink-600';
  const statsTextColor = 'text-gray-700';
  const nonBattleStatsTextColor = 'text-gray-600';

  const renderStatusConditions = (conditions: ActiveStatusCondition[]) => {
    if (!conditions || conditions.length === 0) return null;
    return (
      <div className={`flex gap-1 mt-1 ${isPlayerCard && isBattleCard ? 'justify-end' : 'justify-start'}`}>
        {conditions.map(activeCond => {
          const condInfo = STATUS_CONDITION_INFO[activeCond.condition];
          if (!condInfo || !condInfo.shortName) return null;
          let statusSpecificColor = condInfo.colorClass || 'bg-gray-500 text-white';
          return (
            <span
              key={activeCond.condition}
              className={`px-1.5 py-0.5 text-xs font-semibold rounded-full shadow ${statusSpecificColor} type-badge-base`}
              title={activeCond.condition}
            >
              {condInfo.shortName}
            </span>
          );
        })}
      </div>
    );
  };


  const StatsBlock: React.FC = () => (
    <div className={`flex-grow ${isPlayerCard ? 'text-right pr-1' : 'text-left pl-1'}`}>
      <div className={`flex ${isPlayerCard ? 'justify-end' : 'justify-start'} items-baseline mb-1`}>
        <h3 className={`text-lg md:text-xl font-bold ${nameColor} mr-2 drop-shadow-sm`}>{name}</h3>
        <span className={`text-sm ${levelColor} font-semibold`}>Lv.{level}</span>
      </div>

      {renderStatusConditions(statusConditions)}

      <ResourceBar current={currentHp} max={maxHp} colorClass={getHpColorClass(currentHp, maxHp)} label="HP" textClass={statsTextColor}/>
      <p className={`text-xs font-medium ${statsTextColor} mt-0.5 mb-1`}>{currentHp} / {maxHp} HP</p>

      {!isFainted && !isBattleCard && (
        <>
            <ResourceBar current={currentXp} max={xpToNextLevel} colorClass={xpColorClass} label="XP" textClass={statsTextColor}/>
            <p className={`text-xs font-medium ${statsTextColor} mt-0.5`}>{currentXp} / {xpToNextLevel} XP</p>
        </>
      )}

      <div className={`flex gap-1.5 mt-2 ${isPlayerCard ? 'justify-end' : 'justify-start'}`}>
        {types.map((type: PokemonType) => <TypeBadge key={type} type={type} />)}
      </div>
    </div>
  );

  const ImageBlock: React.FC = () => (
    <div className={`relative ${isBattleCard ? (isPlayerCard ? 'w-24 h-24 md:w-28 md:h-28 lg:w-32 lg:h-32' : 'w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28') : 'w-16 h-16 md:w-20 md:h-20'} flex-shrink-0 bg-gray-100/50 rounded-md border border-gray-300/50 flex items-center justify-center overflow-hidden`}>
      {imageLoadError && !isFainted ? (
        <div className="flex flex-col items-center justify-center text-center w-full h-full p-1 bg-white/70 rounded-md">
          <span className="text-xs text-red-600 mb-1">图片加载失败</span>
          {onRegenerateImage && instanceId && (
            <button
              onClick={(e) => { e.stopPropagation(); onRegenerateImage(instanceId); }}
              className="text-xs bg-sky-500 hover:bg-sky-600 text-white font-semibold py-0.5 px-1.5 rounded shadow transition-colors"
              title="尝试重新加载图片"
            >
              刷新图片
            </button>
          )}
        </div>
      ) : (
        <img
          src={imageUrl}
          alt={name}
          className="object-contain w-full h-full drop-shadow-lg filter brightness-105 saturate-105"
          style={{ imageRendering: 'pixelated' }}
          onError={handleImageError}
        />
      )}
       {isFainted && (
        <div className="absolute inset-0 bg-gray-400/70 flex items-center justify-center rounded-md">
          <span className="text-red-700 font-bold text-sm">倒下</span>
        </div>
      )}
    </div>
  );

  if (!isBattleCard) { // Sidebar card style
    return (
      <div className={`p-2.5 rounded-lg shadow-md bg-white/70 border border-purple-200/60 flex flex-col gap-2 ${isFainted ? 'opacity-70' : ''}`}>
        <div className="flex items-center gap-3">
          <ImageBlock />
          <div className="flex-grow">
            <h4 className={`text-md font-semibold ${nameColor}`}>{name} <span className={`text-xs ${levelColor}`}>Lv.{level}</span></h4>
            {renderStatusConditions(statusConditions)}
            <ResourceBar current={currentHp} max={maxHp} colorClass={getHpColorClass(currentHp, maxHp)} label="HP" barHeight="h-1.5 md:h-2" textClass={nonBattleStatsTextColor}/>
            <p className={`text-xs ${nonBattleStatsTextColor} mt-0.5 mb-1`}>{currentHp} / {maxHp} HP</p>

            <ResourceBar current={currentXp} max={xpToNextLevel} colorClass={xpColorClass} label="XP" barHeight="h-1.5 md:h-2" textClass={nonBattleStatsTextColor}/>
            <p className={`text-xs ${nonBattleStatsTextColor} mt-0.5`}>{currentXp} / {xpToNextLevel} XP</p>

            <div className={`flex gap-1 mt-1.5`}>
              {types.map((type: PokemonType) => <TypeBadge key={type} type={type} />)}
            </div>
          </div>
        </div>
        {/* Moves list removed from sidebar card as per user request */}
      </div>
    )
  }

  // Battle card style
  return (
    <div className={cardClasses}>
      {isPlayerCard ? (
        <div className="flex items-center justify-between">
          <StatsBlock />
          <div className="ml-2 md:ml-3"><ImageBlock /></div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="mr-2 md:mr-3"><ImageBlock /></div>
          <StatsBlock />
        </div>
      )}
    </div>
  );
};

export default PokemonCard;
