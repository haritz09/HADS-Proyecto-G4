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
        
        setGameState(response.data.game_state);
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

  // Manejar click en una casilla del mapa
  const handleTileClick = async (position: Position) => {
    if (!gameState || !gameId || !selectedHero) return;

    try {
      const action = {
        type: "moveHero",
        details: {
          hero_id: selectedHero.id,
          destination: position
        }
      };

      const response = await gameService.executeAction(gameId, action);
      
      if (response.data.path) {
        // Primero animamos el movimiento
        const currentPath = response.data.path;
        handleHeroMovement(selectedHero.id, currentPath);
        
        // Después de la animación, actualizamos el estado
        setTimeout(() => {
          setGameState(response.data.game_state);
        }, currentPath.length * 200); // 200ms por paso
      }
    } catch (err) {
      console.error("Error moving hero:", err);
      setGameMessage("Error al mover el héroe");
    }
  };
  
  // Manejar click en un héroe
  const handleHeroClick = (heroId: string) => {
    if (!gameState) return;
    
    const hero = [...gameState.player.heroes, ...gameState.ai.heroes]
      .find(h => h.id === heroId);
    
    if (!hero) return;
    
    // Si es un héroe del jugador actual y es su turno, seleccionarlo
    if (gameState.current_player === 'player' && hero.id.startsWith('player_')) {
      setSelectedHero(hero);
      setGameMessage(`Héroe ${hero.name} seleccionado`);
    } else {
      setSelectedHero(hero);
      setGameMessage(`Información del héroe ${hero.name}`);
    }
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
    setSelectedBuilding(building);
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
    if (!gameState || !gameId) return;
    
    try {
      await gameService.saveGame(gameId, gameState);
      setGameMessage('Partida guardada correctamente');
    } catch (err: any) {
      setGameMessage(err.response?.data?.message || 'Error al guardar partida');
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
        </>
      ) : (
        <div className="loading-screen">Cargando estado del juego...</div>
      )}
    </div>
  );
};

export default GamePage;
