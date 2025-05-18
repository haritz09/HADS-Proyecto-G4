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
  const [forceUpdate, setForceUpdate] = useState({});

  const { currentPath } = useGame();

  useEffect(() => {
    if (animatingHero && animatingHero.step < animatingHero.path.length) {
      const timer = setTimeout(() => {
        setAnimatingHero(prev => {
          if (!prev) return null;
          
          // Si hemos llegado al último paso del camino
          if (prev.step >= prev.path.length - 1) {
            // Posición final - la última posición del camino
            const finalPosition = prev.path[prev.path.length - 1];
            
            // CRÍTICO: Actualizar la posición real del héroe en el estado del juego
            const hero = [...(gameState.player?.heroes || []), ...(gameState.ai?.heroes || [])].find(h => h.id === prev.heroId);
            if (hero) {
              // Asegurar que la posición se actualiza sin efectos secundarios
              hero.position = { ...finalPosition };
              console.log(`✅ Animación finalizada: Héroe ${prev.heroId} ahora en (${finalPosition.x}, ${finalPosition.y})`);
            }
            
            // Devolver null para limpiar la animación
            return null;
          }
          
          // Para pasos intermedios, avanzar en la animación
          const nextStep = prev.step + 1;
          return {
            ...prev,
            currentPosition: prev.path[prev.step], // Usar la posición actual del paso
            step: nextStep
          };
        });
      }, 200); // 200ms por paso

      return () => clearTimeout(timer);
    }
  }, [animatingHero, gameState.player?.heroes, gameState.ai?.heroes]);

  useEffect(() => {
    if (selectedHeroId) {
      console.log(`Héroe seleccionado ${selectedHeroId} posición actualizada, forzando redibujado para actualizar interactividad`);
      const forceUpdate = {};
      setForceUpdate(forceUpdate);
    }
  }, [selectedHeroId, animatingHero === null]);

  const calculateDistance = (pos1: Position, pos2: Position): number => {
    return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
  };

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

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.5, Math.min(2, prev * delta)));
  };

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

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const isPositionInPath = (x: number, y: number): boolean => {
    return currentPath.some(pos => pos.x === x && pos.y === y);
  };

  const isPositionInPreviewPath = (x: number, y: number): boolean => {
    return previewPath.some(pos => pos.x === x && pos.y === y);
  };

  const getPathClass = (cost: number): string => {
    if (!selectedHeroId) return '';
    
    const selectedHero = gameState.player.heroes.find(h => h.id === selectedHeroId);
    if (!selectedHero) return '';
    
    return cost <= selectedHero.stats.movement_points_left 
      ? 'reachable-path' 
      : 'unreachable-path';
  };

  // Manejo de click en tile - ahora requiere doble clic para moverse
  const handleTileClick = (position: Position) => {
    if (!selectedHeroId) return;
    
    const currentTime = new Date().getTime();
    const timeSinceLastClick = currentTime - lastClickTime;
    
    // Umbral de doble clic - 300ms es bastante estándar
    const doubleClickThreshold = 300; // milisegundos
    
    if (timeSinceLastClick < doubleClickThreshold) {
      // Es un doble clic, ejecutar la acción de movimiento
      console.log('Double click detected, initiating movement');
      onTileClick(position);
    } else {
      // Primer clic - mostrar indicación visual si quieres
      console.log('First click, waiting for potential double click');
      // Opcionalmente, podrías establecer un estado para mostrar una indicación visual
      // setPendingDestination(position);
    }
    
    // Actualizar el tiempo del último clic para la siguiente verificación
    setLastClickTime(currentTime);
  };

  const getBuildingIcon = (buildingType: string): string => {
    switch (buildingType) {
      case 'castle': return '🏰';
      case 'barracks': return '⚔️';
      case 'archery': return '🏹';
      case 'knights_tower': return '🐎';  // Manejar ambos nombres
      case 'dragons_lair': return '🐉';    // Manejar ambos nombres
      case 'mage_tower': return '🔮';
      default: return '🏛️';
    }
  };

  const getHeroCurrentPosition = (heroId: string, forAnimation = false) => {
    // Si es para animación y hay un héroe animándose, usar su posición visual
    if (forAnimation && animatingHero && heroId === animatingHero.heroId) {
      return { ...animatingHero.currentPosition };
    }
    
    // Para cálculos de interacción o cuando no hay animación, usar la posición del estado
    const hero = [...(gameState.player?.heroes || []), ...(gameState.ai?.heroes || [])].find(h => h.id === heroId);
    return hero?.position ? { ...hero.position } : undefined;
  };

  const handleHeroMovement = (heroId: string, path: Position[]) => {
    const startPosition = getHeroCurrentPosition(heroId);
    if (!startPosition || path.length < 2) return;

    // Now animation will only be triggered after backend confirms successful movement
    setAnimatingHero({
      heroId,
      currentPosition: startPosition,
      path: adjustedPath,
      step: 0
    });
  };

  const checkHeroOnBuilding = (hero: Hero | undefined | null, building: Building): string | null => {
    if (!hero) return null;
    
    const isAtSamePosition = hero.position.x === building.position.x && hero.position.y === building.position.y;
    const isCastle = building.is_castle || (building.position.x === 48 && building.position.y === 48);
    const distance = calculateDistance(hero.position, building.position);
    const isNearCastle = isCastle && distance <= 2;
    
    if (isAtSamePosition) {
      if (building.is_castle) {
        return "Castillo: Puedes construir edificios aquí";
      }
      if (!building.built) {
        return `${building.name}: Necesitas construir este edificio primero`;
      }
      if (building.built && building.can_recruit) {
        return `${building.name}: Puedes reclutar unidades aquí`;
      }
    } else if (isNearCastle) {
      return "Castillo: Puedes construir edificios (a distancia)";
    }
    
    return null;
  };

  const getArtifactIcon = (subtype: string): string => {
    switch (subtype) {
      case 'totemDeGuerra': return '⚔️';
      case 'totemVelocidad': return '⚡';
      case 'totemReclutamiento': return '💰';
      default: return '🏆';
    }
  };

  const findArtifactAtPosition = (x: number, y: number, tile: MapTile): VisibleObject | null => {
    const idx = y * gameState.map.size.width + x;
    
    const artifactsAtPosition = gameState.map.visible_objects?.filter(obj => 
      obj.position && obj.position.x === x && obj.position.y === y
    );
    
    //console.log(`Artefactos encontrados directamente en (${x},${y}):`, artifactsAtPosition);
    /*console.groupCollapsed(`Artefactos en (${x},${y})`); 
    console.log(artifactsAtPosition);
    console.groupEnd();
    */
    // Inicio con null para asegurar que siempre devuelvo null o VisibleObject
    let artifact: VisibleObject | null = null;
    
    if (tile?.object_type === 'artifact' && tile?.object_id) {
      const foundArtifact = gameState.map.visible_objects?.find(obj => obj.id === tile.object_id);
      if (foundArtifact) {
        //console.log("Artefacto encontrado por ID en tile:", foundArtifact);
        artifact = foundArtifact;
      }
    }
    
    if (!artifact && gameState.map.visible_objects) {
      const foundArtifact = gameState.map.visible_objects.find(obj => {
        const isArtifact = obj.type === 'artifact' || 'subtype' in obj;
        const isAtPosition = obj.position && obj.position.x === x && obj.position.y === y;
        return isArtifact && isAtPosition;
      });
      
      if (foundArtifact) {
        //console.log("Artefacto encontrado por posición:", foundArtifact);
        artifact = foundArtifact;
      }
    }
    
    if (!artifact) {
      const exactMatch = gameState.map.visible_objects?.find(obj => 
        obj.position && 
        obj.position.x === x && 
        obj.position.y === y
      );
      
      if (exactMatch) {
       // console.log(`✅ Artefacto encontrado por coincidencia exacta de posición (${x},${y}):`, exactMatch);
        return exactMatch;
      }
    }
    
    if (artifact) {
      //console.log(`✅ Artefacto encontrado en (${x},${y})`, artifact);
    }
    
    return artifact;
  };

  const getArtifactProperties = (artifact: VisibleObject | null) => {
    if (!artifact) return { name: null, subtype: null };
    
    let name: string | null = null;
    let subtype: string | null = null;
    
    if ('name' in artifact && typeof artifact.name === 'string') {
      name = artifact.name;
    }
    
    if ('subtype' in artifact && typeof artifact.subtype === 'string') {
      subtype = artifact.subtype;
    }
    
    return { name, subtype };
  };

  const renderBuilding = (building: Building, cityId: string) => {
    const heroes = [...(gameState.player?.heroes || []), ...(gameState.ai?.heroes || [])];

    const isHeroNearby = heroes.some(hero => {
      const dx = Math.abs(hero.position.x - building.position.x);
      const dy = Math.abs(hero.position.y - building.position.y);
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= 2;
    });

    const isCastle = building.is_castle || 
                   (building.position.x === 48 && building.position.y === 48);
    
    const isPlayerOwned = building.owner === 'player';
    
    // Corregir: Un edificio es interactivo si:
    // 1. Está construido Y (es un castillo O puede reclutar) Y le pertenece al jugador Y hay un héroe cerca
    // O
    // 2. Es un castillo Y hay un héroe cerca (para el menú de construcción)
    const isInteractive = (building.built && (isCastle || building.can_recruit) && isPlayerOwned && isHeroNearby) ||
                         (isCastle && isHeroNearby);
    
    const selectedHero = heroes.find(h => h.id === selectedHeroId);
    const distance = selectedHero ? 
      Math.sqrt(
        Math.pow(selectedHero.position.x - building.position.x, 2) + 
        Math.pow(selectedHero.position.y - building.position.y, 2)
      ) : 
      Infinity;
    
    const buildingClasses = [
      'building',
      isCastle ? 'building-castle' : '',
      isInteractive ? 'building-interactive' : '',
      isPlayerOwned ? 'building-player-owned' : '',
      building.built ? 'building-built' : '',
      building.can_recruit && building.built ? 'building-can-recruit' : '',
      `building-${building.building_type}`
    ].filter(Boolean).join(' ');

    const handleBuildingClick = () => {
      console.log(`GameMap: Building clicked: ${building.name}, ${building.building_type}, ${isInteractive ? 'interactive' : 'no interactivo'}, isNearCastle: ${isHeroNearby}, distance: ${distance.toFixed(2)}, can_recruit: ${building.can_recruit}, built: ${building.built}, owner: ${building.owner}`);
      
      if (isInteractive) {
        onBuildingClick(building, cityId);
      } else {
        console.log(`GameMap: Building not interactive. Distance: ${distance.toFixed(2)}, isHeroNearby: ${isHeroNearby}, built: ${building.built}, can_recruit: ${building.can_recruit}, owner: ${building.owner}`);
      }
    };

    return (
      <div
        key={building.id}
        className={buildingClasses}
        style={{
          left: `${building.position.x * 32}px`,
          top: `${building.position.y * 32}px`,
          width: `32px`,
          height: `32px`,
        }}
        onClick={handleBuildingClick}
      >
        {getBuildingIcon(building.building_type)}
      </div>
    );
  };

  const renderTile = (x: number, y: number) => {
    const index = y * gameState.map.size.width + x;
    const tile = gameState.map.tiles[index];

    const heroForRendering = [...(gameState.player?.heroes || []), ...(gameState.ai?.heroes || [])].find(h => {
      const visualPos = getHeroCurrentPosition(h.id, true);
      return visualPos && visualPos.x === x && visualPos.y === y;
    });

    const heroAtThisPosition = [...(gameState.player?.heroes || []), ...(gameState.ai?.heroes || [])].find(h => {
      return h.position.x === x && h.position.y === y;
    });

    const city = gameState.player.cities?.find(c => c?.position?.x === x && c?.position?.y === y);
    const aiCity = gameState.ai.cities?.find(c => c?.position?.x === x && c?.position?.y === y);
    const building = city?.buildings?.[0] || aiCity?.buildings?.[0];

    const artifact = findArtifactAtPosition(x, y, tile);
    const { name: artifactName, subtype: artifactSubtype } = getArtifactProperties(artifact);

    const selectedHero = gameState.player.heroes.find(h => h.id === selectedHeroId) || null;
    
    const isCastleBuilding = building && (building.is_castle || (building.position.x === 48 && building.position.y === 48));
    let isNearCastle = false;
    
    if (isCastleBuilding && selectedHero) {
      const heroRealPosition = selectedHero.position;
      const distance = calculateDistance(heroRealPosition, building.position);
      isNearCastle = distance <= 2;
      
      if (building.position.x === 48 && building.position.y === 48) {
        console.log(`⚡ CASTILLO CENTRAL: Héroe en (${heroRealPosition.x}, ${heroRealPosition.y}), ` +
                   `Distancia = ${distance.toFixed(2)}, Es cercano = ${isNearCastle}, ` +
                   `Soy interactivo = ${isNearCastle || (selectedHero.position.x === x && selectedHero.position.y === y)}`);
      }
    }

    const isPlayerOwned = building && building.owner === "player";
    const isAIOwned = building && building.owner === "ai";

    const isHeroAtThisPosition = selectedHero && selectedHero.position.x === x && selectedHero.position.y === y;
    const isBuildingInteractive = building && (isHeroAtThisPosition || (isCastleBuilding && isNearCastle));

    const forceCastleInteractive = isCastleBuilding && isNearCastle;

    const tileClasses = [
      `map-tile`,
      `terrain-${tile?.terrain || 'grass'}`,
      heroAtThisPosition ? 'has-hero' : '',
      city ? 'has-city' : '',
      building ? `has-building building-${building.building_type}` : '',
      isBuildingInteractive ? 'interactive-building' : '',
      forceCastleInteractive ? 'castle-near-hero' : '',
      isPlayerOwned ? 'player-owned-building' : '', // Clase para edificios del jugador
      isAIOwned ? 'ai-owned-building' : '', // Clase para edificios de la IA
      selectedHero && selectedHero.position.x === x && selectedHero.position.y === y ? 'selected-hero-tile' : '',
      artifact ? 'has-artifact' : ''
    ].filter(Boolean).join(' ');

    const tooltipMessage = building ? checkHeroOnBuilding(selectedHero, building) : null;

    return (
      <div
        className={tileClasses}
        onClick={() => handleTileClick({ x, y })}
        title={artifact ? `Artefacto: ${artifactName || artifactSubtype || 'Desconocido'}` : tooltipMessage || undefined}
      >
        {artifact && (
          <div 
            className={`artifact-sprite artifact-${artifactSubtype || 'unknown'}`}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {artifactSubtype && typeof artifactSubtype === 'string' 
              ? getArtifactIcon(artifactSubtype) 
              : '🏆'}
          </div>
        )}

        {heroForRendering && !animatingHero && (
          <div 
            className={`hero-sprite ${selectedHeroId === heroForRendering.id ? 'selected' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onHeroClick(heroForRendering.id);
            }}
          >
            H
          </div>
        )}

        {heroForRendering && animatingHero && heroForRendering.id === animatingHero.heroId && (
          <div 
            className="hero-sprite moving"
            onClick={(e) => {
              e.stopPropagation();
              onHeroClick(heroForRendering.id);
            }}
          >
            H
          </div>
        )}

        {building && renderBuilding(building, city?.id || '')}
      </div>
    );
  };

  const syncArtifactsWithTiles = () => {
    if (!gameState?.map?.visible_objects?.length) return;
    
    gameState.map.visible_objects.forEach(obj => {
      if ('subtype' in obj && !obj.type) {
        (obj as any).type = 'artifact';
      }
    });
    
    const artifactObjects = gameState.map.visible_objects.filter(obj => 
      obj.type === 'artifact' || 'subtype' in obj
    );
    
    artifactObjects.forEach(artifact => {
      if (artifact.position) {
        const { x, y } = artifact.position;
        const idx = y * gameState.map.size.width + x;
        
        // Verificar más detalles sobre la posición y el índice
        //console.log(`Artefacto ${artifact.id} en posición (${x},${y}), índice: ${idx}`);
        //console.log(`- Tamaño del mapa: ${gameState.map.size.width}x${gameState.map.size.height}`);
        //console.log(`- Longitud de tiles: ${gameState.map.tiles.length}`);
        //console.log(`- ¿Índice válido? ${idx >= 0 && idx < gameState.map.tiles.length}`);
        
        if (idx >= 0 && idx < gameState.map.tiles.length) {
          const tile = gameState.map.tiles[idx];
          //console.log(`- Tile actual:`, tile);
          
          if (tile.object_type !== 'artifact') {
            //console.log(`  > Debería actualizar este tile con object_type='artifact' y object_id='${artifact.id}'`);
            
            // Intentar una COPIA PROFUNDA del tile para actualizar
            const updatedTile = JSON.parse(JSON.stringify(tile));
            updatedTile.object_type = 'artifact';
            updatedTile.object_id = artifact.id;
          }
        }
      }
    });
  };

  useEffect(() => {
    if (gameState?.map?.visible_objects?.length > 0) {
      syncArtifactsWithTiles();
    }
  }, [gameState?.map?.visible_objects]);

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
