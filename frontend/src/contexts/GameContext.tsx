/*
* Contexto para gestión del estado del juego
* Implementar:
* - Estado global del juego
* - Funciones para actualizar el estado
* - Funciones para acciones comunes (movimiento, combate, etc.)
*/

import React, { createContext, useState, useContext } from 'react';
import { GameState, Hero, Position, Resources, MapTile } from '../types/game';
import { gameService } from '../services/api';
import { createMoveHeroAction, createEndTurnAction, executeAction } from '../services/actionService';
import { syncArtifactsWithTiles } from '../utils/gameMapUtils';

interface GameContextType {
  gameState: GameState | null;
  loading: boolean;
  error: string | null;
  selectedHero: Hero | null;
  gameMessage: string;
  currentPath: Position[];
  loadGame: (gameId: string) => Promise<void>;
  saveGame: () => Promise<void>;
  moveHero: (heroId: string, destination: Position) => Promise<void>;
  selectHero: (hero: Hero | null) => void;
  setCurrentPath: (path: Position[]) => void;
  endTurn: () => Promise<void>;
  setGameMessage: (message: string) => void;
}

const GameContext = createContext<GameContextType>({
  gameState: null,
  loading: false,
  error: null,
  selectedHero: null,
  gameMessage: '',
  currentPath: [],
  // Implementar dummy functions para evitar error de eslint
  loadGame: async () => { /* eslint-disable-line @typescript-eslint/no-empty-function */ },
  saveGame: async () => { /* eslint-disable-line @typescript-eslint/no-empty-function */ },
  moveHero: async () => { /* eslint-disable-line @typescript-eslint/no-empty-function */ },
  selectHero: () => { /* eslint-disable-line @typescript-eslint/no-empty-function */ },
  setCurrentPath: () => { /* eslint-disable-line @typescript-eslint/no-empty-function */ },
  endTurn: async () => { /* eslint-disable-line @typescript-eslint/no-empty-function */ },
  setGameMessage: () => { /* eslint-disable-line @typescript-eslint/no-empty-function */ },
});

export const useGame = () => useContext(GameContext);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedHero, setSelectedHero] = useState<Hero | null>(null);
  const [gameMessage, setGameMessage] = useState<string>('');
  const [gameId, setGameId] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<Position[]>([]);
  
  // Cargar partida
  const loadGame = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await gameService.loadGame(id);
      
      // Sincronizar artefactos con tiles
      if (response.data && response.data.game_state) {
        const syncedGameState = syncArtifactsWithTiles(response.data.game_state);
        setGameState(syncedGameState);
      } else {
        setGameState(response.data);
      }
      
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
      
      // Encontrar el héroe seleccionado
      const hero = gameState.player.heroes.find(h => h.id === heroId);
      if (!hero) {
        setError('Héroe no encontrado');
        setLoading(false);
        return;
      }
      
      // Convertir el array plano a un formato de matriz 2D
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
      
      // Importar las funciones del motor de juego
      const { findPath } = await import('../services/gameEngine');
      
      // Encontrar camino
      const path = findPath(hero.position, destination, tiles2D);
      
      if (!path.length) {
        setError('No se puede encontrar un camino hacia esa posición');
        setLoading(false);
        return;
      }
      
      // Comprobar si hay suficientes puntos de movimiento
      let totalCost = 0;
      for (let i = 0; i < path.length - 1; i++) {
        const current = path[i];
        const next = path[i + 1];
        
        // Obtener los tiles
        const currentTile = tiles2D[current.y][current.x];
        const nextTile = tiles2D[next.y][next.x];
        
        // Calcular costo
        const { calculateMovementCost } = await import('../services/gameEngine');
        const terrainCost = calculateMovementCost(currentTile, nextTile);
        
        // Añadir costo adicional para movimientos diagonales
        const isDiagonal = current.x !== next.x && current.y !== next.y;
        const moveCost = isDiagonal ? 1.414 : 1; // sqrt(2) para diagonales
        
        totalCost += moveCost * terrainCost;
      }
      
      if (hero.stats.movement_points_left < totalCost) {
        setError('Puntos de movimiento insuficientes');
        setLoading(false);
        return;
      }
      
      // Establecer el camino para visualización
      setCurrentPath(path);
      
      // Crear la acción de movimiento
      const action = createMoveHeroAction(heroId, destination);
      const response = await executeAction(gameId, action);
      
      // Crear una copia del estado actual para animar el movimiento
      const updatedGameState = {...gameState};
      const updatedHero = updatedGameState.player.heroes.find(h => h.id === heroId);
      
      if (updatedHero) {
        // Actualizar puntos de movimiento restantes
        updatedHero.stats.movement_points_left -= totalCost;
        
        // Animar el movimiento del héroe a través del camino
        const animateHeroMovement = async () => {
          for (let i = 1; i < path.length; i++) {
            // Actualizar posición del héroe
            updatedHero.position = {...path[i]};
            setGameState({...updatedGameState});
            
            // Esperar 1 segundo antes del siguiente paso
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          // Actualizar con el estado final del servidor
          setGameState(response.data.game_state);
          
          // Actualizar el héroe seleccionado si es necesario
          if (selectedHero && selectedHero.id === heroId) {
            const serverUpdatedHero = response.data.game_state.player.heroes.find(
              (h: Hero) => h.id === heroId
            );
            setSelectedHero(serverUpdatedHero || null);
          }
          
          setGameMessage(response.data.result?.message || `Héroe movido a (${destination.x}, ${destination.y})`);
          setCurrentPath([]); // Limpiar el camino después del movimiento
          setLoading(false);
        };
        
        // Iniciar la animación
        animateHeroMovement();
      } else {
        // Si no se encontró el héroe, simplemente actualizar al estado final
        setGameState(response.data.game_state);
        setCurrentPath([]);
        setLoading(false);
      }
      
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al mover el héroe');
      setCurrentPath([]);
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
    currentPath,
    loadGame,
    saveGame,
    moveHero,
    selectHero,
    setCurrentPath,
    endTurn,
    setGameMessage,
  };
  
  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};
