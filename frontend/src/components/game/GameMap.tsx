import React, { useState, useRef, useEffect } from 'react';
import { GameState, Hero, Position, MapTile, Building, ArtifactObject, VisibleObject, ResourceMine } from '../../types/game';
import { useGame } from '../../contexts/GameContext';
import { findPath, calculatePathCost } from '../../services/gameEngine';
import '../../styles/components/GameMap.css';
import { TileVisibility } from '../../constants/gameConstants';

export interface GameMapRef {
  animateHeroMovement: (heroId: string, path: Position[]) => Promise<void>;
}

interface GameMapProps {
  gameState: GameState;
  selectedHeroId?: string | null;
  onHeroClick: (heroId: string) => void;
  onCityClick: (cityId: string) => void;
  onTileClick: (position: Position) => void;
  onBuildingClick: (building: Building, cityId: string) => void;
  isPlayerTurn: boolean;
  isReadOnly?: boolean;  // Nueva prop para vistas de solo lectura
  isAIView?: boolean;    // Nueva prop para indicar vista de IA
}

const GameMap = React.forwardRef<GameMapRef, GameMapProps>(function GameMap(props, ref) {
  const {
    gameState,
    selectedHeroId,
    onHeroClick,
    onCityClick,
    onTileClick,
    onBuildingClick,
    isPlayerTurn,
    isReadOnly = false,
    isAIView = false
  } = props;
  const mapRef = useRef<HTMLDivElement>(null);
  const [viewportPosition, setViewportPosition] = useState({ x: 0, y: 0 });
  // Remove zoom state and set fixed zoom of 1
  const fixedZoom = 1;
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
  const [animationPath, setAnimationPath] = useState<Position[]>([]);

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

  // Remove handleWheel function completely

  // Modify handleMouseDown to work with any mouse button
  const handleMouseDown = (e: React.MouseEvent) => {
    // Remove check for right button only
    e.preventDefault();
    setIsDragging(true);
    setStartX(e.pageX - mapRef.current!.offsetLeft);
    setStartY(e.pageY - mapRef.current!.offsetTop);
    setScrollLeft(mapRef.current!.scrollLeft);
    setScrollTop(mapRef.current!.scrollTop);
  };

  // Keep handleMouseMove as is
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

  // Keep handleMouseUp unchanged
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
    if (isReadOnly) return;
    
    if (!selectedHeroId) return;

    // Check that position is defined and has x/y properties
    if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
      console.error('Invalid position object in handleTileClick:', position);
      return;
    }
    
    const currentTime = new Date().getTime();
    const timeSinceLastClick = currentTime - lastClickTime;
    
    // Aumentado el umbral de doble clic para dar más tiempo para el segundo clic
    const doubleClickThreshold = 1000; // milisegundos (aumentado de 600ms a 1000ms)
    
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
      return { ...animatingHero.currentPosition,
        isAnimating: true // Add flag to indicate this hero is moving
       };
    }
    
    // Para cálculos de interacción o cuando no hay animación, usar la posición del estado
    const hero = [...(gameState.player?.heroes || []), ...(gameState.ai?.heroes || [])].find(h => h.id === heroId);
    // Always include isAnimating property, set to false when not animating
    return hero?.position ? { ...hero.position, isAnimating: false } : undefined;
  };

  const handleHeroMovement = (heroId: string, path: Position[]): Promise<void> => {
    const startPosition = getHeroCurrentPosition(heroId);
    if (!startPosition || path.length < 2) return Promise.resolve();

     console.log(`GameMap: Animating hero ${heroId} movement with ${path.length} steps`);

     // Set the animation path for path indicators
    setAnimationPath(path);

     // Calculate total animation time based on path length
    const totalAnimationTime = path.length * 200; // 200ms per step

     return new Promise<void>((resolve) => {
      // Set the animating state
      setAnimatingHero({
        heroId,
        currentPosition: { x: startPosition.x, y: startPosition.y }, // Ensure only Position properties
        path,
        step: 0
      });

      // Instead of using an interval check which can have closure issues,
      // resolve the promise after the expected animation duration
      setTimeout(() => {
        console.log(`GameMap: Animation completed for hero ${heroId}`);
        // Clear the path after animation completes
        setAnimationPath([]);
        resolve();
      }, totalAnimationTime + 100); // Add a small buffer for safety
    });
  };

  // Expose the handleHeroMovement function via forwardRef
  React.useImperativeHandle(ref, () => ({
    animateHeroMovement: handleHeroMovement
  }));

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
      const foundArtifact = gameState.map.visible_objects?.find((obj: VisibleObject) => obj.id === tile.object_id);
      if (foundArtifact) {
        artifact = foundArtifact;
      }
    }
    
    if (!artifact && gameState.map.visible_objects) {
      const foundArtifact = gameState.map.visible_objects.find((obj: VisibleObject) => {
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

  const renderBuildingOverlay = (building: Building, cityId: string) => {
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
          position: 'absolute',
        }}
        onClick={handleBuildingClick}
      >
        <img
          src={
            building && building.building_type === 'castle'
              ? castleImagePath
              : building && building.building_type === 'barracks'
                ? barracksImagePath
                : building && building.building_type === 'archery'
                  ? archeryImagePath
                  : building && building.building_type === 'knights_tower'
                    ? knightsTowerImagePath
                  : building && building.building_type === 'mage_tower'
                    ? mageTowerImagePath
                  : building && building.building_type === 'dragons_lair'
                    ? dragonsLairImagePath
                  : buildingImagePath
          }
          alt={
            building && building.building_type === 'castle'
              ? 'castle'
              : building.building_type === 'barracks'
                ? 'barracks'
                : building.building_type === 'archery'
                  ? 'archery'
                  : building.building_type === 'knights_tower'
                    ? 'knights_tower'
                    : building.building_type === 'mage_tower'
                      ? 'mage_tower'
                      : building.building_type === 'dragons_lair'
                        ? 'dragons_lair'
                        : 'building'
          }
          className={`tile-building ${isCastle && isHeroNearby ? 'castle-near-hero' : ''} ${isInteractive ? 'interactive-building' : ''}`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            zIndex: 2,
            pointerEvents: 'auto',
            cursor: isInteractive ? 'pointer' : 'default'
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (isInteractive) {
              handleBuildingClick();
            }
          }}
          onError={e => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      </div>
    );
  };

  // Updated getMineIcon function to be more clear and visible
  const getMineIcon = (type: string, symbol?: string): string => {
    // If we have a custom symbol from the backend, use it
    if (symbol) return symbol;
    
    // Otherwise, use a clear icon based on type
    switch (type) {
      case 'goldmine': return '💰';  // Gold bag for gold mines
      case 'sawmill': return '🪵';   // Wood for sawmills
      case 'quarry': return '⛏️';    // Pickaxe for quarries
      default:
        // If we don't recognize the type but have resource_type, use that
        if (type.includes('gold')) return '💰';
        if (type.includes('wood')) return '🪵';
        if (type.includes('stone')) return '⛏️';
        return '🏭'; // Default factory icon
    }
  };
  
  const goldMineImagePath = '/assets/images/tiles/grass/gold_mine.PNG';
  const quarryImagePath = '/assets/images/tiles/grass/rock.png';
  const sawmillImagePath = '/assets/images/tiles/grass/wood.png'; // Añadido para sawmill
  const barracksImagePath = '/assets/images/tiles/grass/cuartel.PNG'; // Añadido para barracks
  const archeryImagePath = '/assets/images/tiles/grass/archery.png'; // Añadido para archery
  const knightsTowerImagePath = '/assets/images/tiles/grass/tower.svg'; // Añadido para knights_tower
  const mageTowerImagePath = '/assets/images/tiles/grass/mage_tower.png'; // Añadido para mage_tower
  const dragonsLairImagePath = '/assets/images/tiles/grass/dragons_lair.png'; // Añadido para dragons_lair
  const artifactImagePath = '/assets/images/tiles/grass/TreasureChestclosed.png';
  const grassImagePath = '/assets/images/tiles/grass/grass_01.png';
  const treeImagePath = '/assets/images/tiles/grass/Sprite_01.png';
  const heroImagePath = '/assets/images/tiles/grass/knight.png';
  const hero2ImagePath = '/assets/images/tiles/grass/knight.png';
  const buildingImagePath = '/assets/images/tiles/grass/building1.png'; // Añadido para buildings
  const castleImagePath = '/assets/images/tiles/grass/castle.gif'; // Añadido para castillos
  const mountainImagePath = '/assets/images/tiles/grass/mont3.png'; // Añadido para montaña
  const waterImagePath = '/assets/images/tiles/grass/water.png'; // Añadido para river

  // Enhanced renderMine function with better logging - MODIFIED to remove absolute positioning
  const renderMine = (mine: VisibleObject & { exploredOnly?: boolean }) => {
    if (!mine.position) {
      console.warn('Trying to render mine without position:', mine);
      return null;
    }
    
    // Type assertion to access resource properties
    const resourceMine = mine as ResourceMine;
    
    // Extract important properties with fallbacks
    const mineType = mine.type || 'unknown';
    const owner = mine.owner;
    const resourceType = 'resource_type' in mine ? resourceMine.resource_type : 'unknown';
    const resourcePerTurn = 'resource_per_turn' in mine ? resourceMine.resource_per_turn : 0;
    const symbol = 'symbol' in mine ? (mine as any).symbol : undefined;
    const ownerClass = owner === 'player' ? 'player-owned' : owner === 'ai' ? 'ai-owned' : 'neutral';
    
    const cssClasses = [
      'resource-mine',
      mineType,
      ownerClass,
      mine.justCaptured ? 'just-captured' : '',
      (mine.exploredOnly ? 'explored-only' : '') // Add this class for explored-only mines
    ].filter(Boolean).join(' ');

    const getTooltip = (): string => {
      const resourceName = resourceType.charAt(0).toUpperCase() + resourceType.slice(1);
      let tooltip = `Mina de ${resourceName}: +${resourcePerTurn} por turno`;
      
      if (owner) {
        tooltip += `\nPropietario: ${owner === 'player' ? 'Tú' : 'IA'}`;
      } else {
        tooltip += '\nSin propietario';
      }
      
      return tooltip;
    };
    
    // Use the same classes but without absolute positioning
    const mineClasses = [
      'resource-mine',
      mineType,
      ownerClass,
      mine.justCaptured ? 'just-captured' : ''
    ].filter(Boolean).join(' ');

    // Mostrar imagen para goldmine
    if (mineType === 'goldmine' || resourceType === 'gold') {
      return (
        <div
          key={`mine-${mine.id}`}
          className={mineClasses}
          title={getTooltip()}
          data-income={`+${resourcePerTurn}`}
        >
          <img
            src={goldMineImagePath}
            alt="goldmine"
            className="tile-goldmine"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              zIndex: 2,
              pointerEvents: 'none'
            }}
            onError={e => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
      );
    }

    // Mostrar imagen para sawmill (solo la imagen de wood.png)
    if (mineType === 'sawmill' || resourceType === 'wood') {
      return (
        <div
          key={`mine-${mine.id}`}
          className={mineClasses}
          title={getTooltip()}
          data-income={`+${resourcePerTurn}`}
        >
          <img
            src={sawmillImagePath}
            alt="sawmill"
            className="tile-sawmill"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              zIndex: 2,
              pointerEvents: 'none'
            }}
            onError={e => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
      );
    }

    // Mostrar imagen para quarry
    if (mineType === 'quarry' || resourceType === 'stone') {
      return (
        <div
          key={`mine-${mine.id}`}
          className={mineClasses}
          title={getTooltip()}
          data-income={`+${resourcePerTurn}`}
        >
          <img
            src={quarryImagePath}
            alt="quarry"
            className="tile-quarry"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              zIndex: 2,
              pointerEvents: 'none'
            }}
            onError={e => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
      );
    }

    // Generic mine rendering for other types
    return (
      <div
        key={`mine-${mine.id}`}
        className={mineClasses}
        title={getTooltip()}
        data-income={`+${resourcePerTurn}`}
      >
        {getMineIcon(mineType, symbol)}
      </div>
    );
  };

  // Precalcular el mapa de árboles: ahora todos los tiles de tipo forest tendrán árbol
  const [treeMap, setTreeMap] = useState<boolean[][]>([]);

  useEffect(() => {
    const width = gameState.map.size.width;
    const height = gameState.map.size.height;
    const newTreeMap: boolean[][] = [];
    for (let y = 0; y < height; y++) {
      const row: boolean[] = [];
      for (let x = 0; x < width; x++) {
        const tile = gameState.map.tiles[y * width + x];
        // Mostrar árbol en TODOS los tiles de tipo forest
        row.push(tile?.terrain === 'forest');
      }
      newTreeMap.push(row);
    }
    setTreeMap(newTreeMap);
    // eslint-disable-next-line
  }, [gameState.map.tiles]);

  // Actualizar el método renderTile para detectar minas en el tile
  const renderTile = (x: number, y: number) => {
    const index = y * gameState.map.size.width + x;
    const tile = gameState.map.tiles[index];
    const visibility = getTileVisibility(x, y);

     // Para tiles completamente sin explorar, renderizar un tile negro simple
    if (visibility === TileVisibility.UNEXPLORED) {
      return (
        <div
          className="map-tile unexplored-tile"
          onClick={isReadOnly ? undefined : () => handleTileClick({ x, y })}
        ></div>
      );
    }

    // Para tiles explorados pero no visibles actualmente
    const isExploredOnly = visibility === TileVisibility.EXPLORED;

    
    // Solo mostrar objetos y personajes en tiles actualmente visibles
    const heroForRendering = !isExploredOnly ? 
      [...(gameState.player?.heroes || []), ...(gameState.ai?.heroes || [])].find(h => {
        const visualPos = getHeroCurrentPosition(h.id, true);
        return visualPos && visualPos.x === x && visualPos.y === y;
      }) : null;

    const heroAtThisPosition = [...(gameState.player?.heroes || []), ...(gameState.ai?.heroes || [])].find(h => {
      return h.position.x === x && h.position.y === y;
    });

    const city = gameState.player.cities?.find(c => c?.position?.x === x && c?.position?.y === y);
    const aiCity = gameState.ai.cities?.find(c => c?.position?.x === x && c?.position?.y === y);
    const building = city?.buildings?.[0] || aiCity?.buildings?.[0];

    // Find a mine at this position
    const mineAtPosition = gameState.map.visible_objects?.find(obj => 
      obj.position && 
      obj.position.x === x && 
      obj.position.y === y && 
      (obj.type === 'goldmine' || obj.type === 'sawmill' || obj.type === 'quarry' || 
       ('resource_type' in obj && ['gold', 'wood', 'stone'].includes(obj.resource_type as string)))
    ) as ResourceMine | undefined;

    // Solo buscar artefactos en áreas actualmente visibles
    const artifact = !isExploredOnly ? findArtifactAtPosition(x, y, tile) : null;
    const { name: artifactName, subtype: artifactSubtype } = getArtifactProperties(artifact);

    const selectedHero = gameState.player.heroes.find((h: Hero) => h.id === selectedHeroId) || null;
    
    const isCastleBuilding = building && (building.is_castle || (building.position.x === 48 && building.position.y === 48));
    let isNearCastle = false;
    let isNearRecruitingBuilding = false;
    
    if (selectedHero) {
      const heroRealPosition = selectedHero.position;
      
      if (building) {
        const distance = calculateDistance(heroRealPosition, building.position);
        
        // Comprobar si es un castillo cercano
        if (isCastleBuilding) {
          isNearCastle = distance <= 2;
        }
        
        // Comprobar si es un edificio de reclutamiento cercano
        if (building.built && building.can_recruit && building.owner === "player") {
          isNearRecruitingBuilding = distance <= 2;
        }
      }
    }

    const isPlayerOwned = building && building.owner === "player";
    const isAIOwned = building && building.owner === "ai";

    const isHeroAtThisPosition = selectedHero && selectedHero.position.x === x && selectedHero.position.y === y;
    
    // Modificar lógica de interactividad para incluir edificios de reclutamiento cercanos
    const isBuildingInteractive = building && (
      isHeroAtThisPosition || 
      (isCastleBuilding && isNearCastle) ||
      (building.built && building.can_recruit && isPlayerOwned && isNearRecruitingBuilding)
    );

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

    // Añadir clases adicionales para la vista de IA
    const additionalClasses = isAIView ? 'ai-view-tile' : '';
    
    const updatedTileClasses = [
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
      artifact ? 'has-artifact' : '',
      additionalClasses
    ].filter(Boolean).join(' ');


     // NUEVO: Mostrar imagen para tiles de tipo grass, forest y mountain SIEMPRE como fondo
    const isGrass = tile?.terrain === 'grass';
    const isForest = tile?.terrain === 'forest';
    const isMountain = tile?.terrain === 'mountain';
    const isRiver = tile?.terrain === 'water';
    const showTree = isForest && treeMap[y]?.[x];

    // Detectar si el tile es de tipo artefacto
    

    // Detectar si el tile es de tipo mina de oro (debe coincidir con visible_object en la misma casilla)
    

    // Detectar si el tile es de tipo mina de piedra (quarry)
    
    // Detectar si este es el primer héroe del jugador
    const isFirstPlayerHero =
      heroForRendering &&
      heroForRendering.id === gameState.player.heroes[0]?.id;


    // NUEVO: Lógica de prioridad para renderizado exclusivo
    // Prioridad: héroe > edificio > mina > artefacto > árbol > grass
    let renderHero = false, renderBuildingImg = false, shouldRenderMine = false, renderArtifact = false, renderTree = false;

    if (heroForRendering) {
      renderHero = true;
    } else if (building) {
      renderBuildingImg = true;
    } else if (mineAtPosition) {
      shouldRenderMine = true;
    } else if (artifact && artifact.type === 'artifact') {
      renderArtifact = true;
    } else if (tile?.terrain === 'forest' && treeMap[y]?.[x]) {
      renderTree = true;
    }
    // grass se renderiza siempre como fondo

    // Modificar onClick para respetar isReadOnly
    return (
      <div
        className={tileClasses}
        onClick={isReadOnly ? undefined : () => handleTileClick({ x, y })}
        title={isExploredOnly ? 'Territorio explorado (no visible actualmente)' : 
              (mineAtPosition ? 
                `Mina de ${mineAtPosition.resource_type}: +${mineAtPosition.resource_per_turn} por turno` : 
                (artifact ? `Artefacto: ${artifactName || artifactSubtype || 'Desconocido'}` : undefined))}
      >
         {/* Mostrar grass, forest o mountain SIEMPRE como fondo */}
        {!isExploredOnly && (isGrass || isForest) && (
          <img
            src={grassImagePath}
            alt="grass"
            className="tile-image"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              zIndex: 0
            }}
            onError={e => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        )}
        {!isExploredOnly && isRiver && (
          <img
            src={waterImagePath}
            alt="river"
            className="tile-image"
            style={{
              position: 'absolute',
              top: -10,
              left: -10,
              width: '150%',
              height: '150%',
              objectFit: 'cover',
              zIndex: 0
            }}
            onError={e => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        )}
        {!isExploredOnly && isMountain && (
          <>
            {/* Fondo grass debajo */}
            <img
              src={grassImagePath}
              alt="grass"
              className="tile-image"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                zIndex: 0
              }}
              onError={e => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            {/* Montaña encima, más pequeña y centrada */}
            <img
              src={mountainImagePath}
              alt="mountain"
              className="tile-image"
              style={{
                position: 'absolute',
                top: '16%',
                left: '16%',
                width: '68%',
                height: '68%',
                objectFit: 'contain',
                zIndex: 1,
                pointerEvents: 'none'
              }}
              onError={e => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </>
        )}
        {/* Solo mostrar árbol si no hay objeto de mayor prioridad */}
        {!isExploredOnly && renderTree && (
          <img
            src={treeImagePath}
            alt="tree"
            className="tile-tree"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              zIndex: 1,
              pointerEvents: 'none'
            }}
            onError={e => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        )}
        {/* Solo mostrar imagen de building si no hay héroe */}
        {!isExploredOnly && renderBuildingImg && (
          <img
            src={
              building && building.building_type === 'castle'
                ? castleImagePath
                : building && building.building_type === 'barracks'
                  ? barracksImagePath
                  : building && building.building_type === 'archery'
                    ? archeryImagePath
                    : building && building.building_type === 'knights_tower'
                      ? knightsTowerImagePath
                    : building && building.building_type === 'mage_tower'
                      ? mageTowerImagePath
                    : building && building.building_type === 'dragons_lair'
                      ? dragonsLairImagePath
                    : buildingImagePath
            }
            alt={
              building && building.building_type === 'castle'
                ? 'castle'
                : building && building.building_type === 'barracks'
                  ? 'barracks'
                  : building && building.building_type === 'archery'
                    ? 'archery'
                    : building && building.building_type === 'knights_tower'
                      ? 'knights_tower'
                      : building && building.building_type === 'mage_tower'
                        ? 'mage_tower'
                        : building && building.building_type === 'dragons_lair'
                          ? 'dragons_lair'
                          : 'building'
            }
            className={`tile-building 
              ${isCastleBuilding && isNearCastle ? 'castle-near-hero' : ''} 
              ${isBuildingInteractive ? 'interactive-building' : ''} 
              ${building && isBuildingInteractive ? `${building.building_type}-interactive` : ''}`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              zIndex: 2,
              pointerEvents: isBuildingInteractive ? 'auto' : 'none', // Permitir clics solo si es interactivo
              cursor: isBuildingInteractive ? 'pointer' : 'default'
            }}
            onClick={(e) => {
              if (isBuildingInteractive && building) {
                e.stopPropagation(); // Evitar que el clic se propague al tile
                console.log(`Clic en edificio de tipo ${building.building_type}, interactive=${isBuildingInteractive}, isNearRecruitingBuilding=${isNearRecruitingBuilding}`);
                onBuildingClick(building, city?.id || '');
              }
            }}
            onError={e => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        )}
        {/* Solo mostrar mina si no hay héroe ni edificio */}
        {!isExploredOnly && shouldRenderMine && mineAtPosition && (
          <div style={{ position: 'relative', width: '100%', height: '100%', zIndex: 3 }}>
            {renderMine(mineAtPosition)}
          </div>
        )}
        {/* Solo mostrar artefacto si no hay héroe, edificio ni mina */}
        {!isExploredOnly && renderArtifact && (
          <div 
            className={`artifact-sprite artifact-${artifactSubtype || 'unknown'}`}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <img
              src={artifactImagePath}
              alt="artifact"
              className="tile-artifact"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                zIndex: 2,
                pointerEvents: 'none'
              }}
              onError={e => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        )}
        {/* Solo mostrar héroe si está en este tile */}
        {!isExploredOnly && renderHero && (
          <img
            src={getHeroImage(heroForRendering!)}
            alt="hero"
            className="hero-sprite"
            style={{
              position: 'absolute',
              width: 42,
              height: 42,
              left: 0,
              top: 0,
              zIndex: 20,
              pointerEvents: 'auto'
            }}
            onClick={e => {
              if (isReadOnly) return;
              e.stopPropagation();
              if (heroForRendering) {
                onHeroClick(heroForRendering.id);
              }
            }}
            onError={e => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        )}
        {/* Renderizar cualquier overlay de building (iconos, etc) solo si building es el objeto principal */}
        {renderBuildingImg && building && renderBuildingOverlay(building, city?.id || '')}
      </div>
    );
  };

  // Actualizar renderBuilding para manejar áreas exploradas
  const renderBuilding = (building: Building, cityId: string, isExploredOnly = false) => {
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
      `building-${building.building_type}`,
      isExploredOnly ? 'explored-only' : '' // Add this class for explored-only buildings
    ].filter(Boolean).join(' ');

    const handleBuildingClick = () => {
      if (isInteractive) {
        onBuildingClick(building, cityId);
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

  // Determina la visibilidad de un tile específico
  const getTileVisibility = (x: number, y: number): TileVisibility => {
    const index = y * gameState.map.size.width + x;
    
    // Asegurarse de que el índice es válido
    if (index < 0 || index >= gameState.map.fog_of_war.length) {
      return TileVisibility.UNEXPLORED;
    }
    
    // Si el tile es actualmente visible (no está en la niebla)
    if (!gameState.map.fog_of_war[index]) {
      return TileVisibility.VISIBLE;
    }
    
    // Si el array de exploración existe y este tile ha sido explorado
    if (gameState.map.explored && gameState.map.explored[index]) {
      return TileVisibility.EXPLORED;
    }
    
    // Por defecto, no explorado
    return TileVisibility.UNEXPLORED;
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
        //console.log(`- ¿Índice válido? ${idx >= 0 y idx < gameState.map.tiles.length}`);
        
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

  // Nueva useEffect para asegurar que las minas se detectan y renderizan correctamente
  useEffect(() => {
    // Sincronizar minas con el renderizado
    if (gameState?.map?.visible_objects?.length > 0) {
      const minas = gameState.map.visible_objects.filter(obj => 
        obj.type === 'goldmine' || obj.type === 'sawmill' || obj.type === 'quarry' || 
        ('resource_type' in obj && ['gold', 'wood', 'stone'].includes(obj.resource_type as string))
      );
      
      if (minas.length > 0) {
        //console.log(`GameMap: Encontradas ${minas.length} minas para renderizar`);
        // Log detailed mine info
        minas.forEach((mina, index) => {
          //console.log(`GameMap: Mina ${index+1} - type=${mina.type}, resource_type=${'resource_type' in mina ? mina.resource_type : 'N/A'}, position=(${mina.position.x}, ${mina.position.y})`);
        });
      } else {
        //console.warn("GameMap: No se encontraron minas en visible_objects");
        // Log all visible objects to see what we're working with
        /*console.log("GameMap: Todos los visible_objects:", gameState.map.visible_objects.map(obj => ({
          id: obj.id,
          type: obj.type,
          hasResourceType: 'resource_type' in obj,
          position: obj.position
        }))); */
      }
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

  // Make the preventWheel handler more robust
  const preventWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Also block native scrolling that might happen outside the handler
    if (mapRef.current) {
      mapRef.current.scrollLeft = scrollLeft;
      mapRef.current.scrollTop = scrollTop;
    }
    
    return false;
  };

  return (
    <div 
      ref={mapRef}
      className={`game-map-wrapper ${isDragging ? 'dragging' : ''}`}
      onWheel={preventWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
      // Add this to prevent scrolling on touch devices
      onTouchMove={(e) => e.preventDefault()}
    >
      <div 
        className="game-map"
        style={{
          transform: `scale(${fixedZoom})`, // Keep fixed zoom
          transformOrigin: '0 0'
        }}
      >
        {grid}
        
        {/* REMOVE the separate mines rendering section that used absolute positioning */}
        {/* This entire section should be removed as mines are now rendered within their tiles */}
      </div>
    </div>
  );
});

const getHeroImage = (hero: Hero) => {
  // Puedes usar hero.id, hero.name, o una propiedad custom como hero.sprite
  switch (hero.id) {
    case 'player_hero_1':
      return '/assets/images/tiles/grass/knight.png';
    case 'ai_hero_1':
      return '/assets/images/tiles/grass/knight2.png';
    default:
      return '/assets/images/tiles/grass/knight.png';
  }
};

export default GameMap;