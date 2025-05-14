import React, { useRef, useEffect, useState } from 'react';
import '../../styles/components/WorldMap.css';

interface WorldMapProps {
  width: number;
  height: number;
}

// Define colors for different grass tile types
const grassColors = [
  '#7ec850', // Light green - common grass
  '#71b844', // Medium green - common grass
  '#62a136', // Darker green - rarer grass
  '#578c2f', // Darkest green - rarest grass with flowers
];

const WorldMap: React.FC<WorldMapProps> = ({ width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });
  
  const tileSize = 32;
  
  // Crear un mapa que determinará qué tipo de tile va en cada posición
  const generateMap = () => {
    const map: number[][] = [];
    
    for (let y = 0; y < height; y++) {
      const row: number[] = [];
      for (let x = 0; x < width; x++) {
        const noise = Math.sin(x * 0.1) * Math.cos(y * 0.1) + Math.sin(x * 0.05 + y * 0.05);
        const normalizedNoise = (noise + 1) / 2;
        
        let tileIndex;
        if (normalizedNoise < 0.6) {
          tileIndex = 0;
        } else if (normalizedNoise < 0.85) {
          tileIndex = 1;
        } else if (normalizedNoise < 0.95) {
          tileIndex = 2;
        } else {
          tileIndex = 3;
        }
        
        row.push(tileIndex);
      }
      map.push(row);
    }
    
    return map;
  };

  // Renderizar el mapa
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Configurar canvas
    canvas.width = width * tileSize;
    canvas.height = height * tileSize;
    
    // Generar mapa
    const map = generateMap();
    
    // Dibujar mapa usando colores de CSS en lugar de imágenes
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tileIndex = map[y][x];
        
        // Establecer color base del tile
        ctx.fillStyle = grassColors[tileIndex];
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        
        // Añadir pequeñas variaciones/detalles
        if (tileIndex === 2) {
          // Añadir hierba más alta
          ctx.fillStyle = '#83d455';
          for (let i = 0; i < 3; i++) {
            const grassX = x * tileSize + Math.random() * tileSize;
            const grassY = y * tileSize + Math.random() * (tileSize/2);
            const grassWidth = 2 + Math.random() * 2;
            const grassHeight = 5 + Math.random() * 6;
            ctx.fillRect(grassX, grassY, grassWidth, grassHeight);
          }
        } else if (tileIndex === 3) {
          // Añadir flores
          ctx.fillStyle = '#ffeb3b'; // amarillo para flores
          for (let i = 0; i < 2; i++) {
            const flowerX = x * tileSize + 5 + Math.random() * (tileSize - 10);
            const flowerY = y * tileSize + 5 + Math.random() * (tileSize - 10);
            const flowerSize = 3 + Math.random() * 3;
            ctx.beginPath();
            ctx.arc(flowerX, flowerY, flowerSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        
        // Añadir un borde sutil entre tiles
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
      }
    }
    
    setLoading(false);
  }, [width, height]);
  
  // Manejar zoom y desplazamiento
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale(prevScale => Math.max(0.2, Math.min(5, prevScale * delta)));
    };
    
    const handleMouseDown = (e: MouseEvent) => {
      setIsDragging(true);
      setLastPosition({ x: e.clientX, y: e.clientY });
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const dx = e.clientX - lastPosition.x;
      const dy = e.clientY - lastPosition.y;
      
      setPosition(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
      }));
      
      setLastPosition({ x: e.clientX, y: e.clientY });
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    canvas.addEventListener('wheel', handleWheel);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, lastPosition]);
  
  return (
    <div className="world-map-container">
      {loading ? (
        <div className="loading-map">Generando mundo...</div>
      ) : (
        <div className="map-wrapper">
          <div 
            className="map-view"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`
            }}
          >
            <canvas 
              ref={canvasRef}
              className="world-map-canvas"
            />
          </div>
          <div className="map-controls">
            <p>Usa la rueda del ratón para hacer zoom, y arrastra para moverte</p>
            <button onClick={() => setScale(1)}>Resetear Zoom</button>
            <button onClick={() => setPosition({ x: 0, y: 0 })}>Centrar Mapa</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorldMap;