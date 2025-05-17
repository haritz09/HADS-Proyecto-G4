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

  const handleTileClick = (position: Position) => {
    if (!selectedHeroId) return;
    
    const now = Date.now();
    const isDoubleClick = now - lastClickTime < 300 && 
      pendingDestination && 
      pendingDestination.x === position.x && 
      pendingDestination.y === position.y;
    
    setLastClickTime(now);
    
    if (isDoubleClick && pendingDestination) {
      // Ejecutar movimiento en segundo click (esto enviará la acción al backend)
      onTileClick(position);
      setPendingDestination(null);
      setPreviewPath([]); // Limpiar el camino al confirmar movimiento
    } else {
      // Mostrar camino solo cuando se hace clic en una casilla
      setPendingDestination(position);
      
      // CRÍTICO: Obtener la posición actual más precisa para este movimiento
      const currentPosition = getHeroCurrentPosition(selectedHeroId, true);
      if (currentPosition) {
        const tiles2D = convertMapTo2D();
        // Calcular el camino desde la posición actual
        const path = findPath(currentPosition, position, tiles2D);
        
        // Solo mostrar animación si hay camino
        if (path.length > 0) {
          setPreviewPath(path);
          console.log(`Camino calculado desde (${currentPosition.x}, ${currentPosition.y}) hasta (${position.x}, ${position.y}), ${path.length} pasos`);
          handleHeroMovement(selectedHeroId, path);
        }
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
    // Para la animación, obtener la posición inicial más reciente
    let startPosition: Position;
    
    // Si ya hay una animación en curso para este héroe, usar su posición actual
    if (animatingHero && animatingHero.heroId === heroId && animatingHero.currentPosition) {
      startPosition = { ...animatingHero.currentPosition };
      console.log(`Continuando movimiento desde posición animada: (${startPosition.x}, ${startPosition.y})`);
    } else {
      // Si no hay animación, usar la posición del estado
      const hero = [...(gameState.player?.heroes || []), ...(gameState.ai?.heroes || [])].find(h => h.id === heroId);
      if (!hero?.position) return;
      startPosition = { ...hero.position };
      console.log(`Iniciando movimiento desde posición de estado: (${startPosition.x}, ${startPosition.y})`);
    }
    
    // Asegurarse de que el camino empiece desde la posición correcta
    const adjustedPath = [startPosition, ...path.slice(1)];

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
    
    let artifact: VisibleObject | null = null;
    
    if (tile?.object_type === 'artifact' && tile?.object_id) {
      const foundArtifact = gameState.map.visible_objects?.find(obj => obj.id === tile.object_id);
      if (foundArtifact) {
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
        return exactMatch;
      }
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

        {building && (
          <div 
            className={`
              building-sprite 
              ${building.built ? 'built' : 'not-built'}
              ${isBuildingInteractive ? 'interactive' : ''}
              ${(isCastleBuilding && isNearCastle) ? 'castle-near-hero' : ''}
              ${isPlayerOwned ? 'player-owned-building' : ''}
              ${isAIOwned ? 'ai-owned-building' : ''}
            `}
            onClick={(e) => {
              e.stopPropagation();
              if (isBuildingInteractive) {
                console.log(`✅ CLIC PROCESADO: ${building.name || building.building_type}, interactivo: ${isBuildingInteractive}, es castillo: ${isCastleBuilding}, cerca: ${isNearCastle}`);
                onBuildingClick(building, city?.id || '');
              } else {
                console.log(`❌ CLIC RECHAZADO: ${building.name || building.building_type}, no interactivo, isNearCastle: ${isNearCastle}, distance: ${
                  selectedHero ? calculateDistance(selectedHero.position, building.position).toFixed(2) : 'N/A'
                }`);
              }
            }}
            title={
              isBuildingInteractive 
                ? isCastleBuilding 
                  ? isNearCastle 
                    ? "Construir edificios (a distancia)" 
                    : "Construir edificios" 
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
        
        if (idx >= 0 && idx < gameState.map.tiles.length) {
          const tile = gameState.map.tiles[idx];
          
          if (tile.object_type !== 'artifact') {
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
