/*
* Página principal del juego
* Implementar:
* - Renderizado del mapa de juego
* - Panel de información del jugador
* - Controles de juego
* - Gestión de eventos del juego
*/

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GameState, Hero, Position, Building } from '../types/game';
import { useGame } from '../contexts/GameContext';
import GameMap from '../components/game/GameMap';
import GameControls from '../components/game/GameControls';
import ResourceBar from '../components/game/ResourceBar';
import HeroInfo from '../components/game/HeroInfo';
import AIViewModeSettings from '../components/game/AIViewModeSettings';
import AIThinkingIndicator from '../components/ui/AIThinkingIndicator';
import AIActionsSummary from '../components/game/AIActionsSummary';
import AIPlaybackControls from '../components/game/AIPlaybackControls';
import Button from '../components/ui/Button';
import BuildingConstructionMenu from '../components/game/BuildingConstructionMenu'; // Import the component from game folder
import RecruitmentMenu from '../components/game/RecruitmentMenu'; // Make sure this is imported too
import { gameService } from '../services/api';
import { executeAction, createEndTurnAction } from '../services/actionService';
import { syncArtifactsWithTiles, syncMinesWithTiles } from '../utils/gameMapUtils';
import { findPath, calculateMovementCost } from '../services/gameEngine';
import '../styles/pages/GamePage.css';

const GamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  
  // Add all the missing state variables
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [gameMessage, setGameMessage] = useState<string>('');
  const [selectedHero, setSelectedHero] = useState<Hero | null>(null);
  const [activeBuilding, setActiveBuilding] = useState<Building | null>(null);
  const [showConstructionMenu, setShowConstructionMenu] = useState<boolean>(false);
  const [movingHero, setMovingHero] = useState<{
    heroId: string;
    path: Position[];
    currentStep: number;
  } | null>(null);
  const [forceUpdate, setForceUpdate] = useState<Record<string, unknown>>({});
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [showRecruitmentMenu, setShowRecruitmentMenu] = useState<boolean>(false);
  // Add state for settings modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const { 
    selectHero, 
    moveHero, 
    endTurn, 
    aiViewMode, 
    setAiViewMode,
    aiThinking,
    showAiSummary,
    setShowAiSummary,
    aiActions,
    aiStrategicInfo,
    playbackSpeed,
    setPlaybackSpeed,
    skipAnimation
  } = useGame();
  
  // Estado local para UI
  const [showSettings, setShowSettings] = useState(false);
  
  // Cargar el estado del juego
  useEffect(() => {
    if (!gameId) return;
    
    const loadGame = async () => {
      try {
        console.log("Loading game with ID:", gameId);
        const response = await gameService.loadGame(gameId);
        console.log("Loaded game data:", response.data);
        
        // Asegurarse de que el estado del juego tiene la estructura correcta
        if (!response.data.game_state?.map) {
          throw new Error("Game state is missing map data");
        }
        
        // Log detallado de minas en visible_objects
        const minas = response.data.game_state.map.visible_objects?.filter((obj: any) => 
          obj.type === 'goldmine' || obj.type === 'sawmill' || obj.type === 'quarry' || 
          ('resource_type' in obj && ['gold', 'wood', 'stone'].includes(obj.resource_type))
        ) || [];
        
        console.log("Minas encontradas en visible_objects:", minas.map((m: any) => ({
          id: m.id,
          type: m.type,
          resource_type: m.resource_type,
          position: m.position,
          owner: m.owner
        })));
        
        // Sincronizar artefactos con tiles
        const syncedGameState = syncArtifactsWithTiles(response.data.game_state);
        
        // Sincronizar minas con tiles
        const { syncMinesWithTiles } = await import('../utils/gameMapUtils');
        const fullySyncedGameState = syncMinesWithTiles(syncedGameState);
        
        setGameState(fullySyncedGameState);
        setGameMessage(`¡Partida cargada! Turno ${response.data.game_state.turn}`);
      } catch (err) {
        console.error("Error loading game:", err);
        setError('Error al cargar la partida');
      } finally {
        setLoading(false);
      }
    };
    
    loadGame();
  }, [gameId]);
  
  // Comprobar si es el turno del jugador
  const isPlayerTurnValue = gameState?.current_player === 'player';
  
  // Obtener recursos del jugador actual con validación
  const getCurrentPlayerResources = () => {
    if (!gameState || !gameState.player || !gameState.ai) {
      return { gold: 0, wood: 0, stone: 0 };
    }
    return gameState.current_player === 'player' ? 
      gameState.player.resources : 
      gameState.ai.resources;
  };
  
  // Obtener héroes del jugador actual
  const getCurrentPlayerHeroes = () => {
    if (!gameState) return [];
    return gameState.current_player === 'player' ? 
      gameState.player.heroes : 
      gameState.ai.heroes;
  };
  
  // Add a utility function for updating game state
  const updateGameState = (newState: GameState) => {
    setGameState(newState);
  };
  
  // Manejar movimiento de héroe
  const handleHeroMovement = (heroId: string, path: Position[]): Promise<void> => {
    if (!path || path.length < 2) return Promise.resolve();  
    setMovingHero({
      heroId,
      path,
      currentStep: 0
    });

    // Return a Promise that resolves when animation completes
    return new Promise<void>((resolve) => {
      const animateMovement = async () => {
        for (let i = 0; i < path.length; i++) {

          
          await new Promise(stepResolve => setTimeout(stepResolve, 200));
          setGameState((prev: GameState | null) => {
            if (!prev) return prev;
            const newState = { ...prev };
            const hero = newState.player.heroes.find((h: Hero) => h.id === heroId);
            if (hero) {
              hero.position = path[i];
            } else {
              // Log a warning if hero not found - fixes empty block statement ESLint error
              console.warn(`Hero with ID ${heroId} not found in game state during animation`);
            }
            return newState;
          });
        }
        setMovingHero(null);
        setGameMessage("Movimiento completado");
        resolve(); // Resolve the promise when animation is complete
      };

      animateMovement();
    });
  };

  const handleMoveHero = async (heroId: string, destination: Position) => {
    try {
      if (!gameId || !gameState) return;

      const response = await gameService.executeAction(gameId, {
        type: 'moveHero',
        details: {
          hero_id: heroId,
          destination: {
            x: Math.floor(destination.x), // Asegurar que son enteros
            y: Math.floor(destination.y)
          }
        }
      });

      if (response.data?.success) {
        const newPosition = response.data.result.new_position;
        
        // Verificar y forzar la posición si es necesario
        if (destination.x === 48 && destination.y === 48) {
          console.log('GamePage: Verifying castle position update...');
          const updatedGameState = { ...gameState };
          const hero = updatedGameState.player.heroes.find(h => h.id === heroId);
          if (hero) {
            hero.position = newPosition;
            setGameState(updatedGameState);
          }
        }
        
        if (response.data.game_state) {
          updateGameState(response.data.game_state);
        }
      }
    } catch (error) {
      console.error('Error moving hero:', error);
    }
  };

  // Modificar handleTileClick para manejar interacción con minas
  const handleTileClick = async (position: Position) => {
    if (!gameState || !gameId || !selectedHero) {
      console.warn('GamePage: handleTileClick - Missing gameState, gameId, or selectedHero.');
      return;
    }

    // Prevent movement if it's not the player's turn
    if (!isPlayerTurnValue) {
      setGameMessage("No es tu turno.");
      console.log("GamePage: Not player's turn, movement blocked.");
      return;
    }
    
    // Prevent movement if hero has no movement points left
    if (selectedHero.stats.movement_points_left <= 0) {
      setGameMessage("El héroe no tiene puntos de movimiento.");
      console.log(`GamePage: Hero ${selectedHero.id} has no movement points left.`);
      return;
    }

    console.log(`GamePage: Attempting to move hero ${selectedHero.id} from: (${selectedHero.position.x},${selectedHero.position.y}) to: (${position.x},${position.y})`);

    const action = {
      type: "moveHero",
      details: {
        hero_id: selectedHero.id,
        destination: {
          x: Math.floor(position.x), // Asegurarnos que son enteros
          y: Math.floor(position.y)
        }
      }
    };

    try {
      // First, send the action to the backend WITHOUT animating
      setGameMessage("Calculando movimiento...");
      const response = await gameService.executeAction(gameId, action);
      console.log('GamePage: Backend response from moveHero action:', response.data);      
      
      // Check if movement was successful - UPDATED CONDITION
      if (response.data?.status === 'success') {
        const result = response.data.result;
        
        // Only now animate the movement if we have a valid path or new position
        if (result && result.new_position) {
          // Create a complete path with intermediate steps
          const startPosition = { ...selectedHero.position };
          const endPosition = { x: result.new_position.x, y: result.new_position.y };
      
          
          // Convert map to 2D for pathfinding
          const map2D = convertMapTo2D(gameState.map);
          
          // Generate full path with all intermediate positions
          const fullPath = findPath(startPosition, endPosition, map2D);
    
          
          // Use the full path or fallback to direct path if pathfinding fails
          const pathToUse = fullPath.length > 0 ? fullPath : [startPosition, endPosition];
          
          // Debug: Mostrar el path completo para verificar el cálculo correcto del camino
          console.log(`🛣️ PATH COMPLETO CALCULADO (${fullPath.length} pasos):`, 
            fullPath.map(pos => `(${pos.x},${pos.y})`).join(' → '));
          
          setGameMessage(`Héroe en movimiento...`);
          
          // Animate the movement with the complete path and WAIT for it to finish
          // before updating the game state
          handleHeroMovement(selectedHero.id, pathToUse).then(() => {
  
            
            // After animation completes (or immediately if no animation), update the game state
            if (response.data && response.data.game_state) {
              const updatedGameState: GameState = response.data.game_state;
              // Forzar que la posición de todos los héroes sea un objeto plano {x:number, y:number}
              updatedGameState.player.heroes.forEach(h => {
                if (typeof h.position.x !== 'number') h.position.x = Number(h.position.x);
                if (typeof h.position.y !== 'number') h.position.y = Number(h.position.y);
              });
              
              // Update game state after animation completes
              setGameState(updatedGameState);
              
              const movedHero = updatedGameState.player.heroes.find(
                (h: Hero) => h.id === selectedHero.id
              );

              if (movedHero) {
                
                // Verify position was updated correctly
                if (movedHero.position.x !== position.x || movedHero.position.y !== position.y) {
                  console.warn(`GamePage: Position mismatch detected. Forcing hero position to match target: (${position.x},${position.y})`);
                  // Force hero position update
                  movedHero.position.x = position.x;
                  movedHero.position.y = position.y;
                  
                  // Update game state with corrected position
                  setGameState({...updatedGameState});
                }
                
                setSelectedHero(movedHero); // IMPORTANT: Update selectedHero with the new data
                
                // Special handling for castle position (48,48)
                if (movedHero.position.x === 48 && movedHero.position.y === 48) {
                  console.log('GamePage: ¡HÉROE EN POSICIÓN DEL CASTILLO CENTRAL (48,48)!');
                  
                  // Find all buildings at position (48,48)
                  const buildingsAt4848 = updatedGameState.player.cities
                    .flatMap(city => city.buildings)
                    .filter(b => b.position.x === 48 && b.position.y === 48);
                    
                  
                  const castleBuilding = updatedGameState.player.cities
                    .flatMap(city => city.buildings)
                    .find(b => b.is_castle && b.position.x === 48 && b.position.y === 48);
                  
                  // If there's a defined castle, use it
                  if (castleBuilding) {
                    console.log('GamePage: Castle building found, opening ConstructionMenu.');
                    setGameMessage('¡Has llegado al castillo central!');
                    setActiveBuilding(castleBuilding);
                    setShowConstructionMenu(true);
                  } 
                  // If no castle but other buildings at (48,48), use the first one
                  else if (buildingsAt4848.length > 0) {
                    const anyBuilding = buildingsAt4848[0];
                    console.log('GamePage: Using alternative building at (48,48):', anyBuilding);
                    // Force building as castle to open construction menu
                    anyBuilding.is_castle = true;
                    setActiveBuilding(anyBuilding);
                    setShowConstructionMenu(true);
                    setGameMessage('¡Has llegado al castillo central!');
                  } 
                  // If no buildings at (48,48), create a temporary one to show menu
                  else {
                    console.log('GamePage: No buildings found at (48,48), creating a temporary one');
                    const temporaryCastle = {
                      id: "temp_castle",
                      name: "Castillo Central",
                      position: { x: 48, y: 48 },
                      is_castle: true,
                      can_recruit: false,
                      built: true,
                      cost: { gold: 0, wood: 0, stone: 0 },
                      has_tavern: false,
                      building_type: 'castle',
                      requirements: [],
                      available_creatures: [],
                      owner: "player"
                    } as Building;
                    setActiveBuilding(temporaryCastle);
                    setShowConstructionMenu(true);
                    setGameMessage('¡Has llegado al castillo central!');
                  }
                }
              } else {
                console.error('GamePage: Moved hero not found in updated game state from backend. This is unexpected.');
                const currentHeroInOldState = gameState.player.heroes.find(h => h.id === selectedHero.id);
                if (currentHeroInOldState) setSelectedHero(currentHeroInOldState);
              }
            }
          });
        }
        
        // Check for artifact collection in the response
        if (response.data) {
          console.log("GamePage: Complete response data:", JSON.stringify(response.data, null, 2));
          console.log("GamePage: response.data.result =", response.data.result);
          console.log("GamePage: response.data.result?.interaction =", response.data.result?.interaction);
          
          // Revisar si la estructura de respuesta tiene interaction
          if (response.data?.result?.interaction === 'artifact_collected') {
            const artifactName = response.data.result.artifact;
            console.log(`GamePage: ✅ ARTIFACT COLLECTED! Name: ${artifactName}`);
            setGameMessage(`¡Has recogido el artefacto: ${artifactName}!`);
            
            // Debug the hero's artifacts to confirm the update
            if (response.data.game_state && response.data.game_state.player && response.data.game_state.player.heroes) {
              const heroWithArtifact = response.data.game_state.player.heroes.find(
                (h: any) => h.id === selectedHero.id
              );
              
              if (heroWithArtifact) {
                console.log("GamePage: Hero artifacts after collection:", heroWithArtifact.artifacts);
              }
            }
            
            // Actualizar el estado para reflejar inmediatamente el artefacto recogido
            if (response.data.game_state) {
              console.log("GamePage: Updating game state after artifact collection");
              const updatedGameState = syncArtifactsWithTiles(response.data.game_state);
              setGameState(updatedGameState);
            }
          } else if (response.data?.result?.interaction) {
            console.log(`GamePage: Got interaction "${response.data.result.interaction}" but not artifact_collected`);
          }
        }

        // Check for mine capture in the response
        if (response.data?.result?.interaction === 'resource_site_captured') {
          const interaction = response.data.result;
          const resourceType = interaction.resource_type || 'unknown';
          const resourcePerTurn = interaction.resource_per_turn || 0;
          
          // Mensaje formateado con el tipo de recurso y la cantidad
          const resourceName = resourceType.charAt(0).toUpperCase() + resourceType.slice(1);
          const captureMessage = `¡Has capturado una mina de ${resourceName}! +${resourcePerTurn} por turno`;
          
          console.log(`GamePage: Mine capture detected! ${captureMessage}`);
          setGameMessage(captureMessage);
          
          // Marcar la mina como recién capturada para la animación
          if (gameState?.map?.visible_objects) {
            const mine = gameState.map.visible_objects.find(obj => 
              obj.position && 
              obj.position.x === position.x && 
              obj.position.y === position.y &&
              'resource_type' in obj && obj.resource_type === resourceType
            );
            
            if (mine) {
              // Añadir propiedad para la animación
              mine.justCaptured = true;
              
              // Reproducir sonido de captura (opcional)
              const captureSound = new Audio('/sounds/resource-capture.mp3');
              captureSound.volume = 0.3;
              captureSound.play().catch(() => console.log('Sound play failed'));
              
              // Quitar la propiedad después de la animación
              setTimeout(() => {
                if (mine) {
                  mine.justCaptured = false;
                  setForceUpdate({}); // Forzar actualización del componente
                }
              }, 1500);
            }
          }
        }
      } else {
        console.error('GamePage: Failed to move hero:', response.data?.error || 'Unknown error');
        setGameMessage(response.data?.error || "Error al mover el héroe");
        
        // Keep existing check for artifact collection in the error case
        if (response.data?.interaction?.interaction === 'artifact_collected') {
          console.log(`GamePage: Artifact collected in error case:`, response.data.interaction);
          setGameMessage(`¡Has recogido el artefacto: ${response.data.interaction.artifact}!`);
        }
      }
    } catch (err: any) {
      console.error("GamePage: Exception during hero movement:", err);
      setGameMessage("Error crítico al mover el héroe");
    }
  };

  // Añadir este método a tu componente
  const getCurrentPlayerResourcesInfo = () => {
    if (!gameState || !gameState.player || !gameState.ai) {
      return { 
        resources: { gold: 0, wood: 0, stone: 0 },
        income: { gold: 0, wood: 0, stone: 0 }
      };
    }
    
    const resources = gameState.current_player === 'player' ? 
      gameState.player.resources : 
      gameState.ai.resources;
      
    // Calcular ingresos por turno basado en las minas capturadas
    const income = { gold: 0, wood: 0, stone: 0 };
    
    if (gameState.map?.visible_objects) {
      const currentOwner = gameState.current_player;
      
      gameState.map.visible_objects.forEach(obj => {
        if (obj.owner === currentOwner && 'resource_type' in obj && 'resource_per_turn' in obj) {
          const resourceType = obj.resource_type as keyof typeof income;
          if (resourceType in income) {
            income[resourceType] += obj.resource_per_turn as number;
          }
        }
      });
    }
    
    return { resources, income };
  };

  // Manejar click en un héroe
  const handleHeroClick = (heroId: string) => {
    if (!gameState) return;
    
    // Deseleccionar héroe si ya está seleccionado
    if (selectedHero && selectedHero.id === heroId) {
      setSelectedHero(null);
      setGameMessage('Héroe deseleccionado');
      return;
    }

    const hero = gameState.player.heroes.find(h => h.id === heroId);
    if (!hero) return;
    
    setSelectedHero(hero);
    setGameMessage(`Héroe ${hero.name} seleccionado`);
  };
  
  // Manejar click en una ciudad
  const handleCityClick = (cityId: string) => {
    if (!gameState) return;
    
    const city = [...gameState.player.cities, ...gameState.ai.cities]
      .find(c => c.id === cityId);
    
    if (!city) return;
    
    navigate(`/city/${cityId}?gameId=${gameId}`);
  };

  // Manejar click en un edificio
  const handleBuildingClick = (building: Building, cityId: string) => {
    console.log('GamePage: Building clicked:', building, 'Selected hero position:', selectedHero?.position);
    
    // Asegurar que el building tiene todas las propiedades necesarias
    const safeBuilding = {
      ...building,
      // Asegurar que estas propiedades siempre existan
      cost: building.cost || { gold: 0, wood: 0, stone: 0 },
      available_creatures: building.available_creatures || [],
      name: building.name || 'Edificio',
      building_type: building.building_type || 'unknown',
      requirements: building.requirements || []
    };
    
    setSelectedBuilding(safeBuilding); // Keep this for showing building info if needed

    if (!selectedHero) {
      console.log('GamePage: No hero selected, cannot open building menus via building click.');
      return;
    }

    // Calcular la distancia entre el héroe y el edificio
    const calculateDistance = (pos1: Position, pos2: Position): number => {
      // Asegurar que las posiciones son números
      const x1 = Number(pos1.x);
      const y1 = Number(pos1.y);
      const x2 = Number(pos2.x);
      const y2 = Number(pos2.y);
      return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    };

    // CRUCIAL: Usar SIEMPRE la posición real del héroe desde el estado
    const heroPosition = selectedHero.position;
    const distance = calculateDistance(heroPosition, safeBuilding.position);
    
    // Información de depuración detallada
    console.log(`GamePage: VERIFICACIÓN REAL DE DISTANCIA: Héroe en (${heroPosition.x}, ${heroPosition.y}), ` +
               `Edificio en (${safeBuilding.position.x}, ${safeBuilding.position.y}), ` +
               `Distancia: ${distance.toFixed(2)}`);
    
    const heroAtSamePosition = heroPosition.x === safeBuilding.position.x && 
                               heroPosition.y === safeBuilding.position.y;

    // También considerar posición (48,48) explícitamente para el castillo
    const buildingIsAt4848 = safeBuilding.position.x === 48 && safeBuilding.position.y === 48;

    // Comprobar si es un castillo
    const isCastleBuilding = safeBuilding.is_castle || buildingIsAt4848;

    // Comprobar si el héroe está a 2 o menos casillas del edificio
    const isNearBuilding = distance <= 2;
    
    // Verificar si el jugador es dueño del edificio
    const isPlayerOwned = safeBuilding.owner === 'player';

    console.log('GamePage: ¿ESTÁ CERCA DEL EDIFICIO?', {
      isNearBuilding,
      isCastleBuilding,
      distance,
      maxDistanceAllowed: 2,
      heroPosition: `(${heroPosition.x}, ${heroPosition.y})`,
      buildingPosition: `(${safeBuilding.position.x}, ${safeBuilding.position.y})`,
      isPlayerOwned,
      built: safeBuilding.built,
      can_recruit: safeBuilding.can_recruit
    });

    // Simplificar la lógica: Si es un castillo o es un edificio que puede reclutar
    if (isNearBuilding || heroAtSamePosition) {
      if (isCastleBuilding) {
        console.log('GamePage: ✅ ABRIENDO MENÚ DE CONSTRUCCIÓN. Distancia al castillo:', distance.toFixed(2));
        // Si el edificio está en (48,48), siempre tratarlo como castillo
        if (buildingIsAt4848 && !safeBuilding.is_castle) {
          console.log('GamePage: Edificio en (48,48) tratado como castillo independientemente de su propiedad is_castle');
          safeBuilding.is_castle = true;
          
          // Asegurarnos que tiene cost para el menú de construcción
          if (!safeBuilding.cost) {
            safeBuilding.cost = { gold: 0, wood: 0, stone: 0 };
          }
        }
        
        // Completar datos faltantes para el castillo antes de mostrar el menú
        if (!safeBuilding.available_creatures) {
          safeBuilding.available_creatures = [];
        }
        
        setActiveBuilding(safeBuilding);
        setShowConstructionMenu(true);
        setGameMessage(heroAtSamePosition ? 
          '¡Has llegado al castillo central!' : 
          '¡Puedes construir edificios en el castillo cercano!');
      } 
      // Lógica corregida para edificios de reclutamiento
      else if (safeBuilding.built && safeBuilding.can_recruit && isPlayerOwned) {
        console.log('GamePage: ✅ ABRIENDO MENÚ DE RECLUTAMIENTO. Héroe cerca de edificio reclutable.');
        setActiveBuilding(safeBuilding);
        setShowRecruitmentMenu(true);
        setGameMessage(`¡Puedes reclutar unidades en ${safeBuilding.name}!`);
      } else {
        console.log('GamePage: ❌ NO SE ABRIRÁ MENÚ: Condiciones no cumplidas:', 
                  { heroAtSamePosition, isNearBuilding, isCastleBuilding, isBuilt: safeBuilding.built, 
                    canRecruit: safeBuilding.can_recruit, distance, isPlayerOwned });
        
        // Mostrar mensaje relevante según la causa
        if (!isPlayerOwned && safeBuilding.built) {
          setGameMessage('Este edificio no te pertenece.');
        } else if (!safeBuilding.built) {
          setGameMessage('Este edificio aún no está construido.');
        } else if (!safeBuilding.can_recruit) {
          setGameMessage('Este edificio no permite reclutar unidades.');
        } else {
          setGameMessage('No es posible interactuar con este edificio.');
        }
      }
    } else {
      setGameMessage('Debes acercarte más al edificio para interactuar con él.');
    }
  };

  const handleHeroInBuilding = (building: Building) => {
    // Siempre considerar cualquier edificio en (48,48) como castillo
    const isCastleBuilding = building.is_castle || 
                         (building.position.x === 48 && building.position.y === 48);
    
    // Verificar si el jugador es dueño del edificio
    const isPlayerOwned = building.owner === 'player';
    
    console.log('GamePage: Checking building for auto-action:', 
                { buildingPos: building.position, isCastle: building.is_castle, 
                  isCastleBuilding, isPlayerOwned });
                
    if (isCastleBuilding) {
      console.log('GamePage: Castle detected in handleHeroInBuilding, opening construction menu');
      // Asegurar que se trate como castillo para la interfaz de usuario
      if (!building.is_castle && building.position.x === 48 && building.position.y === 48) {
        building.is_castle = true;
        console.log('GamePage: Forced building at (48,48) to be recognized as a castle');
      }
      setActiveBuilding(building);
      setShowConstructionMenu(true);
      setGameMessage('¡Has llegado al castillo central!');
    } else if (building.built && building.can_recruit && isPlayerOwned) {
      // Solo abrir menú de reclutamiento si el edificio pertenece al jugador
      console.log('GamePage: Recruitment building detected, opening recruitment menu');
      setActiveBuilding(building);
      setShowRecruitmentMenu(true);
      setGameMessage(`¡Has llegado a ${building.name}!`);
    }
  };

  const handleRecruit = async (unitType: string, amount: number) => {
    if (!gameId || !activeBuilding) return;

    try {
      console.log(`GamePage: Attempting to recruit ${amount} units of type ${unitType}`);
      
      // Mapeo correcto de tipo de edificio a ID de ciudad
      const buildingTypeToCityId: { [key: string]: string } = {
        barracks: "barracks_city",
        archery: "archery_city",
        knights_tower: "knights_city",
        mage_tower: "mage_city",
        dragons_lair: "dragon_city",
        castle: "central_city"
      };
      
      // Determinar la cityId correcta
      let cityId = "central_city"; // valor por defecto
      
      if (activeBuilding.building_type && buildingTypeToCityId[activeBuilding.building_type]) {
        cityId = buildingTypeToCityId[activeBuilding.building_type];
      } else if (activeBuilding.is_castle) {
        cityId = "central_city";
      }
      
      console.log(`GamePage: Recruiting in city: ${cityId}, for building type: ${activeBuilding.building_type}`);
      
      const recruitAction = {
        type: 'recruitUnits',
        details: {
          buildingId: activeBuilding.id,
          cityId: cityId, // Usar el ID de ciudad correcto
          unitType,
          count: amount,
          heroId: selectedHero?.id
        }
      };
      
      console.log('GamePage: Recruitment action:', recruitAction);
      
      const response = await gameService.executeAction(gameId, recruitAction);
      console.log('GamePage: Recruitment response:', response);
      
      if (response.data?.success === false) {
        setGameMessage(`Error al reclutar: ${response.data.error || 'Error desconocido'}`);
        return;
      }
      
      setShowRecruitmentMenu(false);
      setGameMessage(`Has reclutado ${amount} ${unitType}`);
      
      // Recargar el estado del juego
      const gameResponse = await gameService.loadGame(gameId);
      setGameState(gameResponse.data.game_state);
      
      // Actualizar el héroe seleccionado si existe
      if (selectedHero && gameResponse.data.game_state.player.heroes) {
        const updatedHero = gameResponse.data.game_state.player.heroes.find(
          (h: Hero) => h.id === selectedHero.id
        );
        if (updatedHero) {
          setSelectedHero(updatedHero);
        }
      }
    } catch (error) {
      console.error('Error recruiting units:', error);
      setGameMessage('Error al reclutar unidades. Inténtalo de nuevo.');
    }
  };

  const handleConstructBuilding = async (buildingType: string) => {
    if (!gameId || !activeBuilding || !gameState) return;

    try {
      // Corregir el mapeo de edificios a ciudades
      const buildingToCityId: { [key: string]: string } = {
        barracks: "barracks_city",
        archery: "archery_city",
        knights_tower: "knights_city",
        mage_tower: "mage_city",
        dragons_lair: "dragon_city"
      };

      // Fix TypeScript linting error by removing explicit type annotation
      // TypeScript can infer the type from the string literal assignment
      let cityId = buildingToCityId[buildingType] || "central_city";
      
      // Para el castillo central, siempre usar "central_city"
      const isCentralCastle = activeBuilding.position.x === 48 && activeBuilding.position.y === 48;
      
      if (isCentralCastle) {
        cityId = "central_city";
        console.log(`Usando ciudad central para construcción en castillo principal (48,48)`);
      } else if (activeBuilding && activeBuilding.position) {
        // For other buildings, look for the city that contains the building
        const cityWithBuilding = gameState.player.cities.find(city => 
          city.buildings.some(b => 
            b.position.x === activeBuilding.position.x && 
            b.position.y === activeBuilding.position.y
          )
        );
        
        if (cityWithBuilding) {
          cityId = cityWithBuilding.id;
          console.log(`Usando ciudad existente para construcción: ${cityId}`);
        } else {
          console.log(`No se encontró ciudad para el edificio activo, usando central_city`);
        }
      }
      
      // OPTIONAL: Optimistically update resources in UI before server response
      const buildingConfigs = {
        barracks: { cost: { gold: 1000, wood: 50, stone: 50 } },
        archery: { cost: { gold: 1200, wood: 70, stone: 30 } },
        knights_tower: { cost: { gold: 1500, wood: 100, stone: 100 } },
        mage_tower: { cost: { gold: 2000, wood: 100, stone: 100 } },
        dragons_lair: { cost: { gold: 5000, wood: 200, stone: 200 } }
      };
      
      const buildingCost = buildingConfigs[buildingType as keyof typeof buildingConfigs]?.cost;
      
      if (buildingCost && gameState.current_player === 'player') {
        const updatedGameState = { ...gameState };
        updatedGameState.player = { 
          ...updatedGameState.player,
          resources: {
            gold: Math.max(0, updatedGameState.player.resources.gold - buildingCost.gold),
            wood: Math.max(0, updatedGameState.player.resources.wood - buildingCost.wood),
            stone: Math.max(0, updatedGameState.player.resources.stone - buildingCost.stone)
          }
        };
        console.log('Optimistically updating resources before server response:', updatedGameState.player.resources);
        setGameState(updatedGameState);
      }
      
      const action = {
        type: "buildStructure",
        details: {
          structureType: buildingType,
          cityId: cityId
        }
      };

      console.log('Sending build action:', action);
      
      const response = await gameService.executeAction(gameId, action);
      console.log("Build response:", response.data);
      
      if (response.data?.game_state) {
        console.log('New resources after server response:', response.data.game_state.player.resources);
        // CRITICAL: Use server-side state to ensure data consistency
        setGameState(response.data.game_state);
        setShowConstructionMenu(false);
        setGameMessage(`${buildingType} construido con éxito`);
      } else if (response.data?.success === false) {
        // Handle errors from the server
        setGameMessage(`Error: ${response.data.error || "Error desconocido"}`);
        
        // If there was an error, reload the game state to get correct resources
        const refreshResponse = await gameService.loadGame(gameId);
        if (refreshResponse.data?.game_state) {
          setGameState(refreshResponse.data.game_state);
        }
      } else if (response.data?.success) {
        // If there's success but no game_state, reload the game
        console.log("Construction successful but no game state received. Reloading state...");
        const refreshResponse = await gameService.loadGame(gameId);
        if (refreshResponse.data?.game_state) {
          setGameState(refreshResponse.data.game_state);
          setShowConstructionMenu(false);
          setGameMessage(`${buildingType} construido con éxito`);
        }
      }
    } catch (error: any) {
      console.error('Error building structure:', error);
      setGameMessage(`Error: ${error?.response?.data?.detail || error.message || "Error desconocido"}`);
      
      // Reload the game state to ensure UI consistency
      try {
        const refreshResponse = await gameService.loadGame(gameId);
        if (refreshResponse.data?.game_state) {
          setGameState(refreshResponse.data.game_state);
        }
      } catch (refreshError) {
        console.error('Error reloading game state after build error:', refreshError);
      }
    }
  };

  // Finalizar turno
  const handleEndTurn = async () => {
    if (!gameState || !isPlayerTurnValue || !gameId) return;
    
    try {
      const action = createEndTurnAction();
      const response = await executeAction(gameId, action);
      
      setGameState(response.data.game_state);
      setSelectedHero(null);
      
      // Usar la estructura correcta del estado del juego
      if (response.data.game_state.current_player === 'ai') {
        setGameMessage('Turno finalizado. Ahora es el turno de la IA');
      } else {
        setGameMessage('Turno finalizado. Es tu turno');
      }
    } catch (err: any) {
      setGameMessage(err.response?.data?.detail || 'Error al finalizar turno');
    }
  };
    // Guardar partida
  const handleSaveGame = async () => {
    if (!gameState || !gameId) {
        setGameMessage('No hay partida para guardar');
        return;
    }
    
    try {
        setLoading(true);
        const response = await gameService.saveGame(gameId, gameState);
        setGameMessage('Partida guardada correctamente');
        
        // Optional: Refresh game state after saving
        const updatedGame = await gameService.loadGame(gameId);
        if (updatedGame.data?.game_state) {
            setGameState(updatedGame.data.game_state);
        }
    } catch (err: any) {
        console.error("Error saving game:", err);
        setGameMessage(err.message || 'Error al guardar la partida');
    } finally {
        setLoading(false);
    }
  };

  // Convertir el mapa a formato 2D para el pathfinding
  const convertMapTo2D = (gameMap: any) => {
    const mapWidth = gameMap.size.width;
    const mapHeight = gameMap.size.height;
    
    // Verificación y logging extensivo para depuración
    console.log(`[MapConversion] Convirtiendo mapa de ${mapWidth}x${mapHeight} con ${gameMap.tiles.length} tiles`);
    
    // Validar que las dimensiones sean correctas
    if (!mapWidth || !mapHeight || mapWidth <= 0 || mapHeight <= 0) {
      console.error(`[MapConversion] ERROR: Dimensiones de mapa inválidas: ${mapWidth}x${mapHeight}`);
      return []; // Devolver un array vacío para evitar errores posteriores
    }
    
    // Verificar que tiles sea un array válido
    if (!Array.isArray(gameMap.tiles) || gameMap.tiles.length === 0) {
      console.error(`[MapConversion] ERROR: No hay tiles en el mapa`);
      return [];
    }
    
    const tiles2D: any[][] = [];
    
    // Generar el mapa 2D fila por fila
    for (let y = 0; y < mapHeight; y++) {
      const row: any[] = [];
      
      for (let x = 0; x < mapWidth; x++) {
        const index = y * mapWidth + x;
        
        // Verificar si estamos dentro de los límites del array de tiles
        if (index < gameMap.tiles.length) {
          // Añadir el tile a la fila actual
          const tile = gameMap.tiles[index];
          row.push(tile);
        } else {
          // Si el índice está fuera de límites, añadir un tile "default" para evitar filas vacías
          // Este es un caso que no debería ocurrir con datos correctos
          console.warn(`[MapConversion] ADVERTENCIA: Índice fuera de límites ${index} para tile en (${x},${y})`);
          row.push({ terrain: 'grass', passable: true });
        }
      }
      
      // Solo añadir la fila si tiene elementos (para evitar filas vacías)
      if (row.length > 0) {
        tiles2D.push(row);
      } else {
        console.warn(`[MapConversion] ADVERTENCIA: La fila ${y} está vacía`);
      }
    }
    
    // Verificación final de la matriz generada
    console.log(`[MapConversion] Matriz generada: ${tiles2D.length} filas x ${tiles2D[0]?.length || 0} columnas`);
    
    return tiles2D;
  };

  // Determinar si es el turno del jugador actual
  const isPlayerTurn = gameState?.current_player === 'player';

  // Handler para cambio de modo de visualización de la IA
  const handleAIViewModeChange = (mode: string) => {
    setAiViewMode(mode as any);
  };

  // Mostrar panel de configuración de visualización
  const toggleSettingsPanel = () => {
    setShowSettings(!showSettings);
  };

  // Add the missing handler functions
  const handleOpenMenu = () => {
    if (window.confirm('¿Estás seguro que deseas salir al menú principal? Todo el progreso no guardado se perderá.')) {
      navigate('/menu');
    }
  };

  const handleOpenSettings = () => {
    // Open settings modal
    setShowSettingsModal(true);
  };

  if (loading) {
    return <div className="loading-screen">Cargando partida...</div>;
  }
  
  if (error || !gameState) {
    return <div className="error-screen">
      {error || 'Error desconocido al cargar la partida'}
      <Button onClick={() => navigate('/menu')}>Volver al menú</Button>
    </div>;
  }

  return (
    <div className={`game-page ${aiViewMode !== 'normal' ? `ai-view-mode-${aiViewMode}` : ''}`}>
      <div className="game-header">
        <ResourceBar resources={getCurrentPlayerResources()} />
      </div>
      
      <div className="game-content">
        <div className="game-map-container">
          {/* Existing map component */}
          {gameState && (
            <GameMap 
              gameState={gameState}
              selectedHeroId={selectedHero?.id}
              onHeroClick={handleHeroClick}
              onCityClick={handleCityClick}
              onTileClick={handleTileClick}
              onBuildingClick={handleBuildingClick}
              isPlayerTurn={isPlayerTurnValue}
            />
          )}
        </div>
        
        {/* Sidebar content */}
        {/* ...existing code... */}
      </div>
      
      <div className="game-controls-container">
        <GameControls 
          turn={gameState?.turn || 1}
          currentPlayer={gameState?.current_player || 'player'}
          gameMessage={gameMessage}
          onEndTurn={handleEndTurn}
          onSaveGame={handleSaveGame}
          onOpenMenu={handleOpenMenu}
          isPlayerTurn={isPlayerTurnValue}
          onOpenSettings={handleOpenSettings}
        />
      </div>
      
      {/* Add conditional rendering for BuildingConstructionMenu */}
      {showConstructionMenu && activeBuilding && (
        <BuildingConstructionMenu
          availableBuildings={[
            { 
              id: 'barracks',
              name: 'Cuartel',
              building_type: 'barracks',
              position: activeBuilding.position,
              cost: { gold: 1000, wood: 50, stone: 50 },
              built: false,
              can_recruit: true,
              is_castle: false,
              has_tavern: false,
              requirements: [],
              available_creatures: [],
              owner: null
            },
            {
              id: 'archery',
              name: 'Campo de Tiro',
              building_type: 'archery',
              position: activeBuilding.position,
              cost: { gold: 1200, wood: 70, stone: 30 },
              built: false,
              can_recruit: true,
              is_castle: false,
              has_tavern: false,
              requirements: [],
              available_creatures: [],
              owner: null
            },
            {
              id: 'knights_tower',
              name: 'Torre de Caballeros',
              building_type: 'knights_tower',
              position: activeBuilding.position,
              cost: { gold: 1500, wood: 100, stone: 100 },
              built: false,
              can_recruit: true,
              is_castle: false,
              has_tavern: false,
              requirements: [],
              available_creatures: [],
              owner: null
            },
            {
              id: 'mage_tower',
              name: 'Torre de Magos',
              building_type: 'mage_tower',
              position: activeBuilding.position,
              cost: { gold: 2000, wood: 100, stone: 100 },
              built: false,
              can_recruit: true,
              is_castle: false,
              has_tavern: false,
              requirements: [],
              available_creatures: [],
              owner: null
            },
            {
              id: 'dragons_lair',
              name: 'Guarida de Dragones',
              building_type: 'dragons_lair',
              position: activeBuilding.position,
              cost: { gold: 5000, wood: 200, stone: 200 },
              built: false,
              can_recruit: true,
              is_castle: false,
              has_tavern: false,
              requirements: [],
              available_creatures: [],
              owner: null
            }
          ]}
          onBuild={handleConstructBuilding}
          onClose={() => setShowConstructionMenu(false)}
          playerResources={getCurrentPlayerResources()}
          gameState={gameState}
        />
      )}

      {/* This section also needs to be preserved for the recruitment menu */}
      {showRecruitmentMenu && activeBuilding && selectedHero && (
        <RecruitmentMenu 
          building={activeBuilding}
          hero={selectedHero}
          onRecruit={handleRecruit}
          onClose={() => setShowRecruitmentMenu(false)}
        />
      )}
      
      {/* AI thinking indicator */}
      {aiThinking && <AIThinkingIndicator isThinking={true} />}
      
      {/* AI Actions Summary */}
      {showAiSummary && aiActions && (
        <AIActionsSummary
          actions={aiActions}
          strategicInfo={aiStrategicInfo}
          isVisible={true}
          onClose={() => setShowAiSummary(false)}
        />
      )}
      
      {/* These components will be conditionally rendered based on their visibility props */}
      {showSettingsModal && (
        <AIViewModeSettings
          currentMode={aiViewMode}
          onModeChange={setAiViewMode}
          onClose={() => setShowSettingsModal(false)}
        />
      )}
    </div>
  );
};

export default GamePage;