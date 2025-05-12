/*
* Panel de minimapa
* Implementar:
* - Vista reducida del mapa completo
* - Indicador de posición actual
* - Capacidad de clic para navegar a una zona
*/

import React from 'react';
import { MapTile, Position } from '../../types/game';
import '../../styles/components/MinimapPanel.css';

interface MinimapPanelProps {
  map: MapTile[][];
  currentViewport: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  onPositionClick: (position: Position) => void;
}

const MinimapPanel: React.FC<MinimapPanelProps> = ({
  map,
  currentViewport,
  onPositionClick,
}) => {
  // Calcula un factor de escala para el minimapa
  const mapWidth = map[0].length;
  const mapHeight = map.length;
  const MINIMAP_SIZE = 150; // tamaño máximo del minimapa en píxeles
  
  const scaleX = MINIMAP_SIZE / mapWidth;
  const scaleY = MINIMAP_SIZE / mapHeight;
  const scale = Math.min(scaleX, scaleY);
  
  const minimapWidth = mapWidth * scale;
  const minimapHeight = mapHeight * scale;
  
  // Función para determinar el color de cada celda en el minimapa
  const getTileColor = (tile: MapTile): string => {
    switch (tile.terrain) {
      case 'grass': return '#bbf7d0';
      case 'forest': return '#15803d';
      case 'mountain': return '#9ca3af';
      case 'water': return '#60a5fa';
      case 'desert': return '#fde68a';
      case 'snow': return '#f9fafb';
      default: return '#bbf7d0';
    }
  };
  
  // Manejador de clic en el minimapa
  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / scale);
    const y = Math.floor((e.clientY - rect.top) / scale);
    
    // Asegurarse de que las coordenadas están dentro del mapa
    if (x >= 0 && x < mapWidth && y >= 0 && y < mapHeight) {
      onPositionClick({ x, y });
    }
  };
  
  return (
    <div className="minimap-panel">
      <h3>Mapa</h3>
      
      <div 
        className="minimap"
        style={{ width: minimapWidth, height: minimapHeight }}
        onClick={handleMinimapClick}
      >
        {/* Renderizar cada celda del mapa como un pequeño rectángulo */}
        {map.map((row, y) => 
          row.map((tile, x) => (
            <div
              key={`minimap-${x}-${y}`}
              className="minimap-tile"
              style={{
                left: x * scale,
                top: y * scale,
                width: scale,
                height: scale,
                backgroundColor: getTileColor(tile),
              }}
            />
          ))
        )}
        
        {/* Rectángulo que indica la vista actual */}
        <div
          className="minimap-viewport"
          style={{
            left: currentViewport.x * scale,
            top: currentViewport.y * scale,
            width: currentViewport.width * scale,
            height: currentViewport.height * scale,
          }}
        />
      </div>
    </div>
  );
};

export default MinimapPanel;
