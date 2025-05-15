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
import { GameState, Hero, Position } from '../types/game';
import GameMap from '../components/game/GameMap';
import ResourceBar from '../components/game/ResourceBar';
import HeroInfo from '../components/game/HeroInfo';
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
  const isPlayerTurn = (): boolean => {
    if (!gameState) return false;
    return gameState.current_player === 'player';
  };
  
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
  
  // Manejar click en una casilla del mapa
  const handleTileClick = async (position: Position) => {
    if (!gameState || !gameId) {
      console.log("No hay gameState o gameId");
      return;
    }

    if (!selectedHero) {
      console.log("No hay héroe seleccionado");
      setGameMessage("Selecciona un héroe primero");
      return;
    }

    try {
      console.log("Intentando mover héroe:", selectedHero.id, "a posición:", position);
      const action = {
        type: "moveHero",
        details: {
          hero_id: selectedHero.id,
          destination: position
        }
      };

      console.log("Enviando acción:", action);
      const response = await gameService.executeAction(gameId, action);
      
      if (response.data && response.data.game_state) {
        console.log("Movimiento exitoso, actualizando estado");
        setGameState(response.data.game_state);
        setGameMessage("Movimiento realizado");
      }
    } catch (err: any) {
      console.error("Error al mover:", err);
      setGameMessage(err.response?.data?.detail || 'Error al mover');
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
  
  // Finalizar turno
  const handleEndTurn = async () => {
    if (!gameState || !isPlayerTurn() || !gameId) return;
    
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
              
              {isPlayerTurn() && (
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
                selectedHero={selectedHero}
                onTileClick={handleTileClick}
                onHeroClick={handleHeroClick}
                onCityClick={handleCityClick}
                isPlayerTurn={isPlayerTurn()}
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
