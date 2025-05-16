import React, { useState, useRef, useEffect } from 'react';
import { GameState, Hero, Position, MapTile } from '../../types/game';
import { useGame } from '../../contexts/GameContext';
import { findPath, calculatePathCost } from '../../services/gameEngine';
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
  const mapRef = useRef<HTMLDivElement>(null);
  const [viewportPosition, setViewportPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [hoveredPosition, setHoveredPosition] = useState<Position | null>(null);
  const [previewPath, setPreviewPath] = useState<Position[]>([]);
  const [pendingDestination, setPendingDestination] = useState<Position | null>(null);
  const [lastClickTime, setLastClickTime] = useState(0);
  
  const { currentPath } = useGame();

  // Convertir el mapa a formato 2D para el pathfinding
  const convertMapTo2D = () => {
    const mapWidth = gameState.map.size.width;
    const mapHeight = gameState.map.size.height;
    const tiles2D: MapTile[][] = [];
    
    for (let y = 0; y < mapHeight; y++) {
      const row: MapTile[] = [];
      for (let x = 0; x < mapWidth; x++) {
        const index = y * mapWidth + x;
        if (index < gameState.map.tiles.length) {
          row.push(gameState.map.tiles[index]);
        }
      }
      tiles2D.push(row);
    }
    
    return tiles2D;
  };

  // Eliminar el useEffect que actualiza previewPath al pasar el mouse
  // Ya no necesitamos mostrar el camino durante el hover

  // Manejador para el scroll del mouse (zoom)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.5, Math.min(2, prev * delta)));
  };

  // Manejador para el arrastre del mapa con botón derecho
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) { // Solo botón derecho
      e.preventDefault();
      setIsDragging(true);
      setStartX(e.pageX - mapRef.current!.offsetLeft);
      setStartY(e.pageY - mapRef.current!.offsetTop);
      setScrollLeft(mapRef.current!.scrollLeft);
      setScrollTop(mapRef.current!.scrollTop);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    e.preventDefault();
    const x = e.pageX - mapRef.current!.offsetLeft;
    const y = e.pageY - mapRef.current!.offsetTop;
    const walkX = x - startX;
    const walkY = y - startY;

    if (mapRef.current) {
      mapRef.current.scrollLeft = scrollLeft - walkX;
      mapRef.current.scrollTop = scrollTop - walkY;
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Prevenir menú contextual
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // Verificar si una posición es parte del camino
  const isPositionInPath = (x: number, y: number): boolean => {
    return currentPath.some(pos => pos.x === x && pos.y === y);
  };

  // Verificar si una posición es parte del camino previsto
  const isPositionInPreviewPath = (x: number, y: number): boolean => {
    return previewPath.some(pos => pos.x === x && pos.y === y);
  };

  // Determinar si el punto está en la parte alcanzable (verde) o inalcanzable (rojo) del camino
  const getPathSegmentType = (x: number, y: number): string => {
    if (!selectedHero || !previewPath.length) return '';
    
    // Si no es parte del camino, no aplicar estilo
    if (!isPositionInPreviewPath(x, y)) return '';

    // Convertir el mapa para calcular costos
    const tiles2D = convertMapTo2D();
    
    // Encontrar el índice del punto en el camino
    const pointIndex = previewPath.findIndex(pos => pos.x === x && pos.y === y);
    if (pointIndex === -1) return '';
    
    // Calcular subpath hasta este punto
    const subPath = previewPath.slice(0, pointIndex + 1);
    const cost = calculatePathCost(subPath, tiles2D);
    
    // Determinar si es alcanzable con los puntos de movimiento actuales
    return cost <= selectedHero.stats.movement_points_left 
      ? 'reachable-path' 
      : 'unreachable-path';
  };

  // Manejo de click en tile con comportamiento de doble click
  const handleTileClick = (position: Position) => {
    if (!selectedHero || !isPlayerTurn) return;
    
    const now = Date.now();
    const isDoubleClick = now - lastClickTime < 300 && 
      pendingDestination && 
      pendingDestination.x === position.x && 
      pendingDestination.y === position.y;
    
    setLastClickTime(now);
    
    if (isDoubleClick && pendingDestination) {
      // Ejecutar movimiento en segundo click
      onTileClick(position);
      setPendingDestination(null);
      setPreviewPath([]); // Limpiar el camino al confirmar movimiento
    } else {
      // Mostrar camino solo cuando se hace clic en una casilla
      setPendingDestination(position);
      
      // Actualizar el camino solo al hacer clic
      const tiles2D = convertMapTo2D();
      const path = findPath(selectedHero.position, position, tiles2D);
      setPreviewPath(path);
    }
  };

  // Renderizar un tile con información de camino
  const renderTile = (x: number, y: number) => {
    const index = y * gameState.map.size.width + x;
    const tile = gameState.map.tiles[index];

    // Verificar que el tile existe
    if (!tile) {
      console.error(`No tile found at index ${index} (${x},${y})`);
      return null;
    }

    // Encontrar héroe en esta posición
    const hero = [...gameState.player.heroes, ...gameState.ai.heroes].find(h => 
      h.position && h.position.x === x && h.position.y === y
    );

    // Determinar si es parte del camino
    const isInPath = isPositionInPath(x, y);
    const isInPreview = isPositionInPreviewPath(x, y);
    // Ya no necesitamos diferenciar entre reachable e unreachable
    // Todos serán del mismo color (rojo)
    const isPendingDestination = pendingDestination && 
      pendingDestination.x === x && pendingDestination.y === y;
    
    // Determinar si es la posición del héroe seleccionado
    const isSelectedPosition = selectedHero && 
      selectedHero.position.x === x && 
      selectedHero.position.y === y;

    return (
      <div
        key={`tile-${x}-${y}`}
        className={`
          map-tile 
          terrain-${tile.terrain || 'grass'} 
          ${hero ? 'has-hero' : ''} 
          ${isInPath ? 'valid-path' : ''} 
          ${isInPreview ? 'reachable-path' : ''}
          ${isPendingDestination ? 'pending-destination' : ''}
          ${isSelectedPosition ? 'selected-hero' : ''}
        `}
        onClick={() => handleTileClick({ x, y })}
        onMouseEnter={() => setHoveredPosition({ x, y })}
        onMouseLeave={() => setHoveredPosition(null)}
      >
        {hero && (
          <div 
            className={`hero-sprite ${hero.id.includes('player') ? 'player-blue' : 'player-red'}`}
            onClick={(e) => {
              e.stopPropagation();
              onHeroClick(hero.id);
            }}
          >
            H
          </div>
        )}
        {isInPreview && !hero && (
          <div className="path-indicator"></div>
        )}
      </div>
    );
  };

  // Crear grid del mapa
  const grid = [];
  for (let y = 0; y < gameState.map.size.height; y++) {
    const row = [];
    for (let x = 0; x < gameState.map.size.width; x++) {
      row.push(renderTile(x, y));
    }
    grid.push(
      <div key={`row-${y}`} className="map-row">
        {row}
      </div>
    );
  }

  return (
    <div 
      ref={mapRef}
      className={`game-map-wrapper ${isDragging ? 'dragging' : ''}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
    >
      <div 
        className="game-map"
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: '0 0'
        }}
      >
        {grid}
      </div>
    </div>
  );
};

export default GameMap;
