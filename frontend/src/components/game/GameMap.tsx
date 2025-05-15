import React, { useState, useRef } from 'react';
import { GameState, Hero, Position } from '../../types/game';
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

  console.log("GameMap received gameState:", gameState);
  console.log("Map data:", gameState?.map);

  if (!gameState?.map?.size || !gameState?.map?.tiles) {
    console.error("Invalid map data:", gameState?.map);
    return <div className="error-map">Error: Datos del mapa no válidos</div>;
  }

  const renderTile = (x: number, y: number) => {
    const index = y * gameState.map.size.width + x;
    const tile = gameState.map.tiles[index];

    // Verificar que el tile existe
    if (!tile) {
      console.error(`No tile found at index ${index} (${x},${y})`);
      return null;
    }

    // Encontrar héroe en esta posición
    const hero = gameState.player.heroes.find(h => 
      h.position && h.position.x === x && h.position.y === y
    );

    return (
      <div
        key={`tile-${x}-${y}`}
        className={`map-tile ${tile.terrain || 'grass'} ${hero ? 'has-hero' : ''}`}
        onClick={() => onTileClick({ x, y })}
      >
        {hero && (
          <div 
            className="hero-sprite"
            onClick={(e) => {
              e.stopPropagation();
              onHeroClick(hero.id);
            }}
          >
            H
          </div>
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
