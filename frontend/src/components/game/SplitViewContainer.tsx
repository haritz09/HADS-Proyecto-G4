import React from 'react';
import '../../styles/components/SplitViewContainer.css';
import { GameState, Position } from '../../types/game';
import GameMap from './GameMap';

interface SplitViewContainerProps {
  gameState: GameState;
  aiGameState: GameState;
  actionDescription: string;
  onTileClick: (position: Position) => void;
  onHeroClick: (heroId: string) => void;
  onCityClick: (cityId: string) => void;
  onBuildingClick: (building: any, cityId: string) => void;
  isVisible: boolean;
}

/**
 * Componente para mostrar una vista dividida del juego con la vista del jugador 
 * y la vista de la IA durante el turno de la IA
 */
const SplitViewContainer: React.FC<SplitViewContainerProps> = ({
  gameState,
  aiGameState,
  actionDescription,
  onTileClick,
  onHeroClick,
  onCityClick,
  onBuildingClick,
  isVisible
}) => {
  if (!isVisible) return null;

  return (
    <div className="split-view-container">
      <div className="split-view-header">
        <h3 className="split-view-title">Vista Dividida: Turno de la IA</h3>
        <div className="current-action-description">{actionDescription}</div>
      </div>
      
      <div className="split-views">
        <div className="player-view">
          <div className="view-label">Tu Vista</div>
          <div className="view-content">
            <GameMap 
              gameState={gameState}
              onTileClick={onTileClick}
              onHeroClick={onHeroClick}
              onCityClick={onCityClick}
              onBuildingClick={onBuildingClick}
              isPlayerTurn={false}
              isReadOnly={true}
            />
          </div>
        </div>
        
        <div className="ai-view">
          <div className="view-label">Vista de la IA</div>
          <div className="view-content">
            <GameMap 
              gameState={aiGameState}
              onTileClick={() => { /* noop */ }}
              onHeroClick={() => { /* noop */ }}
              onCityClick={() => { /* noop */ }}
              onBuildingClick={() => { /* noop */ }}
              isPlayerTurn={false}
              isReadOnly={true}
              isAIView={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplitViewContainer;
