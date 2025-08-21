import React, { useEffect, useCallback } from 'react';
import { Pokemon, InventoryItem, BattleChatMessage } from '../../../types';
import { useBattleFeature } from '../../../hooks/useGameFeatures';
import PokemonBattlefield from '../components/PokemonBattlefield';
import BattleLog from '../components/BattleLog';
import BattleActionPanel from '../components/BattleActionPanel';

interface NewBattleViewProps {
  playerTeam: Pokemon[];
  inventory: InventoryItem[];
  initialEnemyPokemon: Pokemon;
  initialPlayerPokemonInstanceId: string;
  onBattleEnd: (
    didPlayerWin: boolean,
    finalPlayerTeam: Pokemon[],
    finalInventory: InventoryItem[],
    finalEnemyPokemon: Pokemon,
    usedRun: boolean,
    caughtPokemon?: Pokemon,
    battleLog?: BattleChatMessage[]
  ) => void;
  playerProfileName: string | undefined;
  onRegeneratePokemonImage: (instanceId: string) => void;
}

const NewBattleView: React.FC<NewBattleViewProps> = ({
  playerTeam: initialPlayerTeam,
  inventory: initialInventory,
  initialEnemyPokemon,
  initialPlayerPokemonInstanceId,
  onBattleEnd,
  playerProfileName,
  onRegeneratePokemonImage,
}) => {
  // Use the new feature-based hook
  const {
    // State
    playerTeam,
    currentInventory,
    enemyPokemon,
    activePlayerPokemon,
    currentScreen,
    battleOutcome,
    isProcessingTurn,
    pokemonWasCaught,
    battleLog,
    commandParseLoadingStatus,
    playerInput,
    itemSubActionLoading,

    // Actions
    initializeBattle,
    setCurrentScreen,
    setBattleOutcome,
    setActivePlayerPokemon,
    addBattleLogEntry,
    setPlayerInput,

    // High-level actions
    endBattleAndReturnToAdventure,
  } = useBattleFeature();

  // Initialize battle on mount
  useEffect(() => {
    initializeBattle(
      initialPlayerTeam,
      initialInventory,
      initialEnemyPokemon,
      initialPlayerPokemonInstanceId
    );

    // Add initial battle message
    addBattleLogEntry(
      `${playerProfileName || '玩家'} 遇到了野生的 ${initialEnemyPokemon.name}！`,
      '系统'
    );
  }, [
    initializeBattle,
    initialPlayerTeam,
    initialInventory,
    initialEnemyPokemon,
    initialPlayerPokemonInstanceId,
    addBattleLogEntry,
    playerProfileName,
  ]);

  // Handle active pokemon switching when current one faints
  useEffect(() => {
    if (battleOutcome) return;

    if (!activePlayerPokemon || activePlayerPokemon.isFainted) {
      const nextAvailablePokemon = playerTeam.find(
        p => p.instanceId !== activePlayerPokemon?.instanceId && !p.isFainted
      );

      if (nextAvailablePokemon) {
        addBattleLogEntry(
          `${activePlayerPokemon?.name || '宝可梦'}倒下了！请选择下一只宝可梦。`
        );
        setActivePlayerPokemon(nextAvailablePokemon);
        setCurrentScreen('FORCED_SWITCH');
      } else {
        addBattleLogEntry('你所有的宝可梦都失去了战斗能力！');
        setBattleOutcome('loss');
        setCurrentScreen('BATTLE_OVER_CHOICES');
      }
    }
  }, [
    activePlayerPokemon,
    playerTeam,
    addBattleLogEntry,
    battleOutcome,
    setActivePlayerPokemon,
    setCurrentScreen,
    setBattleOutcome,
  ]);

  // Handle enemy pokemon fainting
  useEffect(() => {
    if (battleOutcome) return;

    if (enemyPokemon?.isFainted && !pokemonWasCaught) {
      addBattleLogEntry(`敌方的 ${enemyPokemon.name} 倒下了！你赢得了战斗！`);
      setBattleOutcome('win');
      setCurrentScreen('BATTLE_OVER_CHOICES');
    }
  }, [
    enemyPokemon,
    addBattleLogEntry,
    battleOutcome,
    pokemonWasCaught,
    setBattleOutcome,
    setCurrentScreen,
  ]);

  const handlePlayerInputSubmit = useCallback(() => {
    if (!playerInput.trim()) return;

    // Echo the player's input
    addBattleLogEntry(
      playerInput,
      playerProfileName || '玩家',
      'player_command_echo'
    );

    // Simple demo logic - this would be replaced with actual battle command parsing
    if (playerInput.toLowerCase().includes('逃跑')) {
      addBattleLogEntry('你成功逃跑了！');
      setBattleOutcome('run');
      setCurrentScreen('BATTLE_OVER_CHOICES');
    } else {
      addBattleLogEntry(`收到指令: ${playerInput}`, '系统');
    }

    setPlayerInput('');
  }, [
    playerInput,
    addBattleLogEntry,
    playerProfileName,
    setPlayerInput,
    setBattleOutcome,
    setCurrentScreen,
  ]);

  const renderScreenContent = () => {
    if (currentScreen === 'BATTLE_OVER_CHOICES') {
      let message = '战斗结束！';
      if (battleOutcome === 'win') {
        message = pokemonWasCaught
          ? `${pokemonWasCaught.name} 被成功捕捉了！`
          : '你胜利了！';
      } else if (battleOutcome === 'loss') {
        message = '你失败了...';
      } else if (battleOutcome === 'run') {
        message = '你成功逃跑了！';
      }

      return (
        <div className="p-4 text-center">
          <p className="text-xl font-bold my-4 text-purple-700">{message}</p>
          <button
            className="choice-button primary"
            onClick={() => {
              if (battleOutcome) {
                // Use the new integrated battle end function
                endBattleAndReturnToAdventure(
                  battleOutcome === 'win',
                  playerTeam,
                  currentInventory,
                  enemyPokemon || initialEnemyPokemon,
                  battleOutcome === 'run',
                  pokemonWasCaught || undefined,
                  battleLog
                );

                // Also call the original callback for compatibility
                onBattleEnd(
                  battleOutcome === 'win',
                  playerTeam,
                  currentInventory,
                  enemyPokemon || initialEnemyPokemon,
                  battleOutcome === 'run',
                  pokemonWasCaught || undefined,
                  battleLog
                );
              }
            }}
          >
            结束战斗
          </button>
        </div>
      );
    }

    return (
      <div className="p-4">
        <div className="text-center mb-4">
          <p className="text-sm text-gray-600 mb-2">
            当前屏幕: {currentScreen}
          </p>
          <p className="text-xs text-gray-500">
            简化战斗演示 - 输入&quot;逃跑&quot;来结束战斗
          </p>
        </div>

        {activePlayerPokemon && (
          <div className="text-sm space-y-1">
            <p>
              <strong>你的宝可梦:</strong> {activePlayerPokemon.name}
            </p>
            <p>
              <strong>HP:</strong> {activePlayerPokemon.currentHp}/
              {activePlayerPokemon.maxHp}
            </p>
          </div>
        )}

        {enemyPokemon && (
          <div className="text-sm space-y-1 mt-2">
            <p>
              <strong>敌方宝可梦:</strong> {enemyPokemon.name}
            </p>
            <p>
              <strong>HP:</strong> {enemyPokemon.currentHp}/{enemyPokemon.maxHp}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen battle-view-background font-sans">
      {/* Pokemon Battlefield */}
      <PokemonBattlefield
        enemyPokemon={enemyPokemon}
        activePlayerPokemon={activePlayerPokemon}
        onRegenerateImage={onRegeneratePokemonImage}
      />

      {/* Battle Interface */}
      <div className="h-[45%] md:h-[40%] flex flex-col md:flex-row border-t-2 border-purple-300/50 shadow-lg">
        {/* Battle Log */}
        <BattleLog
          battleLog={battleLog}
          className="md:w-3/5 lg:w-3/5 order-1 md:order-1 border-b-2 md:border-b-0 md:border-r-2 border-purple-300/50"
        />

        {/* Action Panel */}
        <BattleActionPanel
          currentScreen={currentScreen}
          playerInput={playerInput}
          commandParseLoadingStatus={commandParseLoadingStatus}
          itemSubActionLoading={itemSubActionLoading}
          isProcessingTurn={isProcessingTurn}
          onPlayerInputChange={setPlayerInput}
          onPlayerInputSubmit={handlePlayerInputSubmit}
        >
          {renderScreenContent()}
        </BattleActionPanel>
      </div>
    </div>
  );
};

export default NewBattleView;
