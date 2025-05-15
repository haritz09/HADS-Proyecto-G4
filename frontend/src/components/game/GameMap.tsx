/*
* Componente para el mapa del juego
* Implementar:
* - Renderizado de tiles según su tipo
* - Interacción con el mapa (clic, hover)
* - Visualización de héroes, ciudades y objetos
* - Fog of war (áreas no exploradas)
* - Animaciones de movimiento
*/

import { useState, useEffect } from 'react';
import { MapTile, Hero, Position, GameState } from '../../types/game';
import { canMoveToPosition } from '../../services/gameEngine';
import '../../styles/components/GameMap.css';

interface GameMapProps {
  gameState: GameState;
  selectedHero: Hero | null;
  onTileClick: (position: Position) => void;
  onHeroClick: (heroId: string) => void;
  onCityClick: (cityId: string) => void;
  isPlayerTurn: boolean;
}

const GameMap: React.FC<GameMapProps> = ({
  gameState,
  selectedHero,
  onTileClick,
  onHeroClick,
  onCityClick,
  isPlayerTurn
}) => {
  // Estado para manejar paths de movimiento válidos
  const [validPaths, setValidPaths] = useState<Position[]>([]);
  
  // Calcular rutas válidas cuando se selecciona un héroe
  useEffect(() => {
    if (selectedHero && isPlayerTurn) {
      const newValidPaths: Position[] = [];
      const { x, y } = selectedHero.position;
      const adjacentPositions = [
        { x: x+1, y },
        { x: x-1, y },
        { x, y: y+1 },
        { x, y: y-1 }
      ];

      // Convertir el array plano en una matriz 2D
      const mapWidth = gameState.map.size.width;
      const tilesMatrix: MapTile[][] = Array.from(
        { length: gameState.map.size.height },
        (_, row) => gameState.map.tiles.slice(row * mapWidth, (row + 1) * mapWidth)
      );
      
      adjacentPositions.forEach(pos => {
        if (pos.x >= 0 && pos.x < gameState.map.size.width && 
            pos.y >= 0 && pos.y < gameState.map.size.height &&
            canMoveToPosition(selectedHero, pos, tilesMatrix)) {
          newValidPaths.push(pos);
        }
      });
      
      setValidPaths(newValidPaths);
    } else {
      setValidPaths([]);
    }
  }, [selectedHero, gameState, isPlayerTurn]);

  // Renderiza un tile individual
  const renderTile = (tile: MapTile, x: number, y: number) => {
    // Determinar si este tile es un camino válido para el héroe seleccionado
    const isValidPath = validPaths.some(pos => pos.x === x && pos.y === y);
    
    // Determinar si hay un héroe en esta posición
    const heroOnTile = [...gameState.player.heroes, ...gameState.ai.heroes]
      .find(h => h.position.x === x && h.position.y === y);
    
    // Determinar si hay una ciudad en esta posición
    const cityOnTile = [...gameState.player.cities, ...gameState.ai.cities]
      .find(c => c.position.x === x && c.position.y === y);
    
    // Determinar si hay otro objeto en esta posición
    const objectOnTile = tile.object_type ? {
      type: tile.object_type,
      id: tile.object_id
    } : undefined;
    
    // Determinar si es el héroe seleccionado
    const isSelectedHero = selectedHero && selectedHero.position.x === x && selectedHero.position.y === y;
    
    // Preparar clases CSS
    let tileClasses = `map-tile terrain-${tile.terrain}`;
    if (isValidPath) tileClasses += ' valid-path';
    if (isSelectedHero) tileClasses += ' selected-hero';
    
    return (
      <div
        key={`tile-${x}-${y}`}
        className={tileClasses}
        onClick={() => onTileClick({ x, y })}
      >
        {/* Renderizar contenido del tile */}
        {heroOnTile && (
          <div 
            className={`hero-icon player-${heroOnTile.id.split('-')[0]}`}
            onClick={(e) => {
              e.stopPropagation();
              onHeroClick(heroOnTile.id);
            }}
          >
            H
          </div>
        )}
        
        {cityOnTile && !heroOnTile && (
          <div 
            className={`city-icon ${cityOnTile.owner ? `player-${cityOnTile.owner}` : 'neutral'}`}
            onClick={(e) => {
              e.stopPropagation();
              onCityClick(cityOnTile.id);
            }}
          >
            C
          </div>
        )}
        
        {objectOnTile && !heroOnTile && !cityOnTile && (
          <div className={`object-icon object-${objectOnTile.type}`}>
            {objectOnTile.type.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="game-map" style={{ 
      gridTemplateColumns: `repeat(${gameState.map.size.width}, 1fr)`,
      gridTemplateRows: `repeat(${gameState.map.size.height}, 1fr)`
    }}>
      {gameState.map.tiles.map((tile, i) => {
        const y = Math.floor(i / gameState.map.size.width);
        const x = i % gameState.map.size.width;
        return renderTile(tile, x, y);
      })}
    </div>
  );
};

export default GameMap;
