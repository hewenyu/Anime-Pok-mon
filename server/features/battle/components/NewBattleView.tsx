import React, { useEffect, useCallback } from 'react';
import { Pokemon, InventoryItem, BattleChatMessage } from '../../../types';
import { useBattleStore } from '../store/battleStore';
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
  // Zustand store
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
  } = useBattleStore();

  // Initialize battle on mount
  useEffect(() => {
    initializeBattle(
      initialPlayerTeam,
      initialInventory,
      initialEnemyPokemon,
      initialPlayerPokemonInstanceId
    );
  }, [
    initializeBattle,
    initialPlayerTeam,
    initialInventory,
    initialEnemyPokemon,
    initialPlayerPokemonInstanceId,
  ]);

  // Handle active pokemon switching when current one faints
  useEffect(() => {
    if (battleOutcome) return;

    if (!activePlayerPokemon || activePlayerPokemon.isFainted) {
      const nextAvailablePokemon = playerTeam.find(
        (p) => p.instanceId !== activePlayerPokemon?.instanceId && !p.isFainted
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
    
    // This would contain the logic from the original handlePlayerInputCommand
    // For now, just echo the input
    addBattleLogEntry(playerInput, playerProfileName || '玩家', 'player_command_echo');
    setPlayerInput('');
  }, [playerInput, addBattleLogEntry, playerProfileName, setPlayerInput]);

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
      <div className="p-4 text-center">
        <p className="text-sm text-gray-600">
          当前屏幕: {currentScreen}
        </p>
        <p className="text-xs text-gray-500 mt-2">
          此版本正在开发中...更多功能即将添加
        </p>
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