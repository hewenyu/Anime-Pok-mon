import React, { useState, useEffect, useCallback } from 'react';
import {
  Pokemon,
  PokemonType,
  PokemonMoveInstance,
  ActiveStatusCondition,
  Stat,
  StatStageModifier,
  StatusCondition,
} from '../types';
import TypeBadge from './TypeBadge';
import { STATUS_CONDITION_INFO, STAT_STAGE_MULTIPLIERS } from '../constants';
import { fetchMoveDescription } from '../services/geminiService'; // Import the new service

interface PokemonDetailModalProps {
  pokemon: Pokemon | null;
  isOpen: boolean;
  onClose: () => void;
  onRegenerateImage?: (instanceId: string) => void;
}

interface ResourceBarProps {
  current: number;
  max: number;
  colorClass: string;
  label: string;
}

const ModalResourceBar: React.FC<ResourceBarProps> = ({
  current,
  max,
  colorClass,
  label,
}) => {
  const percentage = max > 0 ? Math.max(0, (current / max) * 100) : 0;
  return (
    <div
      className="pokemon-detail-resource-bar-container"
      aria-label={`${label} ${current}/${max}`}
    >
      <div className="pokemon-detail-resource-bar">
        <div
          className={colorClass}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
      <p className="pokemon-detail-resource-text">
        {label}: {current} / {max}
      </p>
    </div>
  );
};

const PokemonDetailModal: React.FC<PokemonDetailModalProps> = ({
  pokemon,
  isOpen,
  onClose,
  onRegenerateImage,
}) => {
  const [imageLoadError, setImageLoadError] = useState(false);
  const [expandedMoveName, setExpandedMoveName] = useState<string | null>(null);
  const [moveDescriptionCache, setMoveDescriptionCache] = useState<
    Record<string, { isLoading: boolean; description: string | null }>
  >({});

  useEffect(() => {
    if (pokemon) {
      setImageLoadError(false);
      // Only reset expanded move if the Pokemon itself changes or modal reopens fresh.
      // Keep cache persistent for the same Pokemon instance during a modal session.
      if (
        !isOpen ||
        (expandedMoveName &&
          !pokemon.moves.find(m => m.name === expandedMoveName))
      ) {
        setExpandedMoveName(null);
      }
    } else {
      // Clear cache if modal is closed or no Pokemon
      if (!isOpen) {
        setExpandedMoveName(null);
        // Optionally clear cache: setMoveDescriptionCache({});
      }
    }
  }, [pokemon?.instanceId, isOpen, expandedMoveName, pokemon?.moves]);

  if (!isOpen || !pokemon) {
    return null;
  }

  const handleImageError = () => {
    setImageLoadError(true);
  };

  const fetchAndCacheMoveDescription = useCallback(
    async (moveName: string, pokemonNameForContext: string) => {
      setMoveDescriptionCache(prev => ({
        ...prev,
        [moveName]: { isLoading: true, description: null },
      }));
      try {
        const description = await fetchMoveDescription(
          moveName,
          pokemonNameForContext
        );
        setMoveDescriptionCache(prev => ({
          ...prev,
          [moveName]: { isLoading: false, description: description },
        }));
      } catch (error) {
        console.error('Failed to fetch move description:', error);
        setMoveDescriptionCache(prev => ({
          ...prev,
          [moveName]: { isLoading: false, description: '无法获取招式描述。' },
        }));
      }
    },
    []
  );

  const toggleMoveExpansion = (moveName: string) => {
    const newExpandedMove = expandedMoveName === moveName ? null : moveName;
    setExpandedMoveName(newExpandedMove);

    const currentMove = pokemon.moves.find(m => m.name === newExpandedMove);
    if (
      newExpandedMove &&
      currentMove &&
      (!currentMove.description || currentMove.description.trim() === '') &&
      !moveDescriptionCache[newExpandedMove]
    ) {
      fetchAndCacheMoveDescription(newExpandedMove, pokemon.name);
    }
  };

  const getHpColorClass = (current: number, max: number) => {
    const percentage = max > 0 ? (current / max) * 100 : 0;
    if (percentage <= 20) return 'bg-red-600';
    if (percentage <= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  const xpColorClass = 'bg-purple-500';

  const renderStatusConditions = () => {
    if (!pokemon.statusConditions || pokemon.statusConditions.length === 0)
      return null;
    return (
      <div className="mt-2">
        <h4 className="text-sm font-semibold text-pink-300 mb-1">当前状态:</h4>
        <div className="flex flex-wrap gap-1.5">
          {pokemon.statusConditions.map(activeCond => {
            const condInfo = STATUS_CONDITION_INFO[activeCond.condition];
            if (!condInfo || !condInfo.shortName) return null;

            let detailText = '';
            if (
              activeCond.condition === StatusCondition.ASLEEP &&
              activeCond.duration
            ) {
              detailText = ` (还有 ${activeCond.duration} 回合)`;
            } else if (
              activeCond.condition === StatusCondition.CONFUSED &&
              activeCond.duration
            ) {
              detailText = ` (还有 ${activeCond.duration} 回合)`;
            } else if (
              activeCond.condition === StatusCondition.BADLY_POISONED &&
              activeCond.toxicCounter
            ) {
              detailText = ` (计数: ${activeCond.toxicCounter})`;
            }

            return (
              <span
                key={activeCond.condition}
                className={`px-2 py-1 text-xs font-bold rounded-md shadow-sm ${condInfo.colorClass || 'bg-gray-600 text-white'} type-badge-base`}
                title={`${condInfo.longName || activeCond.condition}${detailText}`}
              >
                {condInfo.shortName}
                {detailText}
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  const renderStatStages = () => {
    if (!pokemon.statStageModifiers || pokemon.statStageModifiers.length === 0)
      return null;
    const relevantStages = pokemon.statStageModifiers.filter(
      mod => mod.stage !== 0
    );
    if (relevantStages.length === 0) return null;

    return (
      <>
        <h3 className="pokemon-detail-section-title">能力阶级</h3>
        <div className="pokemon-detail-stats-grid">
          {relevantStages.map(mod => (
            <div key={mod.stat}>
              <span>{mod.stat}</span>
              <span
                className={mod.stage > 0 ? 'text-green-400' : 'text-red-400'}
              >
                {mod.stage > 0 ? `+${mod.stage}` : mod.stage} (x
                {STAT_STAGE_MULTIPLIERS[mod.stage].toFixed(2)})
              </span>
            </div>
          ))}
        </div>
      </>
    );
  };

  return (
    <div
      className="pokemon-detail-modal-overlay modal-overlay-base"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pokemonDetailModalTitle"
    >
      <div
        className="pokemon-detail-modal-content modal-content-base"
        onClick={e => e.stopPropagation()}
      >
        <div className="pokemon-detail-modal-header modal-header-base">
          <h2 id="pokemonDetailModalTitle">
            {pokemon.name} - Lv.{pokemon.level}
          </h2>
          <button
            onClick={onClose}
            className="pokemon-detail-modal-close-button modal-close-button-base"
            aria-label="关闭宝可梦详情"
          >
            &times;
          </button>
        </div>
        <div className="pokemon-detail-modal-body modal-body-base custom-scrollbar">
          <div className="pokemon-detail-top-section">
            <div className="pokemon-detail-image-container relative">
              {imageLoadError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center bg-slate-700/80 rounded-md p-2">
                  <span className="text-sm text-yellow-300 mb-1.5">
                    图片加载失败
                  </span>
                  {onRegenerateImage && pokemon.instanceId && (
                    <button
                      onClick={() => onRegenerateImage(pokemon.instanceId!)}
                      className="text-xs bg-sky-500 hover:bg-sky-600 text-white font-semibold py-1 px-2 rounded shadow transition-colors"
                      title="尝试重新加载图片"
                    >
                      刷新图片
                    </button>
                  )}
                </div>
              ) : (
                <img
                  src={pokemon.imageUrl}
                  alt={pokemon.name}
                  className="pokemon-detail-image"
                  onError={handleImageError}
                />
              )}
            </div>
            <div className="pokemon-detail-info">
              <div className="pokemon-detail-types">
                {pokemon.types.map(type => (
                  <TypeBadge key={type} type={type} />
                ))}
              </div>
              <ModalResourceBar
                current={pokemon.currentHp}
                max={pokemon.maxHp}
                colorClass={getHpColorClass(pokemon.currentHp, pokemon.maxHp)}
                label="HP"
              />
              <ModalResourceBar
                current={pokemon.currentXp}
                max={pokemon.xpToNextLevel}
                colorClass={xpColorClass}
                label="XP"
              />
              {renderStatusConditions()}
            </div>
          </div>

          <h3 className="pokemon-detail-section-title">战斗属性</h3>
          <div className="pokemon-detail-stats-grid">
            <div>
              <span>攻击力</span>
              <span>{pokemon.attack}</span>
            </div>
            <div>
              <span>防御力</span>
              <span>{pokemon.defense}</span>
            </div>
            <div>
              <span>特攻</span>
              <span>{pokemon.specialAttack}</span>
            </div>
            <div>
              <span>特防</span>
              <span>{pokemon.specialDefense}</span>
            </div>
            <div>
              <span>速度</span>
              <span>{pokemon.speed}</span>
            </div>
          </div>
          <div className="pokemon-detail-nature">
            <span>性格</span>
            <span>{pokemon.nature}</span>
          </div>

          {renderStatStages()}

          <h3 className="pokemon-detail-section-title">个体值 (IVs)</h3>
          <div className="pokemon-detail-ivs-grid">
            <div>
              <span>HP IV</span>
              <span>{pokemon.ivs.hp}</span>
            </div>
            <div>
              <span>攻击 IV</span>
              <span>{pokemon.ivs.attack}</span>
            </div>
            <div>
              <span>防御 IV</span>
              <span>{pokemon.ivs.defense}</span>
            </div>
            <div>
              <span>特攻 IV</span>
              <span>{pokemon.ivs.specialAttack}</span>
            </div>
            <div>
              <span>特防 IV</span>
              <span>{pokemon.ivs.specialDefense}</span>
            </div>
            <div>
              <span>速度 IV</span>
              <span>{pokemon.ivs.speed}</span>
            </div>
          </div>

          <h3 className="pokemon-detail-section-title">招式</h3>
          {pokemon.moves.length > 0 ? (
            <ul className="pokemon-detail-moves-list">
              {pokemon.moves.map((move: PokemonMoveInstance) => (
                <li
                  key={move.name}
                  onClick={() => toggleMoveExpansion(move.name)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ')
                      toggleMoveExpansion(move.name);
                  }}
                  tabIndex={0}
                  role="button"
                  aria-expanded={expandedMoveName === move.name}
                  aria-controls={`move-details-${pokemon.id}-${move.name.replace(/\s+/g, '-')}`}
                  className="pokemon-detail-moves-list-item"
                >
                  <div className="pokemon-detail-move-header">
                    <span className="pokemon-detail-move-name flex-grow">
                      {move.name}
                    </span>
                    <span className="pokemon-detail-move-category mr-2">
                      {move.category}
                    </span>
                    <TypeBadge type={move.type} />
                  </div>
                  <div className="pokemon-detail-move-details">
                    <span className="mr-3">威力: {move.power || '--'}</span>{' '}
                    {/* Increased margin for spacing */}
                    <span>
                      PP: {move.currentPP} / {move.basePP}
                    </span>
                    <span className="ml-3">
                      命中:{' '}
                      {move.accuracy === null || move.accuracy === undefined
                        ? '必中'
                        : `${move.accuracy}%`}
                    </span>{' '}
                    {/* Added margin for spacing */}
                    {move.priority !== 0 && (
                      <span className="ml-3">
                        优先度:{' '}
                        {move.priority > 0
                          ? `+${move.priority}`
                          : move.priority}
                      </span>
                    )}{' '}
                    {/* Added margin for spacing */}
                  </div>
                  {expandedMoveName === move.name && (
                    <div
                      id={`move-details-${pokemon.id}-${move.name.replace(/\s+/g, '-')}`}
                      className="pokemon-detail-move-expansion-content"
                    >
                      {(() => {
                        const existingDescription = move.description;
                        const cachedEntry = moveDescriptionCache[move.name];

                        if (
                          existingDescription &&
                          existingDescription.trim() !== ''
                        ) {
                          return (
                            <p className="pokemon-detail-move-description">
                              {existingDescription}
                            </p>
                          );
                        }

                        if (cachedEntry) {
                          if (cachedEntry.isLoading) {
                            return (
                              <p className="pokemon-detail-move-description text-purple-400 italic">
                                AI 正在生成简介...
                              </p>
                            );
                          }
                          // Not loading anymore
                          if (
                            cachedEntry.description &&
                            cachedEntry.description.trim() !== ''
                          ) {
                            return (
                              <p className="pokemon-detail-move-description">
                                {cachedEntry.description}
                              </p>
                            );
                          } else {
                            // AI returned empty, null, or a specific error string that means no useful description
                            return (
                              <p className="pokemon-detail-move-description text-slate-400 italic">
                                未能获取招式文字说明。
                              </p>
                            );
                          }
                        }
                        // If no existing description and no cache entry, and fetch hasn't been triggered by expand yet.
                        // This path should ideally be hit only momentarily before isLoading becomes true.
                        // If it persists, it means fetch wasn't triggered.
                        return (
                          <p className="pokemon-detail-move-description text-slate-400 italic">
                            点击以尝试加载描述...
                          </p>
                        );
                      })()}
                      {move.effects &&
                        move.effects.map((effect, index) => (
                          <p
                            key={index}
                            className="pokemon-detail-move-description text-xs italic"
                          >
                            效果: {effect.effectString || effect.type}
                            {effect.chance && effect.chance < 1
                              ? ` (${(effect.chance * 100).toFixed(0)}%几率)`
                              : ''}
                            {effect.statusCondition
                              ? ` (${effect.statusCondition})`
                              : ''}
                            {effect.statChanges
                              ? effect.statChanges
                                  .map(
                                    sc =>
                                      ` ${sc.stat} ${sc.stage > 0 ? '+' : ''}${sc.stage}`
                                  )
                                  .join(',')
                              : ''}
                          </p>
                        ))}
                      {(!move.effects || move.effects.length === 0) &&
                        !move.description &&
                        !moveDescriptionCache[move.name]?.description &&
                        !moveDescriptionCache[move.name]?.isLoading && (
                          <p className="pokemon-detail-move-description text-xs italic text-slate-400">
                            该招式没有额外的效果信息。
                          </p>
                        )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400 text-center py-2">
              该宝可梦还没有学会任何招式。
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PokemonDetailModal;
