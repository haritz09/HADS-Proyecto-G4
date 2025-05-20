import React from 'react';
import '../../styles/components/CombatResultModal.css';

interface CombatResultModalProps {
  combatResult: {
    winner: string;
    damage_dealt: {
      player: number;
      ai: number;
    };
    attacker_side: string;
    defender_side: string;
  };
  enemyHero: string;
  onClose: () => void;
}

const CombatResultModal: React.FC<CombatResultModalProps> = ({ 
  combatResult, 
  enemyHero, 
  onClose 
}) => {
  const isPlayerWinner = combatResult.winner === 'player';
  
  return (
    <div className="combat-result-modal-overlay">
      <div className="combat-result-modal">
        <div className="combat-result-header">
          <h2>Resultado del Combate</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="combat-result-content">
          <div className={`combat-winner ${isPlayerWinner ? 'player-winner' : 'ai-winner'}`}>
            <h3>{isPlayerWinner ? '¡Victoria!' : '¡Derrota!'}</h3>
            <p>Ganador: {isPlayerWinner ? 'Tu héroe' : 'Héroe enemigo'}</p>
          </div>
          
          <div className="combat-details">
            <div className="combat-side player-side">
              <h4>Tu héroe</h4>
              <p>Daño causado: {combatResult.damage_dealt.player}</p>
              <p>Rol: {combatResult.attacker_side === 'player' ? 'Atacante' : 'Defensor'}</p>
            </div>
            
            <div className="vs-indicator">VS</div>
            
            <div className="combat-side ai-side">
              <h4>Héroe enemigo</h4>
              <p>Daño causado: {combatResult.damage_dealt.ai}</p>
              <p>Rol: {combatResult.defender_side === 'ai' ? 'Defensor' : 'Atacante'}</p>
            </div>
          </div>
        </div>
        
        <div className="combat-actions">
          <button className="primary-button" onClick={onClose}>Continuar</button>
        </div>
      </div>
    </div>
  );
};

export default CombatResultModal;
