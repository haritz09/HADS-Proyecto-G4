import React, { useEffect } from 'react';
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

const CombatModal: React.FC<CombatModalProps> = ({
  isOpen,
  onClose,
  combatResult,
  playerHero,
  enemyHero
}) => {
  // Add effect to log when modal is mounted
  useEffect(() => {
    console.log('CombatModal: Component mounted', {
      isOpen,
      combatResult,
      playerHero: playerHero?.id,
      enemyHero: enemyHero?.id
    });
  }, [isOpen, combatResult, playerHero, enemyHero]);

  if (!isOpen) return null;

  // Safety check for required props
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
  
  // Calculate casualties (simplified)
  const playerArmySize = playerHero.army?.reduce((total, unit) => total + unit.count, 0) || 0;
  const enemyArmySize = enemyHero.army?.reduce((total, unit) => total + unit.count, 0) || 0;
  
  return (
    <div className="combat-modal-overlay">
      <div className="combat-modal">
        <div className="combat-modal-header">
          <h2>¡Combate!</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="combat-armies">
          <div className="player-army">
            <h3>{playerHero.name}</h3>
            <div className="army-units">
              {playerHero.army && playerHero.army.length > 0 ? (
                playerHero.army.map((unit, index) => (
                  <div key={index} className="army-unit">
                    <span className="unit-type">{unit.type}</span>
                    <span className="unit-count">x{unit.count}</span>
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
                  <div key={index} className="army-unit">
                    <span className="unit-type">{unit.type}</span>
                    <span className="unit-count">x{unit.count}</span>
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
        
        <div className="combat-result">
          <h4>Resultado del Combate</h4>
          <div className="damage-dealt">
            <div className="player-damage">
              <span>Daño causado: {combatResult.damage_dealt.player}</span>
            </div>
            <div className="enemy-damage">
              <span>Daño recibido: {combatResult.damage_dealt.ai}</span>
            </div>
          </div>
          
          <div className={`winner-announcement ${playerWon ? 'player-won' : 'player-lost'}`}>
            {playerWon ? '¡Victoria!' : '¡Derrota!'}
          </div>
        </div>
        
        <div className="modal-actions">
          <Button onClick={onClose}>Continuar</Button>
        </div>
      </div>
    </div>
  );
};

export default CombatModal;
