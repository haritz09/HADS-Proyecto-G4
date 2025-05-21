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
import { GameState, Hero, Position, Building, MapTile } from '../types/game'; // Add MapTile import
import { useGame } from '../contexts/GameContext';
import GameMap, { GameMapRef } from '../components/game/GameMap';
import GameControls from '../components/game/GameControls';
import ResourceBar from '../components/game/ResourceBar';
import HeroInfo from '../components/game/HeroInfo';
import AIThinkingIndicator from '../components/ui/AIThinkingIndicator';
import AIActionsSummary from '../components/game/AIActionsSummary';
import Button from '../components/ui/Button';
import BuildingConstructionMenu from '../components/game/BuildingConstructionMenu';
import RecruitmentMenu from '../components/game/RecruitmentMenu';
import CombatModal from '../components/game/CombatModal';
import PlayerInteractionSummary from '../components/game/PlayerInteractionSummary';
import GameOverScreen from '../components/screens/GameOverScreen';
import { gameService } from '../services/api';
import { executeAction, createEndTurnAction } from '../services/actionService';
import { syncArtifactsWithTiles, syncMinesWithTiles } from '../utils/gameMapUtils';
import { findPath, calculatePathCost, calculateMovementCost } from '../services/gameEngine'; // Add missing function imports
import '../styles/pages/GamePage.css';

const GamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  
  // Add gameMapRef to access GameMap methods
  const gameMapRef = useRef<GameMapRef>(null);
  
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
  const [combatInteraction, setCombatInteraction] = useState<any>(null); // State for combat interaction
  const combatInProgressRef = useRef<boolean>(false); // Ref to track combat progress
  // Remove state for settings modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  // Add state for AI view mode
  const [aiViewMode, setAiViewMode] = useState<'normal' | 'changeView' | 'splitView'>('normal');
  const isAiViewMode = aiViewMode !== 'normal';

  // Add only the missing showCombatModal state (not duplicating combatInteraction)
  const [showCombatModal, setShowCombatModal] = useState<boolean>(false);
  
  // Add state for player interaction summary
  const [playerInteraction, setPlayerInteraction] = useState<any>(null);
  const [showPlayerInteraction, setShowPlayerInteraction] = useState<boolean>(false);
  
  // Add missing GameOver states
  const [showGameOver, setShowGameOver] = useState<boolean>(false);
  const [gameOverStatus, setGameOverStatus] = useState<'victory' | 'defeat' | 'draw'>('defeat');

  const { 
    selectHero, 
    moveHero, 
    endTurn, 
    aiThinking,
    showAiSummary,
    setShowAiSummary,
    aiActions,
    aiStrategicInfo,
    loadGame: loadGameContext
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
        
        // Asegurarse de que el estado del juego tiene la estructura correcta
        if (!response.data.game_state?.map) {
          throw new Error("Game state is missing map data");
        }
        
        // Log detallado de minas en visible_objects
        const minas = response.data.game_state.map.visible_objects?.filter((obj: any) => 
          obj.type === 'goldmine' || obj.type === 'sawmill' || obj.type === 'quarry' || 
          ('resource_type' in obj && ['gold', 'wood', 'stone'].includes(obj.resource_type))
        ) || [];
          
        // Sincronizar artefactos con tiles
        const syncedGameState = syncArtifactsWithTiles(response.data.game_state);
        
        // Sincronizar minas con tiles
        const { syncMinesWithTiles } = await import('../utils/gameMapUtils');
        const fullySyncedGameState = syncMinesWithTiles(syncedGameState);
        
        setGameState(fullySyncedGameState);
        setGameMessage(`¡Partida cargada! Turno ${response.data.game_state.turn}`);

        await loadGameContext(gameId);
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
              // Update position for animation purposes only
              hero.position = { x: path[i].x, y: path[i].y };
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

      console.log('GamePage: Sending moveHero action for hero', heroId, 'to destination:', destination);
      
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

      console.log('GamePage: MoveHero response received:', response.data);

      if (response.data?.success) {
        const newPosition = response.data.result.new_position;
        
        // Verificar y forzar la posición si es necesario
        if (destination.x === 48 && destination.y === 48) {
          // ...existing code...
        }
        
        // Mejorar la detección de combate con más logging
        console.log('GamePage: Checking for combat interaction. Result object:', response.data.result);
        
        if (response.data.result && response.data.result.interaction === 'combat') {
          console.log('GamePage: Combat detected!', response.data.result.combat_result);
          setCombatInteraction({
            playerHero: selectedHero,
            enemyHero: response.data.result.enemy_hero,
            combatResult: response.data.result.combat_result
          });
          setShowCombatModal(true);
          combatInProgressRef.current = true;
          
          // MODIFICACIÓN: Usar la misma lógica que el backend para determinar game over
          const combatResult = response.data.result.combat_result;
          if (combatResult && combatResult.winner) {
            // Crear una copia actualizada del estado del juego que refleje el resultado del combate
            const updatedGameState = {...gameState};
            
            // Si el jugador ganó el combate, eliminamos el héroe enemigo
            if (combatResult.winner === 'player') {
              // Filtrar el héroe derrotado de la lista de héroes de la IA
              const enemyHeroId = response.data.result.enemy_hero;
              updatedGameState.ai.heroes = updatedGameState.ai.heroes.filter(h => h.id !== enemyHeroId);
              
              // Verificar la condición de victoria: IA sin héroes NI ciudades
              const aiDefeated = updatedGameState.ai.heroes.length === 0 && 
                                (updatedGameState.ai.cities.length === 0 || 
                                 updatedGameState.ai.cities.every(city => city.owner !== 'ai'));
              
              if (aiDefeated) {
                console.log('GamePage: AI has no heroes and no cities. Victory!');
                setGameOverStatus('victory');
                setShowGameOver(true);
              }
            } 
            // Si la IA ganó el combate, eliminamos el héroe del jugador
            else if (combatResult.winner === 'ai') {
              // Filtrar el héroe derrotado de la lista de héroes del jugador
              updatedGameState.player.heroes = updatedGameState.player.heroes.filter(h => h.id !== heroId);
              
              // Verificar la condición de derrota: Jugador sin héroes NI ciudades
              const playerDefeated = updatedGameState.player.heroes.length === 0 && 
                                    (updatedGameState.player.cities.length === 0 || 
                                     updatedGameState.player.cities.every(city => city.owner !== 'player'));
              
              if (playerDefeated) {
                console.log('GamePage: Player has no heroes and no cities. Defeat!');
                setGameOverStatus('defeat');
                setShowGameOver(true);
              }
            }
            
            // Actualizar el estado del juego
            setGameState(updatedGameState);
          }
        } else {
          console.log('GamePage: No combat interaction detected in the response');
        }
        
        if (response.data.game_state) {
          updateGameState(response.data.game_state);
        }
      }
    } catch (error) {
      console.error('Error moving hero:', error);
    }
  };

  // Modificar handleTileClick para calcular path localmente antes de enviar al backend
  const handleTileClick = async (position: Position) => {
    if (!gameState || !gameId || !selectedHero) {
      console.warn('GamePage: handleTileClick - Missing gameState, gameId, or selectedHero.');
      return;
    }

    // Ensure position has valid x and y properties
    if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
      console.error('GamePage: Invalid position object in handleTileClick:', position);
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

    // Log selectedHero stats for debugging
    console.log("Selected Hero Stats:", selectedHero?.stats);
    console.log("Movement points left:", selectedHero?.stats?.movement_points_left);
    console.log("Total movement points:", selectedHero?.stats?.movement_points);
    
    console.log(`GamePage: Attempting to move hero ${selectedHero.id} from: (${selectedHero.position.x},${selectedHero.position.y}) to: (${position.x},${position.y})`);

    try {
      // 1. Convertir el mapa a formato 2D para pathfinding
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

      // 2. Calcular el camino usando findPath de gameEngine.ts
      setGameMessage("Calculando movimiento...");
      const path = findPath(selectedHero.position, position, tiles2D);
      
      if (!path.length) {
        setGameMessage("No se puede encontrar un camino válido.");
        return;
      }
      
      // 3. Calcular el coste total del camino
      const totalCost = calculatePathCost(path, tiles2D);
      
      // 4. Verificar si hay suficientes puntos de movimiento
      if (totalCost > selectedHero.stats.movement_points_left) {
        // Calcular hasta dónde puede llegar el héroe con los puntos disponibles
        const affordablePath = []; // Change from let to const
        let currentCost = 0;
        
        for (let i = 0; i < path.length - 1; i++) {
          const current = path[i];
          const next = path[i + 1];
          
          // Calcular costo del segmento
          const from = tiles2D[current.y][current.x];
          const to = tiles2D[next.y][next.x];
          const terrainCost = calculateMovementCost(from, to);
          
          // Costo adicional por movimiento diagonal
          const isDiagonal = current.x !== next.x && current.y !== next.y;
          const moveCost = isDiagonal ? 1.414 : 1; // sqrt(2) para diagonales
          
          const segmentCost = moveCost * terrainCost;
          
          // Si añadir este segmento supera los puntos disponibles, terminar
          if (currentCost + segmentCost > selectedHero.stats.movement_points_left) {
            break;
          }
          
          // Añadir segmento al camino viable
          affordablePath.push(current);
          currentCost += segmentCost;
        }
        
        // Añadir la última posición alcanzable
        if (affordablePath.length < path.length - 1) {
          affordablePath.push(path[affordablePath.length]);
        }
        
        // Usar este camino parcial
        console.log(`GamePage: Partial movement - hero can only move ${affordablePath.length} steps out of ${path.length}`);
        setGameMessage("Puntos de movimiento insuficientes para llegar al destino. Moviendo lo máximo posible...");
        
        // 5. Animar el movimiento parcial
        if (gameMapRef.current) {
          try {
            // Animate the affordable path
            await gameMapRef.current.animateHeroMovement(selectedHero.id, affordablePath);
          } catch (animationError) {
            console.error('Error during hero movement animation:', animationError);
          }
          
          // 6. Enviar acción al backend para actualizar el estado
          const finalPosition = affordablePath[affordablePath.length - 1];
          const action = {
            type: "moveHero",
            details: {
              hero_id: selectedHero.id,
              destination: {
                x: Math.floor(finalPosition.x),
                y: Math.floor(finalPosition.y)
              }
            }
          };
          
          const response = await gameService.executeAction(gameId, action);
          
          // 7. Actualizar el estado del juego con la respuesta del backend
          if (response.data?.game_state) {
            updateGameState(response.data.game_state);
          }
          
          // Actualizar el héroe seleccionado
          if (response.data?.result?.new_position) {
            setSelectedHero(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                position: response.data.result.new_position,
                stats: {
                  ...prev.stats,
                  movement_points_left: response.data.result.movement_points_left || 0
                }
              };
            });
          }
          
          setGameMessage(`El héroe se ha quedado sin puntos de movimiento.`);
        }
      } else {
        // El héroe tiene suficientes puntos para llegar al destino
        console.log(`GamePage: Full movement - hero can move all ${path.length} steps`);
        setGameMessage("Moviendo héroe...");
        
        // 5. Animar el movimiento completo
        if (gameMapRef.current) {
          try {
            await gameMapRef.current.animateHeroMovement(selectedHero.id, path);
          } catch (animationError) {
            console.error('Error during hero movement animation:', animationError);
          }
          
          // 6. Enviar acción al backend para actualizar el estado
          const action = {
            type: "moveHero",
            details: {
              hero_id: selectedHero.id,
              destination: {
                x: Math.floor(position.x),
                y: Math.floor(position.y)
              }
            }
          };
          
          const response = await gameService.executeAction(gameId, action);
          
          // 7. Actualizar el estado del juego con la respuesta del backend
          if (response.data?.game_state) {
            updateGameState(response.data.game_state);
          }
          
          // Actualizar el héroe seleccionado
          if (response.data?.result?.new_position) {
            setSelectedHero(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                position: response.data.result.new_position,
                stats: {
                  ...prev.stats,
                  movement_points_left: response.data.result.movement_points_left || 0
                }
              };
            });
          }
          
          // Procesar interacciones en el destino (artefactos, minas, combate)
          if (response.data?.result?.interaction) {
            const interaction = response.data.result.interaction;
            
            // Check if it's a combat interaction
            if (interaction === 'combat') {
              console.log('Combat detected from server response:', response.data.result);
              
              // Find the enemy hero
              const enemyHeroId = response.data.result.enemy_hero;
              const enemyHero = gameState.ai.heroes.find(h => h.id === enemyHeroId);
              const playerHero = gameState.player.heroes.find(h => h.id === selectedHero.id);
              
              if (playerHero && enemyHero) {
                // Format the combat data properly
                const combatData = {
                  combatResult: response.data.result.combat_result,
                  playerHero: playerHero,
                  enemyHero: enemyHero
                };
                
                console.log('Setting combat data for modal:', combatData);
                setCombatInteraction(combatData);
                
                // CRITICAL: Set this to true to show the modal
                setShowCombatModal(true);
                console.log('Combat modal should now be visible (showCombatModal=true)');
              } else {
                console.error('Could not find heroes for combat modal', {
                  playerHeroId: selectedHero.id,
                  enemyHeroId: enemyHeroId,
                  foundPlayerHero: !!playerHero,
                  foundEnemyHero: !!enemyHero
                });
              }
            } 
            // Handle artifact or resource interaction
            else if (typeof interaction === 'object') {
              if (interaction.interaction === 'artifact_collected' || 
                  interaction.interaction === 'resource_site_captured') {
                setPlayerInteraction(interaction);
                setShowPlayerInteraction(true);
                
                // Set appropriate game message
                if (interaction.interaction === 'artifact_collected') {
                  setGameMessage(`Has encontrado un artefacto: ${interaction.artifact}`);
                } else if (interaction.interaction === 'resource_site_captured') {
                  const resourceType = interaction.resource_type || 'recurso';
                  setGameMessage(`Has capturado una mina de ${resourceType}`);
                }
              }
            } else {
              setGameMessage(`Movimiento completado a (${position.x}, ${position.y})`);
            }
          } else {
            setGameMessage(`Movimiento completado a (${position.x}, ${position.y})`);
          }
        }
      }
    } catch (err: any) {
      console.error('Error moving hero:', err);
      setGameMessage(`Error: ${err.message || "Error desconocido"}`);
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
        // Add an ownership check for castles
        if (safeBuilding.owner !== 'player') {
            console.log('GamePage: ❌ NO SE ABRIRÁ MENÚ: El castillo no pertenece al jugador');
            setGameMessage('Este castillo no te pertenece.');
            return;
        }
        
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

  // Finalizar turno - ahora sólo llama a la función del contexto
  const handleEndTurn = () => {
    console.log("Finalizando turno desde la interfaz");
    endTurn(); // Esta función en el contexto se encargará de todo
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
  // const handleAIViewModeChange = (mode: string) => {
  //   setAiViewMode(mode as any);
  // };

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
    // Open performance settings instead of AI view settings
    setShowSettings(true);
  };

  // Función para manejar reinicio de partida
  const handleRestartGame = async () => {
    try {
      if (!gameId) return;
      // Crear una nueva partida con el mismo escenario
      const scenarioId = "default"; // O recuperar de algún lugar si está disponible
      const response = await gameService.initializeGame(scenarioId);
      
      // Redirigir a la nueva partida
      navigate(`/game/${response.data._id}`);
    } catch (error) {
      console.error("Error restarting game:", error);
      setError('Error al reiniciar la partida');
    }
  };
  
  // Verificar si la partida ha terminado
  const isGameOver = gameState?.status && gameState.status !== 'ongoing';
  
  // Añadir una función para manejar el resultado del combate
  const handleCombatResult = (result: any) => {
    console.log('GamePage: handleCombatResult llamado con resultado', result);
    if (!gameState || !result || !result.winner) return;

    // Crear copia del estado para modificarlo
    const updatedGameState = { ...gameState };

    if (result.winner === 'player') {
      // El jugador ganó, eliminar el héroe enemigo
      console.log('GamePage: Jugador ganó, eliminando héroe enemigo', combatInteraction.enemyHero.id);
      updatedGameState.ai.heroes = updatedGameState.ai.heroes.filter(
        hero => hero.id !== combatInteraction.enemyHero.id
      );
      console.log('GamePage: Héroes AI restantes:', updatedGameState.ai.heroes.length);
    } else if (result.winner === 'ai') {
      // La IA ganó, eliminar el héroe del jugador
      console.log('GamePage: IA ganó, eliminando héroe del jugador', combatInteraction.playerHero.id);
      updatedGameState.player.heroes = updatedGameState.player.heroes.filter(
        hero => hero.id !== combatInteraction.playerHero.id
      );
      console.log('GamePage: Héroes jugador restantes:', updatedGameState.player.heroes.length);
    }

    // Actualizar el estado del juego
    setGameState(updatedGameState);

    // Verificar condiciones de victoria/derrota
    if (updatedGameState.ai.heroes.length === 0) {
      console.log('GamePage: IA sin héroes, victoria');
      setGameOverStatus('victory');
      setShowGameOver(true);
    } else if (updatedGameState.player.heroes.length === 0) {
      console.log('GamePage: Jugador sin héroes, derrota');
      setGameOverStatus('defeat');
      setShowGameOver(true);
    }
  };

  // Método para manejar el cierre del modal de combate con el resultado
  const handleCombatModalClose = () => {
    console.log('GamePage: Cerrando modal de combate');
    
    // Procesar el resultado del combate antes de cerrar el modal
    if (combatInteraction && combatInteraction.combatResult) {
      handleCombatResult(combatInteraction.combatResult);
    }
    
    setShowCombatModal(false);
  };

  // Función para cerrar el modal de combate
  const handleCloseCombatModal = () => {
    console.log('GamePage: Closing combat modal');
    setShowCombatModal(false);
    setCombatInteraction(null);
  };

  // Agregar logs en la función handleGameOver
  const handleGameOver = (status: 'victory' | 'defeat' | 'draw') => {
    console.log('GamePage: handleGameOver llamado con status =', status);
    setGameOverStatus(status);
    console.log('GamePage: setGameOverStatus cambiado a', status);
    setShowGameOver(true);
    console.log('GamePage: setShowGameOver cambiado a true');
  };

  useEffect(() => {
    console.log('GamePage: Estado showGameOver cambiado a', showGameOver);
    console.log('GamePage: Estado gameOverStatus =', gameOverStatus);
  }, [showGameOver, gameOverStatus]);

  return (
    <div className={`game-page ${isAiViewMode ? `ai-view-mode-${aiViewMode}` : ''}`}>
      <div className="game-header">
        <ResourceBar resources={getCurrentPlayerResources()} />
      </div>
      
      <div className="game-content">
        <div className="game-map-container">
          {/* Existing map component */}
          {gameState && (
            <GameMap
              ref={gameMapRef} // Add this ref
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
      
      {/* Combat Modal - Use the dedicated close handler */}
      {showCombatModal && combatInteraction && gameState && (
        <CombatModal
          isOpen={showCombatModal}
          onClose={handleCombatModalClose} // Cambiado para usar el nuevo método
          combatResult={combatInteraction.combatResult}
          playerHero={combatInteraction.playerHero}
          enemyHero={combatInteraction.enemyHero}
          gameState={gameState}  // Verifica que se esté pasando gameState
          onGameOver={handleGameOver}  // Verifica que se esté pasando handleGameOver
        />
      )}
      
      {/* Remove AIViewModeSettings component */}
      {/* {showSettingsModal && (
        <AIViewModeSettings
          currentMode={aiViewMode}
          onModeChange={setAiViewMode}
          onClose={() => setShowSettingsModal(false)}
        />
      )} */}

      {/* Add player interaction summary component */}
      <PlayerInteractionSummary
        isVisible={showPlayerInteraction}
        onClose={() => setShowPlayerInteraction(false)}
        interactionData={playerInteraction}
      />
      
      {/* Mostrar pantalla de fin de juego si la partida ha terminado */}
      {showGameOver && gameState && (
        <GameOverScreen 
          status={gameOverStatus}
          gameState={gameState}
          onRestart={() => {
            console.log('GamePage: onRestart llamado');
            navigate('/');
          }}
        />
      )}
    </div>
  );
};

export default GamePage;