import React, { useEffect, useState } from 'react';
import { Hero } from '../../types/game';
import Button from '../ui/Button';
import '../../styles/components/CombatModal.css';

interface CombatModalProps {
  isOpen: boolean;
  onClose: () => void;
  combatResult: {
    winner: string;
    damage_dealt: {
      player: number;
      ai: number;
    };
    attacker_side: string;
    defender_side: string;
  };
  playerHero: Hero;
  enemyHero: Hero;
}

interface BattleStep {
  description: string;
  attackerUnit?: string;
  defenderUnit?: string;
  damage: number;
  side: 'player' | 'ai';
  casualties?: {
    unitType: string;
    count: number;
    side: 'player' | 'ai';
  };
}

// Unit health values for casualty calculation
const UNIT_HEALTH = {
  "Soldado": 10,
  "Guerrero": 10,
  "Arquero": 8,
  "Caballero": 15,
  "Mago": 6,
  "Dragón": 30,
  "default": 10
};

// Real unit stats from backend data
const UNIT_STATS = {
  "Guerrero": { attack: 4, defense: 4, speed: 3 },
  "Arquero": { attack: 5, defense: 3, speed: 4 },
  "Caballero": { attack: 6, defense: 5, speed: 5 },
  "Mago": { attack: 7, defense: 2, speed: 4 },
  "Dragón": { attack: 10, defense: 8, speed: 8 },
  "Soldado": { attack: 5, defense: 5, speed: 3 },
  "default": { attack: 4, defense: 3, speed: 3 }
};

const CombatModal: React.FC<CombatModalProps> = ({
  isOpen,
  onClose,
  combatResult,
  playerHero,
  enemyHero
}) => {
  const [battleSteps, setBattleSteps] = useState<BattleStep[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [battleStarted, setBattleStarted] = useState<boolean>(false);
  const [battleFinished, setBattleFinished] = useState<boolean>(false);
  const [cumulativeDamage, setCumulativeDamage] = useState<{player: number, ai: number}>({player: 0, ai: 0});
  const [extendedBattleWinner, setExtendedBattleWinner] = useState<string | null>(null);
  
  const [remainingTroops, setRemainingTroops] = useState<{
    player: {[unitType: string]: number},
    ai: {[unitType: string]: number}
  }>({player: {}, ai: {}});

  useEffect(() => {
    console.log('CombatModal: Component mounted', {
      isOpen,
      combatResult,
      playerHero: playerHero?.id,
      enemyHero: enemyHero?.id
    });
    
    if (combatResult) {
      console.log('CombatModal: Combat result details:', {
        winner: combatResult.winner,
        playerDamage: combatResult.damage_dealt.player,
        aiDamage: combatResult.damage_dealt.ai,
        attacker: combatResult.attacker_side,
        defender: combatResult.defender_side
      });
    }
    
    const initialPlayerTroops: {[unitType: string]: number} = {};
    const initialAiTroops: {[unitType: string]: number} = {};
    
    if (playerHero && playerHero.army) {
      playerHero.army.forEach(unit => {
        initialPlayerTroops[unit.type] = unit.count;
      });
    }
    
    if (enemyHero && enemyHero.army) {
      enemyHero.army.forEach(unit => {
        initialAiTroops[unit.type] = unit.count;
      });
    }
    
    setRemainingTroops({
      player: initialPlayerTroops,
      ai: initialAiTroops
    });
    
    if (isOpen && playerHero && enemyHero && combatResult) {
      generateBattleSequence();
    }
  }, [isOpen, combatResult, playerHero, enemyHero]);

  const calculateCasualties = (damage: number, units: {type: string, count: number}[], side: 'player' | 'ai'): {
    unitType: string, 
    count: number,
    side: 'player' | 'ai'
  } | undefined => {
    if (!units.length || damage <= 0) return undefined;
    
    const unitsThatCanTakeDamage = units.filter(unit => 
      remainingTroops[side][unit.type] > 0
    );
    
    if (!unitsThatCanTakeDamage.length) return undefined;
    
    unitsThatCanTakeDamage.sort((a, b) => {
      const healthA = UNIT_HEALTH[a.type as keyof typeof UNIT_HEALTH] || UNIT_HEALTH.default;
      const healthB = UNIT_HEALTH[b.type as keyof typeof UNIT_HEALTH] || UNIT_HEALTH.default;
      return healthA - healthB;
    });
    
    const targetUnit = unitsThatCanTakeDamage[0];
    const unitHealth = UNIT_HEALTH[targetUnit.type as keyof typeof UNIT_HEALTH] || UNIT_HEALTH.default;
    
    const casualties = Math.min(
      Math.ceil(damage / unitHealth),
      remainingTroops[side][targetUnit.type]
    );
    
    return {
      unitType: targetUnit.type,
      count: casualties,
      side
    };
  };

  const getTotalTroops = (troopState: {[unitType: string]: number}): number => {
    return Object.values(troopState).reduce((sum, count) => sum + count, 0);
  };

  const areAllTroopsDefeated = (side: 'player' | 'ai', troopState: {
    player: {[unitType: string]: number},
    ai: {[unitType: string]: number}
  }): boolean => {
    return getTotalTroops(troopState[side]) === 0;
  };

  const determineWinnerByTroops = (troopState: {
    player: {[unitType: string]: number},
    ai: {[unitType: string]: number}
  }): string => {
    const playerTroops = getTotalTroops(troopState.player);
    const aiTroops = getTotalTroops(troopState.ai);
    
    if (playerTroops === 0 && aiTroops === 0) {
      return "draw";
    } else if (playerTroops === 0) {
      return "ai";
    } else if (aiTroops === 0) {
      return "player";
    } else {
      return "ongoing";
    }
  };

  const calculateUnitDamage = (attackerType: string, attackerCount: number, defenderType: string): number => {
    const attackerStats = UNIT_STATS[attackerType as keyof typeof UNIT_STATS] || UNIT_STATS.default;
    const defenderStats = UNIT_STATS[defenderType as keyof typeof UNIT_STATS] || UNIT_STATS.default;
    
    let damage = attackerStats.attack * attackerCount;
    damage = Math.max(1, damage - Math.floor(defenderStats.defense / 2));
    
    return damage;
  };

  const sortUnitsBySpeed = (units: Array<{type: string, count: number}>): Array<{type: string, count: number}> => {
    return [...units].sort((a, b) => {
      const speedA = UNIT_STATS[a.type as keyof typeof UNIT_STATS]?.speed || 0;
      const speedB = UNIT_STATS[b.type as keyof typeof UNIT_STATS]?.speed || 0;
      return speedB - speedA;
    });
  };

  const generateBattleSequence = () => {
    setBattleSteps([]);
    setCurrentStep(0);
    setBattleStarted(false);
    setBattleFinished(false);
    setCumulativeDamage({player: 0, ai: 0});
    setExtendedBattleWinner(null);
    
    const initialPlayerTroops: {[unitType: string]: number} = {};
    const initialAiTroops: {[unitType: string]: number} = {};
    
    if (playerHero.army) {
      playerHero.army.forEach(unit => {
        initialPlayerTroops[unit.type] = unit.count;
      });
    }
    
    if (enemyHero.army) {
      enemyHero.army.forEach(unit => {
        initialAiTroops[unit.type] = unit.count;
      });
    }
    
    setRemainingTroops({
      player: initialPlayerTroops,
      ai: initialAiTroops
    });
    
    const steps: BattleStep[] = [];
    
    steps.push({
      description: `¡Comienza el combate entre ${playerHero.name} y ${enemyHero.name}!`,
      damage: 0,
      side: 'player'
    });
    
    const playerArmy = playerHero.army || [];
    const enemyArmy = enemyHero.army || [];
    
    const totalPlayerDamage = combatResult.damage_dealt.player || 0;
    const totalAiDamage = combatResult.damage_dealt.ai || 0;
    
    const currentPlayerTroops = {...initialPlayerTroops};
    const currentAiTroops = {...initialAiTroops};
    
    let playerDamageDealt = totalPlayerDamage;
    let aiDamageDealt = totalAiDamage;
    
    let round = 1;
    let battleOutcome = "ongoing";
    
    if (totalPlayerDamage > 0 || totalAiDamage > 0) {
      const numInitialRounds = Math.max(2, Math.min(5, Math.max(playerArmy.length, enemyArmy.length)));
      
      const playerDamagePerRound = Math.ceil(totalPlayerDamage / numInitialRounds);
      const aiDamagePerRound = Math.ceil(totalAiDamage / numInitialRounds);
      
      const sortedPlayerArmy = sortUnitsBySpeed(playerArmy);
      const sortedEnemyArmy = sortUnitsBySpeed(enemyArmy);
      
      for (let i = 0; i < numInitialRounds; i++) {
        const playerUnit = sortedPlayerArmy[i % sortedPlayerArmy.length];
        const enemyUnit = sortedEnemyArmy[i % sortedEnemyArmy.length];
        
        const enemyCasualties = calculateCasualtiesForType(
          playerDamagePerRound,
          enemyUnit.type,
          currentAiTroops[enemyUnit.type]
        );
        
        if (enemyCasualties > 0) {
          currentAiTroops[enemyUnit.type] = Math.max(0, currentAiTroops[enemyUnit.type] - enemyCasualties);
        }
        
        steps.push({
          description: `Los ${playerUnit.type} de ${playerHero.name} atacan a los ${enemyUnit.type} de ${enemyHero.name}.`,
          attackerUnit: playerUnit.type,
          defenderUnit: enemyUnit.type,
          damage: playerDamagePerRound,
          side: 'player',
          casualties: {
            unitType: enemyUnit.type,
            count: enemyCasualties,
            side: 'ai'
          }
        });
        
        const playerCasualties = calculateCasualtiesForType(
          aiDamagePerRound,
          playerUnit.type,
          currentPlayerTroops[playerUnit.type]
        );
        
        if (playerCasualties > 0) {
          currentPlayerTroops[playerUnit.type] = Math.max(0, currentPlayerTroops[playerUnit.type] - playerCasualties);
        }
        
        steps.push({
          description: `Los ${enemyUnit.type} de ${enemyHero.name} contraatacan a los ${playerUnit.type} de ${playerHero.name}.`,
          attackerUnit: enemyUnit.type,
          defenderUnit: playerUnit.type,
          damage: aiDamagePerRound,
          side: 'ai',
          casualties: {
            unitType: playerUnit.type,
            count: playerCasualties,
            side: 'player'
          }
        });
      }
      
      while (battleOutcome === "ongoing" && round <= 20) {
        battleOutcome = determineWinnerByTroops({
          player: currentPlayerTroops,
          ai: currentAiTroops
        });
        
        if (battleOutcome !== "ongoing") {
          break;
        }
        
        const availablePlayerUnits = sortUnitsBySpeed(
          playerArmy.filter(unit => currentPlayerTroops[unit.type] > 0)
        );
        
        const availableAiUnits = sortUnitsBySpeed(
          enemyArmy.filter(unit => currentAiTroops[unit.type] > 0)
        );
        
        if (availablePlayerUnits.length === 0 || availableAiUnits.length === 0) {
          break;
        }
        
        type CombatUnit = {
          type: string;
          count: number;
          side: 'player' | 'ai';
          speed: number;
        };
        
        const combatOrder: CombatUnit[] = [];
        
        availablePlayerUnits.forEach(unit => {
          const stats = UNIT_STATS[unit.type as keyof typeof UNIT_STATS] || UNIT_STATS.default;
          combatOrder.push({
            type: unit.type,
            count: currentPlayerTroops[unit.type],
            side: 'player',
            speed: stats.speed
          });
        });
        
        availableAiUnits.forEach(unit => {
          const stats = UNIT_STATS[unit.type as keyof typeof UNIT_STATS] || UNIT_STATS.default;
          combatOrder.push({
            type: unit.type,
            count: currentAiTroops[unit.type],
            side: 'ai',
            speed: stats.speed
          });
        });
        
        combatOrder.sort((a, b) => b.speed - a.speed);
        
        for (const attackingUnit of combatOrder) {
          if (getTotalTroops(currentPlayerTroops) === 0 || getTotalTroops(currentAiTroops) === 0) {
            break;
          }
          
          const targetUnits = attackingUnit.side === 'player' 
            ? availableAiUnits 
            : availablePlayerUnits;
            
          if (targetUnits.length === 0) continue;
          
          targetUnits.sort((a, b) => {
            const defA = UNIT_STATS[a.type as keyof typeof UNIT_STATS]?.defense || 0;
            const defB = UNIT_STATS[b.type as keyof typeof UNIT_STATS]?.defense || 0;
            return defA - defB;
          });
          
          const targetUnit = targetUnits[0];
          
          const damage = calculateUnitDamage(
            attackingUnit.type, 
            attackingUnit.count, 
            targetUnit.type
          );
          
          if (attackingUnit.side === 'player') {
            playerDamageDealt += damage;
          } else {
            aiDamageDealt += damage;
          }
          
          const casualties = calculateCasualtiesForType(
            damage,
            targetUnit.type,
            attackingUnit.side === 'player' ? currentAiTroops[targetUnit.type] : currentPlayerTroops[targetUnit.type]
          );
          
          if (attackingUnit.side === 'player' && casualties) {
            currentAiTroops[targetUnit.type] = Math.max(0, currentAiTroops[targetUnit.type] - casualties);
            
            steps.push({
              description: `Los ${attackingUnit.type} de ${playerHero.name} atacan a los ${targetUnit.type} de ${enemyHero.name}.`,
              attackerUnit: attackingUnit.type,
              defenderUnit: targetUnit.type,
              damage: damage,
              side: 'player',
              casualties: {
                unitType: targetUnit.type,
                count: casualties,
                side: 'ai'
              }
            });
            
            if (getTotalTroops(currentAiTroops) === 0) {
              battleOutcome = "player";
              break;
            }
          } 
          else if (attackingUnit.side === 'ai' && casualties) {
            currentPlayerTroops[targetUnit.type] = Math.max(0, currentPlayerTroops[targetUnit.type] - casualties);
            
            steps.push({
              description: `Los ${attackingUnit.type} de ${enemyHero.name} atacan a los ${targetUnit.type} de ${playerHero.name}.`,
              attackerUnit: attackingUnit.type,
              defenderUnit: targetUnit.type,
              damage: damage,
              side: 'ai',
              casualties: {
                unitType: targetUnit.type,
                count: casualties,
                side: 'player'
              }
            });
            
            if (getTotalTroops(currentPlayerTroops) === 0) {
              battleOutcome = "ai";
              break;
            }
          }
        }
        
        round++;
      }
    }
    
    if (battleOutcome !== "ongoing") {
      setExtendedBattleWinner(battleOutcome);
    }
    
    if (battleOutcome === "player") {
      steps.push({
        description: `¡Las tropas de ${enemyHero.name} han sido totalmente aniquiladas! ${playerHero.name} ha ganado la batalla.`,
        damage: 0,
        side: 'player'
      });
    } else if (battleOutcome === "ai") {
      steps.push({
        description: `¡Las tropas de ${playerHero.name} han sido totalmente aniquiladas! ${enemyHero.name} ha ganado la batalla.`,
        damage: 0,
        side: 'ai'
      });
    } else if (battleOutcome === "draw") {
      steps.push({
        description: `¡Ambos bandos han perdido todas sus tropas! La batalla termina en empate.`,
        damage: 0,
        side: 'player'
      });
    }
    
    const finalWinner = battleOutcome !== "ongoing" ? battleOutcome : combatResult.winner;
    steps.push({
      description: finalWinner === 'player' 
        ? `¡Victoria! Las fuerzas de ${playerHero.name} han derrotado al enemigo.`
        : finalWinner === 'ai'
          ? `¡Derrota! Las fuerzas de ${enemyHero.name} han derrotado a tu ejército.`
          : `El combate ha finalizado en tablas.`,
      damage: 0,
      side: finalWinner === 'player' ? 'player' : 'ai'
    });
    
    if (playerDamageDealt > totalPlayerDamage || aiDamageDealt > totalAiDamage) {
      setCumulativeDamage({
        player: playerDamageDealt,
        ai: aiDamageDealt
      });
    }
    
    setBattleSteps(steps);
  };

  const calculateCasualtiesForType = (damage: number, unitType: string, remainingCount: number): number => {
    const unitHealth = UNIT_HEALTH[unitType as keyof typeof UNIT_HEALTH] || UNIT_HEALTH.default;
    return Math.min(Math.ceil(damage / unitHealth), remainingCount);
  };

  const startBattle = () => {
    setBattleStarted(true);
    advanceBattle();
  };

  const advanceBattle = () => {
    if (currentStep < battleSteps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      
      const step = battleSteps[nextStep];
      
      if (step.side === 'player') {
        setCumulativeDamage(prev => ({...prev, player: prev.player + step.damage}));
      } else {
        setCumulativeDamage(prev => ({...prev, ai: prev.ai + step.damage}));
      }
      
      if (step.casualties) {
        setRemainingTroops(prev => {
          const side = step.casualties!.side;
          const unitType = step.casualties!.unitType;
          const casualties = step.casualties!.count;
          
          const updatedTroops = {...prev};
          updatedTroops[side] = {...prev[side]};
          
          if (updatedTroops[side][unitType] !== undefined) {
            updatedTroops[side][unitType] = Math.max(0, updatedTroops[side][unitType] - casualties);
          }
          
          return updatedTroops;
        });
      }
    } else {
      setBattleFinished(true);
    }
  };
  
  const handleClose = () => {
    setBattleStarted(false);
    setBattleFinished(false);
    setCurrentStep(0);
    setCumulativeDamage({player: 0, ai: 0});
    onClose();
  };

  if (!isOpen) return null;

  if (!playerHero || !enemyHero || !combatResult) {
    console.error('CombatModal: Missing required props', {
      hasPlayerHero: !!playerHero,
      hasEnemyHero: !!enemyHero,
      hasCombatResult: !!combatResult
    });
    return (
      <div className="combat-modal-overlay">
        <div className="combat-modal">
          <div className="combat-modal-header">
            <h2>Error en el Combate</h2>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          <div className="combat-result">
            <p>Datos de combate incompletos.</p>
          </div>
          <div className="modal-actions">
            <Button onClick={onClose}>Cerrar</Button>
          </div>
        </div>
      </div>
    );
  }
  
  const playerWon = combatResult.winner === 'player';
  
  return (
    <div className="combat-modal-overlay">
      <div className="combat-modal">
        <div className="combat-modal-header">
          <h2>¡Combate!</h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>
        
        <div className="combat-armies">
          <div className="player-army">
            <h3>{playerHero.name}</h3>
            <div className="army-units">
              {playerHero.army && playerHero.army.length > 0 ? (
                playerHero.army.map((unit, index) => (
                  <div key={index} className={`army-unit ${battleStarted && remainingTroops.player[unit.type] < unit.count ? 'has-casualties' : ''}`}>
                    <span className="unit-type">{unit.type}</span>
                    <span className="unit-count">
                      {battleStarted ? (
                        <>
                          x{remainingTroops.player[unit.type] || 0}
                          {remainingTroops.player[unit.type] < unit.count && (
                            <span className="casualties-indicator"> (-{unit.count - remainingTroops.player[unit.type]})</span>
                          )}
                        </>
                      ) : (
                        <>x{unit.count}</>
                      )}
                    </span>
                  </div>
                ))
              ) : (
                <div className="army-unit">
                  <span>Sin unidades</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="vs-section">
            <div className="vs-icon">⚔️</div>
          </div>
          
          <div className="enemy-army">
            <h3>{enemyHero.name}</h3>
            <div className="army-units">
              {enemyHero.army && enemyHero.army.length > 0 ? (
                enemyHero.army.map((unit, index) => (
                  <div key={index} className={`army-unit ${battleStarted && remainingTroops.ai[unit.type] < unit.count ? 'has-casualties' : ''}`}>
                    <span className="unit-type">{unit.type}</span>
                    <span className="unit-count">
                      {battleStarted ? (
                        <>
                          x{remainingTroops.ai[unit.type] || 0}
                          {remainingTroops.ai[unit.type] < unit.count && (
                            <span className="casualties-indicator"> (-{unit.count - remainingTroops.ai[unit.type]})</span>
                          )}
                        </>
                      ) : (
                        <>x{unit.count}</>
                      )}
                    </span>
                  </div>
                ))
              ) : (
                <div className="army-unit">
                  <span>Sin unidades</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {!battleStarted ? (
          <div className="battle-start">
            <p>Pulsa el botón para comenzar la batalla</p>
            <Button onClick={startBattle}>¡Comenzar Batalla!</Button>
          </div>
        ) : (
          <div className="battle-sequence">
            {battleSteps.length > 0 && currentStep < battleSteps.length && (
              <div className="battle-step">
                <p className="battle-description">{battleSteps[currentStep].description}</p>
                
                {battleSteps[currentStep].damage > 0 && (
                  <div className={`damage-indicator ${battleSteps[currentStep].side === 'player' ? 'player-damage' : 'enemy-damage'}`}>
                    {battleSteps[currentStep].side === 'player' ? 'Daño causado: ' : 'Daño recibido: '} 
                    <span className="damage-amount">{battleSteps[currentStep].damage}</span>
                  </div>
                )}
                
                {(() => {
                  const casualties = battleSteps[currentStep].casualties;
                  return casualties && casualties.count > 0 ? (
                    <div className="casualties-report">
                      <span className={casualties.side === 'player' ? 'player-casualties' : 'enemy-casualties'}>
                        {casualties.count} {casualties.unitType}
                        {casualties.count !== 1 ? 's' : ''} {casualties.side === 'player' ? 'perdidos' : 'eliminados'}
                      </span>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
            
            <div className="damage-summary">
              <div className="player-damage">
                <span>Daño causado: {battleFinished ? combatResult.damage_dealt.player : cumulativeDamage.player}</span>
              </div>
              <div className="enemy-damage">
                <span>Daño recibido: {battleFinished ? combatResult.damage_dealt.ai : cumulativeDamage.ai}</span>
              </div>
            </div>
            
            <div className="troop-status">
              <div className="player-troops">
                <span>Tropas restantes: {getTotalTroops(remainingTroops.player)}</span>
                {getTotalTroops(remainingTroops.player) === 0 && (
                  <span className="troops-defeated">¡Sin tropas!</span>
                )}
              </div>
              <div className="enemy-troops">
                <span>Tropas enemigas: {getTotalTroops(remainingTroops.ai)}</span>
                {getTotalTroops(remainingTroops.ai) === 0 && (
                  <span className="troops-defeated">¡Sin tropas!</span>
                )}
              </div>
            </div>
            
            {battleFinished ? (
              <div className={`winner-announcement ${
                extendedBattleWinner === "player" || (!extendedBattleWinner && playerWon) 
                  ? 'player-won' 
                  : 'player-lost'}`}>
                {extendedBattleWinner === "player" || (!extendedBattleWinner && playerWon) 
                  ? '¡Victoria!' 
                  : extendedBattleWinner === "draw" 
                    ? '¡Empate!' 
                    : '¡Derrota!'} 
              </div>
            ) : (
              <Button onClick={advanceBattle}>Continuar</Button>
            )}
          </div>
        )}
        
        {battleFinished && (
          <div className="modal-actions">
            <Button onClick={handleClose}>Cerrar</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CombatModal;
