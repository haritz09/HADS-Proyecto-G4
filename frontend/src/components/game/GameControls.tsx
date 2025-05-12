/*
* Controles del juego
* Implementar:
* - Botones para acciones comunes (finalizar turno, guardar, etc.)
* - Indicador de turno actual
* - Mensajes del juego
*/

import React from 'react';
import Button from '../ui/Button';
import '../../styles/components/GameControls.css';

interface GameControlsProps {
  turn: number;
  currentPlayer: string;
  gameMessage: string;
  onEndTurn: () => void;
  onSaveGame: () => void;
  onOpenMenu: () => void;
  isPlayerTurn: boolean;
}

const GameControls: React.FC<GameControlsProps> = ({
  turn,
  currentPlayer,
  gameMessage,
  onEndTurn,
  onSaveGame,
  onOpenMenu,
  isPlayerTurn,
}) => {
  return (
    <div className="game-controls">
      <div className="turn-info">
        <h2>Turno {turn}</h2>
        <p className="current-player">
          Jugador: <span className={`player-${currentPlayer}`}>{currentPlayer}</span>
        </p>
      </div>
      
      <div className="game-message">{gameMessage}</div>
      
      <div className="control-buttons">
        {isPlayerTurn && (
          <Button 
            variant="primary" 
            size="large" 
            onClick={onEndTurn}
            className="end-turn-button"
          >
            Finalizar Turno
          </Button>
        )}
        
        <Button 
          variant="secondary" 
          size="medium" 
          onClick={onSaveGame}
        >
          Guardar Partida
        </Button>
        
        <Button 
          variant="secondary" 
          size="medium" 
          onClick={onOpenMenu}
        >
          Menú Principal
        </Button>
      </div>
    </div>
  );
};

export default GameControls;
