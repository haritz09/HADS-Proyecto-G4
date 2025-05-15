/*
* Contexto para gestión del estado del juego
* Implementar:
* - Estado global del juego
* - Funciones para actualizar el estado
* - Funciones para acciones comunes (movimiento, combate, etc.)
*/

import React, { createContext, useState, useContext } from 'react';
import { GameState, Hero, Position, Resources } from '../types/game';
import { gameService } from '../services/api';
import { createMoveHeroAction, createEndTurnAction, executeAction } from '../services/actionService';

interface GameContextType {
  gameState: GameState | null;
  loading: boolean;
  error: string | null;
  selectedHero: Hero | null;
  gameMessage: string;
  loadGame: (gameId: string) => Promise<void>;
  saveGame: () => Promise<void>;
  moveHero: (heroId: string, destination: Position) => Promise<void>;
  selectHero: (hero: Hero | null) => void;
  endTurn: () => Promise<void>;
  setGameMessage: (message: string) => void;
}

const GameContext = createContext<GameContextType>({
  gameState: null,
  loading: false,
  error: null,
  selectedHero: null,
  gameMessage: '',
  loadGame: async () => {},
  saveGame: async () => {},
  moveHero: async () => {},
  selectHero: () => {},
  endTurn: async () => {},
  setGameMessage: () => {},
});

export const useGame = () => useContext(GameContext);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedHero, setSelectedHero] = useState<Hero | null>(null);
  const [gameMessage, setGameMessage] = useState<string>('');
  const [gameId, setGameId] = useState<string | null>(null);
  
  // Cargar partida
  const loadGame = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await gameService.loadGame(id);
      setGameState(response.data);
      setGameId(id);
      setGameMessage(`Partida cargada. Turno ${response.data.turn}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar la partida');
    } finally {
      setLoading(false);
    }
  };
  
  // Guardar partida
  const saveGame = async () => {
    if (!gameState || !gameId) {
      setError('No hay partida activa para guardar');
      return;
    }
    
    try {
      setLoading(true);
      
      await gameService.saveGame(gameId, gameState);
      setGameMessage('Partida guardada correctamente');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar la partida');
    } finally {
      setLoading(false);
    }
  };
  
  // Mover héroe
  const moveHero = async (heroId: string, destination: Position) => {
    if (!gameState || !gameId) {
      setError('No hay partida activa');
      return;
    }
    
    try {
      setLoading(true);
      
      const action = createMoveHeroAction(heroId, destination);
      const response = await executeAction(gameId, action);
      
      setGameState(response.data.game_state);
      
      // Actualizar el héroe seleccionado si es necesario
      if (selectedHero && selectedHero.id === heroId) {
        const updatedHero = response.data.game_state.player.heroes.find(
          (h: Hero) => h.id === heroId
        );
        setSelectedHero(updatedHero || null);
      }
      
      setGameMessage(response.data.result.message || `Héroe movido a (${destination.x}, ${destination.y})`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al mover el héroe');
    } finally {
      setLoading(false);
    }
  };
  
  // Seleccionar héroe
  const selectHero = (hero: Hero | null) => {
    setSelectedHero(hero);
    if (hero) {
      setGameMessage(`Héroe ${hero.name} seleccionado`);
    }
  };
  
  // Finalizar turno
  const endTurn = async () => {
    if (!gameState || !gameId) {
      setError('No hay partida activa');
      return;
    }
    
    try {
      setLoading(true);
      
      const action = createEndTurnAction();
      const response = await executeAction(gameId, action);
      
      setGameState(response.data.game_state);
      setSelectedHero(null);
      
      // Usa la estructura correcta del estado del juego
      if (response.data.game_state.current_player === 'ai') {
        setGameMessage('Turno finalizado. Ahora es el turno de la IA');
      } else {
        setGameMessage('Turno finalizado. Es tu turno');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al finalizar el turno');
    } finally {
      setLoading(false);
    }
  };
  
  const value = {
    gameState,
    loading,
    error,
    selectedHero,
    gameMessage,
    loadGame,
    saveGame,
    moveHero,
    selectHero,
    endTurn,
    setGameMessage,
  };
  
  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};
