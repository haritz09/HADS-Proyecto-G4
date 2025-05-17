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
        destination: position
      }
    };

    try {
      const response = await gameService.executeAction(gameId, action);
      console.log('GamePage: Backend response from moveHero action:', response.data);      
      if (response.data && response.data.game_state) {
        const updatedGameState: GameState = response.data.game_state;
        // Forzar que la posición de todos los héroes sea un objeto plano {x:number, y:number}
        updatedGameState.player.heroes.forEach(h => {
          if (typeof h.position.x !== 'number') h.position.x = Number(h.position.x);
          if (typeof h.position.y !== 'number') h.position.y = Number(h.position.y);
        });
        setGameState(updatedGameState); // Update the main game state first

        const movedHero = updatedGameState.player.heroes.find(
          (h: Hero) => h.id === selectedHero.id
        );

        if (movedHero) {
          console.log(`GamePage: Hero ${movedHero.id} new position in frontend state: (${movedHero.position.x},${movedHero.position.y}), MP left: ${movedHero.stats.movement_points_left}`);
          
          // Verificar que la posición se ha actualizado correctamente
          if (movedHero.position.x !== position.x || movedHero.position.y !== position.y) {
            console.warn(`GamePage: Position mismatch detected. Forcing hero position to match target: (${position.x},${position.y})`);
            // Forzar la actualización de la posición del héroe
            movedHero.position.x = position.x;
            movedHero.position.y = position.y;
            
            // Actualizar el estado del juego con la posición corregida
            setGameState({...updatedGameState});
          }
          
          setSelectedHero(movedHero); // IMPORTANT: Update selectedHero with the new data from updatedGameState
          
          // Verificación adicional: comprobar si el héroe está en la posición (48,48)
          if (movedHero.position.x === 48 && movedHero.position.y === 48) {
            console.log('GamePage: ¡HÉROE EN POSICIÓN DEL CASTILLO CENTRAL (48,48)!');
            
            // Buscar todos los edificios en la posición (48,48)
            const buildingsAt4848 = updatedGameState.player.cities
              .flatMap(city => city.buildings)
              .filter(b => b.position.x === 48 && b.position.y === 48);
              
            console.log(`GamePage: Buildings found at position (48,48):`, buildingsAt4848);
            
            const castleBuilding = updatedGameState.player.cities
              .flatMap(city => city.buildings)
              .find(b => b.is_castle && b.position.x === 48 && b.position.y === 48);
              
            console.log(`GamePage: Castle building found:`, castleBuilding);
            
            // Si hay un castillo definido, usarlo
            if (castleBuilding) {
              console.log('GamePage: Castle building found, opening ConstructionMenu.');
              setGameMessage('¡Has llegado al castillo central!');
              setActiveBuilding(castleBuilding); // Establecer el edificio activo directamente
              setShowConstructionMenu(true);     // Abrir el menú directamente
            } 
            // Si no hay castillo pero hay otros edificios en (48,48), usar el primero
            else if (buildingsAt4848.length > 0) {
              const anyBuilding = buildingsAt4848[0];
              console.log('GamePage: Using alternative building at (48,48):', anyBuilding);
              // Forzar el edificio como castillo para abrir menú de construcción
              anyBuilding.is_castle = true; // Asegurar que se trata como castillo
              setActiveBuilding(anyBuilding);
              setShowConstructionMenu(true);
              setGameMessage('¡Has llegado al castillo central!');
            } 
            // Si no hay edificios en (48,48), crear uno temporal para mostrar el menú
            else {
              console.log('GamePage: No buildings found at (48,48), creating a temporary one');
              const temporaryCastle = {
                id: "temp_castle",
                name: "Castillo Central",
                position: { x: 48, y: 48 },
                is_castle: true,
                can_recruit: false,
                built: true,
                cost: { gold: 0, wood: 0, stone: 0 }, // <-- Añadido para evitar error en BuildingConstructionMenu
                has_tavern: false,
                building_type: 'castle',
                requirements: [],
                available_creatures: [],
                owner: "player"  // Add owner property
              } as Building;
              setActiveBuilding(temporaryCastle);
              setShowConstructionMenu(true);
              setGameMessage('¡Has llegado al castillo central!');
            }
          } else {
            // If not at castle, ensure construction menu is closed if it was open for other reasons
            // setShowConstructionMenu(false); // Optional: close if not at castle
          }

        } else {
          console.error('GamePage: Moved hero not found in updated game state from backend. This is unexpected.');
          // Fallback: refresh selectedHero from the potentially unchanged gameState if hero not found in updated one
           const currentHeroInOldState = gameState.player.heroes.find(h => h.id === selectedHero.id);
           if (currentHeroInOldState) setSelectedHero(currentHeroInOldState);
        }
        
        if (!response.data.success) {
            setGameMessage(response.data.error || "Movimiento fallido.");
            console.warn("GamePage: Hero movement failed on backend:", response.data.error);
        }

      } else {
        console.error('GamePage: Failed to move hero or game_state missing in response:', response.data?.error || 'Unknown error');
        setGameMessage(response.data?.error || "Error al mover el héroe");
        // Verificar si hay interacción con objetos en la casilla
        if (response.data.interaction && response.data.interaction.interaction === 'artifact_collected') {
          // Mostrar mensaje de artefacto recogido
          setGameMessage(`¡Has recogido el artefacto: ${response.data.interaction.artifact}!`);
          
          // Reproducir sonido o efecto visual (opcional)
          // playCollectionSound();
        }
        
        // Después de la animación, actualizamos el estado
        setTimeout(() => {
          setGameState(response.data.game_state);
        }, currentPath.length * 200); // 200ms por paso
      }
    } catch (err) {
      console.error("GamePage: Exception during hero movement:", err);
      setGameMessage("Error crítico al mover el héroe");
    }
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
  };  // Manejar click en un edificio
  const handleBuildingClick = (building: Building, cityId: string) => {
    console.log('GamePage: Building clicked:', building, 'Selected hero position:', selectedHero?.position);
    setSelectedBuilding(building); // Keep this for showing building info if needed

    if (!selectedHero) {
      console.log('GamePage: No hero selected, cannot open building menus via building click.');
      return;
    }

    const heroAtSamePosition = selectedHero.position.x === building.position.x && 
                               selectedHero.position.y === building.position.y;

    // También considerar posición (48,48) explícitamente para el castillo
    const isAt4848 = selectedHero.position.x === 48 && selectedHero.position.y === 48;
    const buildingIsAt4848 = building.position.x === 48 && building.position.y === 48;

    console.log('GamePage: Checking if hero is at building position for click:', 
                { heroPos: selectedHero.position, buildPos: building.position, 
                  atSamePos: heroAtSamePosition, isAt4848: isAt4848, buildingIsAt4848: buildingIsAt4848 });

    // Comprobar si es un castillo a mano (independientemente de la propiedad is_castle)
    const isCastleBuilding = building.is_castle || 
                           (building.position.x === 48 && building.position.y === 48);

    console.log('GamePage: Building castle check:', { 
      isCastleBuilding: isCastleBuilding, 
      buildingIsCastle: building.is_castle,
      buildingIsAt4848: buildingIsAt4848
    });

    if (heroAtSamePosition && isCastleBuilding) {
      console.log('GamePage: Hero is at castle (verified by click)! Opening construction menu.');
      // Si el edificio está en (48,48), siempre tratarlo como castillo
      if (buildingIsAt4848 && !building.is_castle) {
        console.log('GamePage: Building at (48,48) will be treated as castle regardless of its is_castle property');
        building.is_castle = true;
      }
      setActiveBuilding(building);
      setShowConstructionMenu(true);
      setGameMessage('¡Has llegado al castillo central!');
    } else if (heroAtSamePosition && building.built && building.can_recruit) {
      console.log('GamePage: Hero is at built, recruitable building (verified by click)! Opening recruitment menu.');
      setActiveBuilding(building);
      setShowRecruitmentMenu(true);
    } else {
      console.log('GamePage: Conditions not met for opening building menu via click:', 
                  { heroAtSamePosition, isCastle: building.is_castle, isBuilt: building.built, canRecruit: building.can_recruit });
       // If menu was open, consider closing it
       // setShowConstructionMenu(false);
       // setShowRecruitmentMenu(false);
    }
  };  const handleHeroInBuilding = (building: Building) => {
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
      // Map building types to their respective city IDs
      const buildingToCityId: { [key: string]: string } = {
        barracks: "barracks_city",
        archery: "archery_city",
        knigths_tower: "knights_city",
        mage_tower: "mage_city",
        dragons_lair: "dragon_city"
      };

      const cityId = buildingToCityId[buildingType];
      if (!cityId) {
        console.error('Invalid building type:', buildingType);
        setGameMessage('Error: Tipo de edificio inválido');
        return;
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
      
      if (response.data?.success) {
        setGameState(response.data.game_state);
        setShowConstructionMenu(false);
        setGameMessage(`${buildingType} construido con éxito`);
      }
    } catch (error) {
      console.error('Error building structure:', error);
      setGameMessage("Error al construir el edificio");
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
