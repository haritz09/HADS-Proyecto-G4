/*
* Página principal del juego
* Implementar:
* - Renderizado del mapa de juego
* - Panel de información del jugador
* - Controles de juego
* - Gestión de eventos del juego
*/

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gameService } from '../services/api';
import { createMoveHeroAction, createEndTurnAction, executeAction } from '../services/actionService';
import { GameState, Hero, Position, Building } from '../types/game';
import GameMap from '../components/game/GameMap';
import ResourceBar from '../components/game/ResourceBar';
import HeroInfo from '../components/game/HeroInfo';
import BuildingInfo from '../components/game/BuildingInfo';
import Button from '../components/ui/Button';
import RecruitmentMenu from '../components/game/RecruitmentMenu';
import BuildingConstructionMenu from '../components/game/BuildingConstructionMenu';
import { syncArtifactsWithTiles } from '../utils/gameMapUtils';
import '../styles/pages/GamePage.css';

const GamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  
  // Estado del juego
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado UI
  const [selectedHero, setSelectedHero] = useState<Hero | null>(null);
  const [gameMessage, setGameMessage] = useState<string>('');
  const [movingHero, setMovingHero] = useState<{
    heroId: string;
    path: Position[];
    currentStep: number;
  } | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [activeBuilding, setActiveBuilding] = useState<Building | null>(null);
  const [showRecruitmentMenu, setShowRecruitmentMenu] = useState(false);
  const [showConstructionMenu, setShowConstructionMenu] = useState(false);
  
  // Función para actualizar el estado del juego
  const updateGameState = (newState: GameState) => {
    setGameState(newState);
  };

  // Cargar el estado del juego
  useEffect(() => {
    if (!gameId) return;
    
    const loadGame = async () => {
      try {
        setLoading(true);
        console.log("Loading game with ID:", gameId);
        const response = await gameService.loadGame(gameId);
        console.log("Loaded game data:", response.data);
        
        // Asegurarse de que el estado del juego tiene la estructura correcta
        if (!response.data.game_state?.map) {
          throw new Error("Game state is missing map data");
        }
        
        // Sincronizar artefactos con tiles
        const syncedGameState = syncArtifactsWithTiles(response.data.game_state);
        
        setGameState(syncedGameState);
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
  
  // Manejar movimiento de héroe
  const handleHeroMovement = (heroId: string, path: Position[]) => {
    setMovingHero({
      heroId,
      path,
      currentStep: 0
    });

    const animateMovement = async () => {
      for (let i = 0; i < path.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setGameState(prev => {
          if (!prev) return prev;
          const newState = { ...prev };
          const hero = newState.player.heroes.find(h => h.id === heroId);
          if (hero) {
            hero.position = path[i];
          }
          return newState;
        });
      }
      setMovingHero(null);
    };

    animateMovement();
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

  // Manejar click en una casilla del mapa
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
      const response = await gameService.executeAction(gameId, action);
      console.log('GamePage: Backend response from moveHero action:', response.data);      
      
      // Handle both successful and failed responses
      if (response.data && !response.data.success) {
        console.error('GamePage: Hero movement failed:', response.data.error);
        setGameMessage(response.data.error || "Error al mover el héroe");
        return;
      }
      
      // Check for artifact collection in the response
      if (response.data?.result?.interaction?.interaction === 'artifact_collected') {
        const artifactName = response.data.result.interaction.artifact;
        console.log(`GamePage: Artifact collection detected! Artifact: ${artifactName}`);
        setGameMessage(`¡Has recogido el artefacto: ${artifactName}!`);
        console.log(`GamePage: Hero collected artifact: ${artifactName}`);
      }
      
      if (response.data && response.data.game_state) {
        const updatedGameState: GameState = response.data.game_state;
        // Forzar que la posición de todos los héroes sea un objeto plano {x:number, y:number}
        updatedGameState.player.heroes.forEach(h => {
          if (typeof h.position.x !== 'number') h.position.x = Number(h.position.x);
          if (typeof h.position.y !== 'number') h.position.y = Number(h.position.y);
        });
        
        // IMPORTANTE: Actualizar primero el estado global del juego
        setGameState(updatedGameState); // Update the main game state first

        const movedHero = updatedGameState.player.heroes.find(
          (h: Hero) => h.id === selectedHero.id
        );

        if (movedHero) {
          console.log(`GamePage: Héroe ${movedHero.id} nueva posición: (${movedHero.position.x},${movedHero.position.y})`);
          
          // CRÍTICO: Verificar que la posición se ha actualizado correctamente
          // Forzar la actualización de la posición del héroe si no coincide con la destino
          if (movedHero.position.x !== position.x || movedHero.position.y !== position.y) {
            console.warn(`GamePage: ¡Corrigiendo posición del héroe! Destino real: (${position.x},${position.y})`);
            // Forzar la actualización de la posición del héroe al destino exacto
            movedHero.position.x = position.x;
            movedHero.position.y = position.y;
            
            // Re-aplicar el estado con la posición corregida
            setGameState({...updatedGameState});
          }
          
          // IMPORTANTE: Actualizar el héroe seleccionado con todos los datos nuevos
          setSelectedHero(movedHero);
          
          // IMPORTANTE: Forzar una verificación inmediata de proximidad al castillo
          checkHeroProximityToCastle(movedHero, updatedGameState);
        } else {
          console.error('GamePage: Moved hero not found in updated game state from backend. This is unexpected.');
          // Fallback: refresh selectedHero from the potentially unchanged gameState if hero not found in updated one
           const currentHeroInOldState = gameState.player.heroes.find(h => h.id === selectedHero.id);
           if (currentHeroInOldState) setSelectedHero(currentHeroInOldState);
        }
      } else {
        console.error('GamePage: Failed to move hero or game_state missing in response:', response.data?.error || 'Unknown error');
        setGameMessage(response.data?.error || "Error al mover el héroe");
        
        // Keep existing check for artifact collection in the error case
        if (response.data?.interaction?.interaction === 'artifact_collected') {
          console.log(`GamePage: Artifact collected in error case:`, response.data.interaction);
          setGameMessage(`¡Has recogido el artefacto: ${response.data.interaction.artifact}!`);
        }
      }
    } catch (err: any) {
      console.error("GamePage: Exception during hero movement:", err);
      // Mostrar mensaje de error más descriptivo
      if (err.response && err.response.status === 500) {
        setGameMessage("Error del servidor al mover el héroe. Inténtalo de nuevo.");
      } else {
        setGameMessage(err.message || "Error crítico al mover el héroe");
      }
    }
  };

  // Añadir una nueva función para verificar proximidad al castillo
  const checkHeroProximityToCastle = (hero: Hero, state: GameState) => {
    // Buscar todos los castillos en el mapa
    const castles = state.player.cities
      .flatMap(city => city.buildings)
      .filter(b => b.is_castle || (b.position.x === 48 && b.position.y === 48));
    
    castles.forEach(castle => {
      // Calcular distancia
      const calculateDistance = (pos1: Position, pos2: Position): number => {
        return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
      };
      
      const distance = calculateDistance(hero.position, castle.position);
      const isNearCastle = distance <= 2;
      
      console.log(`GamePage: Verificación de proximidad - Héroe en (${hero.position.x}, ${hero.position.y}), ` +
                 `Castillo en (${castle.position.x}, ${castle.position.y}), ` + 
                 `Distancia = ${distance.toFixed(2)}, Está cerca = ${isNearCastle}`);
      
      // Si el héroe está cerca del castillo central, abrir el menú de construcción automáticamente
      if (isNearCastle && castle.position.x === 48 && castle.position.y === 48) {
        console.log('GamePage: ¡HÉROE CERCA DEL CASTILLO CENTRAL! Distancia:', distance);
      }
    });
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

    // Comprobar si el héroe está a 2 o menos casillas del castillo
    const isNearCastle = isCastleBuilding && distance <= 2;

    console.log('GamePage: ¿ESTÁ CERCA DEL CASTILLO?', {
      isNearCastle,
      isCastleBuilding,
      distance,
      maxDistanceAllowed: 2,
      heroPosition: `(${heroPosition.x}, ${heroPosition.y})`,
      buildingPosition: `(${safeBuilding.position.x}, ${safeBuilding.position.y})`
    });

    // Si el héroe está en la misma posición O si está cerca del castillo y es un castillo
    if ((heroAtSamePosition || isNearCastle) && isCastleBuilding) {
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
    } else if (heroAtSamePosition && safeBuilding.built && safeBuilding.can_recruit) {
      console.log('GamePage: ✅ ABRIENDO MENÚ DE RECLUTAMIENTO. Héroe en mismo lugar que edificio reclutable.');
      setActiveBuilding(safeBuilding);
      setShowRecruitmentMenu(true);
    } else {
      console.log('GamePage: ❌ NO SE ABRIRÁ MENÚ: Condiciones no cumplidas:', 
                  { heroAtSamePosition, isCastleBuilding, isBuilt: safeBuilding.built, 
                    canRecruit: safeBuilding.can_recruit, distance, isNearCastle });
    }
  };

  const handleHeroInBuilding = (building: Building) => {
    // Siempre considerar cualquier edificio en (48,48) como castillo
    const isCastleBuilding = building.is_castle || 
                         (building.position.x === 48 && building.position.y === 48);
    
    console.log('GamePage: Checking building for auto-action:', 
                { buildingPos: building.position, isCastle: building.is_castle, isCastleBuilding });
                
    if (isCastleBuilding) {
      console.log('GamePage: Castle detected in handleHeroInBuilding, opening construction menu');
      // Asegurar que se trata como castillo para la interfaz de usuario
      if (!building.is_castle && building.position.x === 48 && building.position.y === 48) {
        building.is_castle = true;
        console.log('GamePage: Forced building at (48,48) to be recognized as a castle');
      }
      setActiveBuilding(building);
      setShowConstructionMenu(true);
      setGameMessage('¡Has llegado al castillo central!');
    } else if (building.built && building.can_recruit) {
      setActiveBuilding(building);
      setShowRecruitmentMenu(true);
    }
  };

  const handleRecruit = async (unitType: string, amount: number) => {
    if (!gameId || !activeBuilding) return;

    try {
      await gameService.executeAction(gameId, {
        type: 'recruitUnits',
        details: {
          buildingId: activeBuilding.id,
          unitType,
          amount,
          heroId: selectedHero?.id
        }
      });
      setShowRecruitmentMenu(false);
      // Recargar el estado del juego
      const response = await gameService.loadGame(gameId);
      setGameState(response.data.game_state);
    } catch (error) {
      console.error('Error recruiting units:', error);
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

      // Para el castillo central, siempre usar "central_city"
      const isCentralCastle = activeBuilding.position.x === 48 && activeBuilding.position.y === 48;
      let cityId: string; // Add explicit type annotation
      
      if (isCentralCastle) {
        cityId = "central_city";
        console.log(`Usando ciudad central para construcción en castillo principal (48,48)`);
      } else if (activeBuilding && activeBuilding.position) {
        // Para otros edificios, buscar la ciudad que contiene el edificio
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
          cityId = buildingToCityId[buildingType] || "central_city";
          console.log(`No se encontró ciudad para el edificio activo, usando mapeo: ${cityId}`);
        }
      } else {
        cityId = buildingToCityId[buildingType] || "central_city";
      }
      
      // Obtener el costo del edificio para mostrar en el log
      const buildingConfigs = {
        barracks: { cost: { gold: 1000, wood: 50, stone: 50 } },
        archery: { cost: { gold: 1200, wood: 70, stone: 30 } },
        knights_tower: { cost: { gold: 1500, wood: 100, stone: 100 } },
        mage_tower: { cost: { gold: 2000, wood: 100, stone: 100 } },
        dragons_lair: { cost: { gold: 5000, wood: 200, stone: 200 } }
      };
      
      const buildingCost = buildingConfigs[buildingType as keyof typeof buildingConfigs]?.cost;
      
      console.log('Costo del edificio a construir:', buildingCost);
      const oldResources = getCurrentPlayerResources();
      console.log('Recursos ANTES de la construcción:', oldResources);
      
      // Realizar una deducción local de recursos para mostrar cambios inmediatos
      const localUpdatedGameState = JSON.parse(JSON.stringify(gameState));
      if (buildingCost && localUpdatedGameState.player && localUpdatedGameState.player.resources) {
        // Deducir recursos localmente para mostrar cambios inmediatos
        Object.entries(buildingCost).forEach(([resource, amount]) => {
          const resourceKey = resource as keyof typeof localUpdatedGameState.player.resources;
          if (localUpdatedGameState.player.resources[resourceKey] !== undefined) {
            localUpdatedGameState.player.resources[resourceKey] -= amount as number;
          }
        });
        // Actualizar propiedad del edificio
        localUpdatedGameState.player.cities.forEach((city: any) => {
          if (city.id === cityId) {
            city.buildings.forEach((building: any) => {
              if (building.building_type === buildingType) {
                building.built = true;
                building.owner = "player";
              }
            });
          }
        });
      }
      
      const action = {
        type: "buildStructure",
        details: {
          structureType: buildingType,
          cityId: cityId
        }
      };

      console.log('Sending build action:', action);

      // Actualizar inmediatamente el estado para mostrar cambios en la UI
      setGameState(localUpdatedGameState);
      
      const response = await gameService.executeAction(gameId, action);
      console.log("Build response:", response.data);
      
      if (response.data?.game_state) {
        console.log('New resources after server response:', response.data.game_state.player.resources);
        setGameState(response.data.game_state);
        setShowConstructionMenu(false);
        setGameMessage(`${buildingType} construido con éxito`);
      } else if (response.data?.success) {
        // Si hay éxito pero no hay game_state, recargar el estado del juego completo
        console.log("La construcción fue exitosa pero no se recibió el estado del juego. Recargando estado...");
        const refreshResponse = await gameService.loadGame(gameId);
        if (refreshResponse.data?.game_state) {
          console.log('Resources after reload:', refreshResponse.data.game_state.player.resources);
          setGameState(refreshResponse.data.game_state);
          setShowConstructionMenu(false);
          setGameMessage(`${buildingType} construido con éxito`);
        }
      } else {
        // Si algo falló, restaurar el estado original
        console.error("Build failed:", response.data?.error || "Unknown error");
        setGameMessage(`Error al construir: ${response.data?.error || "Error desconocido"}`);
        
        // Recargar el estado para asegurar consistencia
        const refreshResponse = await gameService.loadGame(gameId);
        if (refreshResponse.data?.game_state) {
          setGameState(refreshResponse.data.game_state);
        }
      }
    } catch (error) {
      console.error('Error building structure:', error);
      setGameMessage("Error al construir el edificio. Comprueba la consola para detalles.");
      
      // Recargar el estado en caso de error para asegurar consistencia
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
    <div className="game-page">
      {gameState ? (
        <>
          <div className="game-header">
            <h1>Heroes&Hostias</h1>
            <ResourceBar resources={getCurrentPlayerResources()} />
            <div className="game-controls">
              <Button onClick={handleSaveGame}>Guardar</Button>
              <Button onClick={() => navigate('/menu')}>Menú</Button>
            </div>
          </div>
          
          <div className="game-content">
            <div className="game-sidebar">
              <div className="game-info">
                <h2>Turno {gameState.turn || 1}</h2>
                <p>Jugador: {gameState.current_player === 'player' ? 'Tú' : 'IA'}</p>
                <p className="game-message">{gameMessage}</p>
              </div>
              

              {selectedHero && (
                <HeroInfo 
                  hero={selectedHero} 
                  onClose={() => setSelectedHero(null)} 
                />
              )}
              
              {selectedBuilding && (
                <BuildingInfo
                  building={selectedBuilding}
                  onClose={() => setSelectedBuilding(null)}
                  playerResources={getCurrentPlayerResources()}
                />
              )}
              
              {showConstructionMenu && (
                <BuildingConstructionMenu
                  availableBuildings={gameState?.player.cities.flatMap(c => c.buildings) || []}
                  onBuild={handleConstructBuilding}
                  onClose={() => setShowConstructionMenu(false)}
                  playerResources={getCurrentPlayerResources()}
                />
              )}
              
              {isPlayerTurnValue && (
                <Button 
                  variant="primary" 
                  size="large" 
                  onClick={handleEndTurn}
                  className="end-turn-button"
                >
                  Finalizar Turno
                </Button>
              )}
            </div>
            
            <div className="game-map-container">
              <GameMap 
                gameState={gameState}
                selectedHeroId={selectedHero?.id || null}
                onTileClick={handleTileClick}
                onHeroClick={handleHeroClick}
                onCityClick={handleCityClick}
                onBuildingClick={handleBuildingClick}
                isPlayerTurn={isPlayerTurnValue}
              />
            </div>
          </div>
          
          {showRecruitmentMenu && activeBuilding && selectedHero && (
            <RecruitmentMenu
              building={activeBuilding}
              hero={selectedHero}
              onRecruit={handleRecruit}
              onClose={() => setShowRecruitmentMenu(false)}
            />
          )}
        </>
      ) : (
        <div className="loading-screen">Cargando estado del juego...</div>
      )}
    </div>
  );
};

export default GamePage;
