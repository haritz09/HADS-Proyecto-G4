import React, { useState, useRef, useEffect } from 'react';
import { GameState, Hero, Position, MapTile, Building, ArtifactObject, VisibleObject } from '../../types/game';
import { useGame } from '../../contexts/GameContext';
import { findPath, calculatePathCost } from '../../services/gameEngine';
import '../../styles/components/GameMap.css';

interface GameMapProps {
  gameState: GameState;
  selectedHeroId?: string | null;
  onHeroClick: (heroId: string) => void;
  onCityClick: (cityId: string) => void;
  onTileClick: (position: Position) => void;
  onBuildingClick: (building: Building, cityId: string) => void;
  isPlayerTurn: boolean; // Asegurar que es boolean
}

const GameMap: React.FC<GameMapProps> = ({
  gameState,
  selectedHeroId,
  onHeroClick,
  onCityClick,
  onTileClick,
  onBuildingClick,
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
  const [animatingHero, setAnimatingHero] = useState<{
    heroId: string;
    currentPosition: Position;
    path: Position[];
    step: number;
  } | null>(null);

  const { currentPath } = useGame();

  useEffect(() => {
    if (animatingHero && animatingHero.step < animatingHero.path.length) {
      const timer = setTimeout(() => {
        setAnimatingHero(prev => {
          if (!prev) return null;
          return {
            ...prev,
            currentPosition: prev.path[prev.step],
            step: prev.step + 1
          };
        });
      }, 200); // 200ms por paso

      return () => clearTimeout(timer);
    }
  }, [animatingHero]);

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
  const getPathClass = (cost: number): string => {
    if (!selectedHeroId) return '';
    
    const selectedHero = gameState.player.heroes.find(h => h.id === selectedHeroId);
    if (!selectedHero) return '';
    
    return cost <= selectedHero.stats.movement_points_left 
      ? 'reachable-path' 
      : 'unreachable-path';
  };

  // Manejo de click en tile con comportamiento de doble click
  const handleTileClick = (position: Position) => {
    if (!selectedHeroId) return;
    
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
      const heroPosition = getHeroCurrentPosition(selectedHeroId);
      if (heroPosition) {
        const path = findPath(heroPosition, position, tiles2D);
        setPreviewPath(path);
        handleHeroMovement(selectedHeroId, path);
      }
    }
  };

  const getBuildingIcon = (buildingType: string): string => {
    switch (buildingType) {
      case 'castle': return '🏰';
      case 'barracks': return '⚔️';
      case 'archery': return '🏹';
      case 'knights': return '🐎';
      case 'dragon': return '🐉';
      case 'mage_tower': return '🔮';
      default: return '🏛️';
    }
  };

  const getHeroCurrentPosition = (heroId: string) => {
    if (animatingHero && heroId === animatingHero.heroId) {
      return animatingHero.currentPosition;
    }
    const hero = [...(gameState.player?.heroes || []), ...(gameState.ai?.heroes || [])].find(h => h.id === heroId);
    return hero?.position;
  };

  const handleHeroMovement = (heroId: string, path: Position[]) => {
    const startPosition = getHeroCurrentPosition(heroId);
    if (!startPosition) return;

    setAnimatingHero({
      heroId,
      currentPosition: startPosition,
      path,
      step: 0
    });
  };

  const checkHeroOnBuilding = (hero: Hero | undefined | null, building: Building): string | null => {
    if (!hero) return null;
    if (hero.position.x === building.position.x && hero.position.y === building.position.y) {
      if (building.is_castle) {
        return "Castillo: Puedes construir edificios aquí";
      }
      if (!building.built) {
        return `${building.name}: Necesitas construir este edificio primero`;
      }
      if (building.built && building.can_recruit) {
        return `${building.name}: Puedes reclutar unidades aquí`;
      }
    }
    return null;
  };

  // Dentro del componente GameMap, mantener la función getArtifactIcon
  const getArtifactIcon = (subtype: string): string => {
    switch (subtype) {
      case 'totemDeGuerra': return '⚔️';
      case 'totemVelocidad': return '⚡';
      case 'totemReclutamiento': return '💰';
      default: return '🏆';
    }
  };

  // Función mejorada para detectar y manejar artefactos considerando ambas posibilidades
  const findArtifactAtPosition = (x: number, y: number, tile: MapTile): VisibleObject | null => {
    // Depuración detallada
    const idx = y * gameState.map.size.width + x;
    console.log(`Buscando artefacto en (${x},${y}), índice: ${idx}`, {
      tileObjectType: tile?.object_type,
      tileObjectId: tile?.object_id,
      hasVisibleObjects: !!gameState.map.visible_objects,
      visibleObjectsCount: gameState.map.visible_objects?.length || 0
    });
    
    // Buscar artefactos explícitamente en esta posición
    const artifactsAtPosition = gameState.map.visible_objects?.filter(obj => 
      obj.position && obj.position.x === x && obj.position.y === y
    );
    
    console.log(`Artefactos encontrados directamente en (${x},${y}):`, artifactsAtPosition);
    
    // Inicio con null para asegurar que siempre devuelvo null o VisibleObject
    let artifact: VisibleObject | null = null;
    
    // Método 1: Buscar por object_type y object_id en el tile
    if (tile?.object_type === 'artifact' && tile?.object_id) {
      const foundArtifact = gameState.map.visible_objects?.find(obj => obj.id === tile.object_id);
      if (foundArtifact) {
        console.log("Artefacto encontrado por ID en tile:", foundArtifact);
        artifact = foundArtifact;
      }
    }
    
    // Método 2: Buscar directamente por posición en visible_objects
    if (!artifact && gameState.map.visible_objects) {
      const foundArtifact = gameState.map.visible_objects.find(obj => {
        // Buscar por tipo O por subtype (que es el identificador real de artefactos)
        const isArtifact = obj.type === 'artifact' || 'subtype' in obj;
        // Verificar si está en la posición correcta
        const isAtPosition = obj.position && obj.position.x === x && obj.position.y === y;
        return isArtifact && isAtPosition;
      });
      
      if (foundArtifact) {
        console.log("Artefacto encontrado por posición:", foundArtifact);
        artifact = foundArtifact;
      }
    }
    
    // Si no se encuentra por las vías habituales, intentar buscar explícitamente en esta posición
    if (!artifact) {
      // NUEVA LÓGICA: forzar búsqueda exacta por posición
      const exactMatch = gameState.map.visible_objects?.find(obj => 
        obj.position && 
        obj.position.x === x && 
        obj.position.y === y
      );
      
      if (exactMatch) {
        console.log(`✅ Artefacto encontrado por coincidencia exacta de posición (${x},${y}):`, exactMatch);
        return exactMatch;
      }
    }
    
    if (artifact) {
      console.log(`✅ Artefacto encontrado en (${x},${y})`, artifact);
    }
    
    return artifact;
  };

  // Función para extraer propiedades seguras de un artefacto
  const getArtifactProperties = (artifact: VisibleObject | null) => {
    if (!artifact) return { name: null, subtype: null };
    
    let name: string | null = null;
    let subtype: string | null = null;
    
    // Verificar si las propiedades existen usando 'in' operator
    if ('name' in artifact && typeof artifact.name === 'string') {
      name = artifact.name;
    }
    
    if ('subtype' in artifact && typeof artifact.subtype === 'string') {
      subtype = artifact.subtype;
    }
    
    return { name, subtype };
  };

  // Modificar renderTile para usar las nuevas funciones
  const renderTile = (x: number, y: number) => {
    const index = y * gameState.map.size.width + x;
    const tile = gameState.map.tiles[index];

    // Encontrar héroe en esta posición
    const hero = [...(gameState.player?.heroes || []), ...(gameState.ai?.heroes || [])].find(h => {
      const currentPos = getHeroCurrentPosition(h.id);
      return currentPos && currentPos.x === x && currentPos.y === y;
    });

    // Encontrar ciudad y edificio en esta posición exacta
    const city = gameState.player.cities?.find(c => c?.position?.x === x && c?.position?.y === y);
    const building = city?.buildings?.[0]; // Cada ciudad tiene un edificio

    // Buscar artefacto usando la función mejorada
    const artifact = findArtifactAtPosition(x, y, tile);
    const { name: artifactName, subtype: artifactSubtype } = getArtifactProperties(artifact);

    const selectedHero = gameState.player.heroes.find(h => h.id === selectedHeroId) || null;
    const tooltipMessage = building ? checkHeroOnBuilding(selectedHero, building) : null;

    const isHeroHere = hero?.position.x === x && hero?.position.y === y;
    const isBuildingInteractive = building && isHeroHere && (building.is_castle || building.built);

    return (
      <div
        className={`
          map-tile 
          terrain-${tile?.terrain || 'grass'} 
          ${hero ? 'has-hero' : ''} 
          ${city ? 'has-city' : ''}
          ${building ? `has-building building-${building.building_type}` : ''}
          ${isBuildingInteractive ? 'interactive-building' : ''}
          ${isHeroHere && selectedHeroId === hero.id ? 'selected-hero-tile' : ''}
          ${artifact ? 'has-artifact' : ''}
        `}
        onClick={() => handleTileClick({ x, y })}
        title={artifact ? `Artefacto: ${artifactName || artifactSubtype || 'Desconocido'}` : undefined}
      >
        {/* Renderizar artefacto si existe */}
        {artifact && (
          <div 
            className={`artifact-sprite artifact-${artifactSubtype || 'unknown'}`}
            onClick={(e) => {
              e.stopPropagation();
              // Añadir información sobre el artefacto al hacer clic
              console.log("Artefacto en posición:", x, y, artifact);
            }}
          >
            {artifactSubtype && typeof artifactSubtype === 'string' 
              ? getArtifactIcon(artifactSubtype) 
              : '🏆'}
          </div>
        )}

        {hero && !animatingHero && (
          <div 
            className={`hero-sprite ${selectedHeroId === hero.id ? 'selected' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onHeroClick(hero.id);
            }}
          >
            H
          </div>
        )}

        {hero && animatingHero && hero.id === animatingHero.heroId && (
          <div 
            className="hero-sprite moving"
            onClick={(e) => {
              e.stopPropagation();
              onHeroClick(hero.id);
            }}
          >
            H
          </div>
        )}

        {building && (
          <div 
            className={`
              building-sprite 
              ${building.built ? 'built' : 'not-built'}
              ${isBuildingInteractive ? 'interactive' : ''}
            `}
            onClick={(e) => {
              e.stopPropagation();
              if (isBuildingInteractive) {
                onBuildingClick(building, city?.id || '');
              }
            }}
            title={
              isBuildingInteractive 
                ? building.is_castle 
                  ? "Construir edificios" 
                  : "Reclutar unidades"
                : building.built 
                  ? "Edificio construido" 
                  : "Necesitas construir este edificio"
            }
          >
            {getBuildingIcon(building.building_type)}
          </div>
        )}
      </div>
    );
  };

  // Función mejorada para sincronizar artefactos con tiles
  const syncArtifactsWithTiles = () => {
    // Solo si hay visible_objects en el mapa
    if (!gameState?.map?.visible_objects?.length) return;
    
    console.log("GameMap.syncArtifactsWithTiles: Inspeccionando visible_objects", 
      gameState.map.visible_objects.slice(0, 3));
    
    // Examinar más detalles sobre las posiciones de los artefactos
    console.log("Posiciones de los artefactos:", 
      gameState.map.visible_objects.map(obj => ({
        id: obj.id,
        type: obj.type,
        position: obj.position,
        subtipo: 'subtype' in obj ? obj.subtype : 'no-subtype'
      }))
    );
    
    // Primero reparar cualquier artefacto sin type pero con subtype
    gameState.map.visible_objects.forEach(obj => {
      if ('subtype' in obj && !obj.type) {
        console.log("Restaurando propiedad type para artefacto:", obj.id);
        (obj as any).type = 'artifact';
      }
    });
    
    const artifactObjects = gameState.map.visible_objects.filter(obj => 
      obj.type === 'artifact' || 'subtype' in obj
    );
    
    console.log(`Encontrados ${artifactObjects.length} artefactos para sincronizar`);
    
    // Intentar actualizar los tiles correspondientes (solo visual, no afecta el estado real)
    artifactObjects.forEach(artifact => {
      if (artifact.position) {
        const { x, y } = artifact.position;
        const idx = y * gameState.map.size.width + x;
        
        // Verificar más detalles sobre la posición y el índice
        console.log(`Artefacto ${artifact.id} en posición (${x},${y}), índice: ${idx}`);
        console.log(`- Tamaño del mapa: ${gameState.map.size.width}x${gameState.map.size.height}`);
        console.log(`- Longitud de tiles: ${gameState.map.tiles.length}`);
        console.log(`- ¿Índice válido? ${idx >= 0 && idx < gameState.map.tiles.length}`);
        
        if (idx >= 0 && idx < gameState.map.tiles.length) {
          const tile = gameState.map.tiles[idx];
          console.log(`- Tile actual:`, tile);
          
          // Verificar por qué no se actualiza el tile
          if (tile.object_type !== 'artifact') {
            console.log(`  > Debería actualizar este tile con object_type='artifact' y object_id='${artifact.id}'`);
            
            // Intentar una COPIA PROFUNDA del tile para actualizar
            const updatedTile = JSON.parse(JSON.stringify(tile));
            updatedTile.object_type = 'artifact';
            updatedTile.object_id = artifact.id;
            
            // Verificar si el problema es que no estamos actualizando el estado inmutable correctamente
            console.log(`  > Tile actualizado (copia):`, updatedTile);
            
            // IMPORTANTE: Este es solo un mensaje de log y no modifica realmente el estado
            // Para solucionar el problema, necesitamos una forma de modificar immutablemente
          }
        }
      }
    });
  };

  // Llamar a la función de sincronización cuando se carga el mapa
  useEffect(() => {
    console.log("GameMap: Evaluando visible_objects para sincronización", {
      hasVisibleObjects: !!gameState?.map?.visible_objects,
      count: gameState?.map?.visible_objects?.length || 0,
      types: gameState?.map?.visible_objects?.map(obj => obj.type) || []
    });
    
    if (gameState?.map?.visible_objects?.length > 0) {
      syncArtifactsWithTiles();
    }
  }, [gameState?.map?.visible_objects]);

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
