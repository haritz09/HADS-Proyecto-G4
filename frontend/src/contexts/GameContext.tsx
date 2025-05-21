/*
* Contexto para gestión del estado del juego
* Implementar:
* - Estado global del juego
* - Funciones para actualizar el estado
* - Funciones para acciones comunes (movimiento, combate, etc.)
*/

import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { GameState, Hero, Position, Resources, MapTile } from '../types/game';
import { gameService } from '../services/api';
import { createMoveHeroAction, createEndTurnAction, executeAction } from '../services/actionService';
import { syncArtifactsWithTiles } from '../utils/gameMapUtils';
import AIThinkingIndicator from '../components/ui/AIThinkingIndicator';
import AIActionsSummary from '../components/game/AIActionsSummary';

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
  showAiSummary: boolean;
  setShowAiSummary: (show: boolean) => void;
  aiGameState: GameState | null;
  aiThinking: boolean;
  skipAnimation: () => void;
  aiActions: any[]; 
  aiStrategicInfo: Record<string, string> | undefined;
  aiRetryInfo: {
    retrying: boolean;
    retryCount: number;
    retryWaitTime: number;
    currentModel: string | null;
  };
  aiStatusPolling: boolean;
  pollingRetryCount: number;
  aiResponseReceived: boolean;
  handleAiSummaryClose: () => void; // Nueva función para cerrar correctamente el resumen
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
  showAiSummary: false,
  setShowAiSummary: () => { /* eslint-disable-line @typescript-eslint/no-empty-function */ },
  aiGameState: null,
  aiThinking: false,
  skipAnimation: () => { /* eslint-disable-line @typescript-eslint/no-empty-function */ },
  aiActions: [], // Add default value
  aiStrategicInfo: undefined, // Add default value
  aiRetryInfo: {
    retrying: false,
    retryCount: 0,
    retryWaitTime: 0,
    currentModel: null
  },
  aiStatusPolling: false,
  pollingRetryCount: 0, // Inicialización del valor por defecto
  aiResponseReceived: false,
  // Fix: provide a simple empty function without using any state setters
  handleAiSummaryClose: () => { /* eslint-disable-line @typescript-eslint/no-empty-function */ },
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
  
  // Estados para controlar la reproducción de acciones de la IA
  const [aiThinking, setAiThinking] = useState(false);
  const [aiActions, setAiActions] = useState<any[]>([]);
  const [aiStrategicInfo, setAiStrategicInfo] = useState<Record<string, string> | undefined>(undefined);
  const [showAiSummary, setShowAiSummary] = useState(false);
  const [skipAiAnimation, setSkipAiAnimation] = useState(false);
  const [aiThinkingMessage, setAiThinkingMessage] = useState("La IA está analizando el estado del juego...");
  
  // Nuevo estado para mantener una copia del estado de juego desde la perspectiva de la IA
  const [aiGameState, setAiGameState] = useState<GameState | null>(null);
  
  // Nuevo estado para la acción actual de la IA (para mostrar descripciones)
  const [currentAiAction, setCurrentAiAction] = useState<string>('');
  
  // Estados para manejar el polling del estado de la IA
  const [aiStatusPolling, setAiStatusPolling] = useState<boolean>(false);
  const [aiPollingInterval, setAiPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [aiRetryInfo, setAiRetryInfo] = useState<{
    retrying: boolean;
    retryCount: number;
    retryWaitTime: number;
    currentModel: string | null;
  }>({
    retrying: false,
    retryCount: 0,
    retryWaitTime: 0,
    currentModel: null
  });
  
  // Contador para reintentos de polling fallidos
  const [pollingRetryCount, setPollingRetryCount] = useState<number>(0);
  
  // Nuevo estado para rastrear si la respuesta de IA ya fue recibida
  const [aiResponseReceived, setAiResponseReceived] = useState<boolean>(false);
  
  // Tiempo máximo que puede estar activo el indicador de AIThinking (5 minutos)
  const AI_THINKING_MAX_DURATION = 5 * 60 * 1000;
  
  // Referencia para el timeout del indicador de AIThinking
  const aiThinkingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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
      console.log("No hay partida activa para finalizar el turno");
      setError('No hay partida activa');
      return;
    }
    
    try {
      console.log("Enviando acción de fin de turno al backend");
      setLoading(true);
      
      // Crear la acción de finalizar turno
      const action = createEndTurnAction();
      const response = await executeAction(gameId, action);
      
      // Actualizar el estado del juego con la respuesta del backend
      setGameState(response.data.game_state);
      setSelectedHero(null);
      
      // Si ahora es el turno de la IA, iniciar el proceso de turno de la IA
      if (response.data.game_state.current_player === 'ai') {
        setGameMessage('Turno finalizado. Ahora es el turno de la IA');
        
        // Solicitar y procesar acciones de la IA
        await processAITurn();
      } else {
        setGameMessage('Turno finalizado. Es tu turno');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al finalizar el turno');
    } finally {
      setLoading(false);
    }
  };
  
  // Asegurar que el indicador AIThinking se desactive después de un tiempo máximo
  useEffect(() => {
    if (aiThinking) {
      // Limpiar cualquier timeout anterior
      if (aiThinkingTimeoutRef.current) {
        clearTimeout(aiThinkingTimeoutRef.current);
      }
      
      // Establecer un nuevo timeout para desactivar el indicador después del tiempo máximo
      aiThinkingTimeoutRef.current = setTimeout(() => {
        console.log(`AIThinking indicador desactivado automáticamente después de ${AI_THINKING_MAX_DURATION/1000} segundos`);
        setAiThinking(false);
        stopPolling();
      }, AI_THINKING_MAX_DURATION);
    } else {
      // Limpiar timeout si el indicador se desactiva
      if (aiThinkingTimeoutRef.current) {
        clearTimeout(aiThinkingTimeoutRef.current);
        aiThinkingTimeoutRef.current = null;
      }
    }
    
    // Limpiar el timeout al desmontar el componente
    return () => {
      if (aiThinkingTimeoutRef.current) {
        clearTimeout(aiThinkingTimeoutRef.current);
      }
    };
  }, [aiThinking]);
  
  // Desactivar el indicador AIThinking cuando el resumen de acciones se muestra
  useEffect(() => {
    if (showAiSummary && aiResponseReceived) {
      // Si estamos mostrando el resumen y ya recibimos la respuesta, desactivar el indicador
      setAiThinking(false);
      stopPolling();
      console.log("AI thinking desactivado después de mostrar el resumen de acciones");
    }
  }, [showAiSummary, aiResponseReceived]);
  
  // Nueva función para procesar el turno de la IA con mejor manejo de errores
  const processAITurn = async () => {
    if (!gameId) {
      console.error("No hay ID de juego disponible para procesar el turno de la IA");
      return;
    }
    
    // Resetear estados al inicio del turno de la IA
    setAiResponseReceived(false);
    
    try {
      // Indicar que la IA está pensando
      setAiThinking(true);
      setAiThinkingMessage("La IA está analizando el estado del juego...");
      
      // Iniciar el polling para mantener actualizado el estado
      startPolling(gameId);
      
      // Llamar al endpoint con execute_actions=true para que el backend ejecute las acciones
      const response = await gameService.executeAIActions(gameId);
      
      // Marcar que se ha recibido la respuesta
      setAiResponseReceived(true);
      
      // Verificar que la respuesta tiene la estructura esperada
      if (!response.data) {
        console.error("Respuesta vacía del servidor para executeAIActions");
        setGameMessage('Error al procesar el turno de la IA: Respuesta vacía');
        setAiThinking(false);
        stopPolling();
        return;
      }
      
      // Extraer acciones y estrategia de la respuesta
      const aiActionsData = response.data.actions_executed || [];
      const strategicInfo = response.data.strategic_info || {};
      
      // Actualizar estado con acciones ejecutadas y información estratégica
      setAiActions(aiActionsData);
      setAiStrategicInfo(strategicInfo);
      
      // Actualizar el estado del juego con el resultado final
      if (response.data.game_state) {
        setGameState(response.data.game_state);
      }
      
      // Mostrar mensaje de finalización
      setGameMessage('La IA ha completado su turno');
      
      // Detener el polling ya que hemos recibido la respuesta completa
      stopPolling();
      
      // Mostrar el resumen de acciones de la IA
      setShowAiSummary(true);
      
      // Nota: El indicador AIThinking se desactivará automáticamente por el useEffect
      // que observa showAiSummary y aiResponseReceived
      
    } catch (err: any) {
      console.error("Error procesando el turno de la IA:", err);
      
      // Analizar el tipo de error para mantener polling si es timeout
      if (err.code === 'ECONNABORTED') {
        // Si es timeout en la solicitud inicial, mantener el polling activo
        setGameMessage('La solicitud a la IA está tomando más tiempo de lo esperado, pero continúa procesándose');
        
        // No desactivar el indicador, el polling seguirá actualizando el estado
        // Add flag to track timeout occurred - this will be checked when polling stops
        console.log("Timeout error occurred, continuing to poll for status updates");
        
        // Keep polling active, but the status endpoint will eventually turn off the indicator
        return;
      } else {
        // Para otros errores, mostrar mensaje
        setError(err.response?.data?.detail || 'Error procesando el turno de la IA');
        setGameMessage('Error durante el turno de la IA. Es tu turno');
        
        // Ahora sí finalizamos el indicador y polling
        setAiThinking(false);
        stopPolling();
        setAiResponseReceived(true); // Marcar como recibido para evitar estados inconsistentes
      }
    }
  };
  
  // Nueva función para consultar el estado de la IA con mejor manejo de errores
  const checkAiStatus = async (id: string) => {
    if (!id) return;
    
    try {
      const response = await gameService.checkAiStatus(id);
      const status = response.data;
      
      // Resetear contador de reintentos en caso de éxito
      if (pollingRetryCount > 0) {
        setPollingRetryCount(0);
      }
      
      // Si la IA está reintentando, actualizar el mensaje
      if (status.retrying) {
        setAiRetryInfo({
          retrying: true,
          retryCount: status.retry_count || 0,
          retryWaitTime: status.retry_wait_time || 0,
          currentModel: status.current_model
        });
        
        const timeMessage = status.retry_wait_time > 0 
          ? `reintentando en ${status.retry_wait_time}s` 
          : "reintentando...";
          
        setAiThinkingMessage(
          `${status.message || `La IA está ${timeMessage}`} (Intento #${status.retry_count || 1})`
        );
      } else if (status.status === 'processing') {
        // Procesando normalmente
        setAiThinkingMessage(status.message || 'La IA está procesando su turno...');
        setAiRetryInfo({
          retrying: false,
          retryCount: 0, 
          retryWaitTime: 0,
          currentModel: status.current_model
        });
      } else if (status.status === 'completed') {
        // Completado, podemos detener el polling
        console.log("AI status indica 'completed', deteniendo polling");
        stopPolling();
        
        // FIX: Turn off thinking indicator when polling is complete regardless of aiResponseReceived
        // This ensures the indicator is removed even if the original API call timed out
        setAiThinking(false);
        
        // If AI actions were received, still show the summary
        if (aiResponseReceived) {
          setShowAiSummary(true);
        } else {
          // If we never received actions but polling completed, reset game state
          console.log("Polling completed but no AI actions were received, cleaning up states");
          setGameMessage('La IA ha completado su turno, pero no se recibieron acciones.');
        }
      } else if (status.status === 'error') {
        // Error, mostrar mensaje y detener
        setGameMessage(`Error en el turno de la IA: ${status.message}`);
        setAiThinking(false);
        stopPolling();
      }
    } catch (err: any) {
      console.error("Error consultando estado de la IA:", err);
      
      // Distinguir entre diferentes tipos de errores
      if (err.code === 'ECONNABORTED') {
        // Si es un timeout, MANTENER el indicador activo y continuar polling
        console.log("Timeout en consulta de estado de IA - continuando polling");
        setAiThinkingMessage(`La IA sigue procesando la solicitud... (puede tomar un tiempo)`);
        
        // Incrementar el contador de reintentos de polling
        setPollingRetryCount(prev => prev + 1);
      } else if (err.response?.status === 404 || err.response?.status === 403) {
        // Errores de autorización o partida no encontrada - detener
        console.error("Error crítico consultando estado de IA:", err.response?.status);
        setGameMessage(`Error en la comunicación con la IA: ${err.response?.data?.detail || 'Error de autorización'}`);
        setAiThinking(false);
        stopPolling();
      } else {
        // Otros errores de red - no detener pero incrementar contador
        setPollingRetryCount(prev => prev + 1);
        
        // Si hay demasiados errores consecutivos, mostrar advertencia pero mantener polling
        if (pollingRetryCount > 3) {
          setAiThinkingMessage("Problemas de conexión, pero la IA sigue procesando. Espera un momento...");
        }
      }
    }
  };
  
  // Función para iniciar el polling con backoff exponencial
  const startPolling = (id: string) => {
    // Detener cualquier polling existente primero
    stopPolling();
    
    setAiStatusPolling(true);
    setPollingRetryCount(0);
    
    // Comprobar inmediatamente el estado
    checkAiStatus(id);
    
    // Función para calcular tiempo entre reintentos con backoff exponencial
    const getPollingInterval = (retry: number) => {
      const base = 2000; // 2 segundos base
      const max = 15000; // máximo 15 segundos
      
      if (retry <= 0) return base;
      
      // Backoff exponencial con jitter para evitar "thundering herd"
      const exponential = Math.min(max, base * Math.pow(1.5, Math.min(retry, 5)));
      const jitter = Math.random() * 500; // jitter de 0-500ms
      
      return Math.floor(exponential + jitter);
    };
    
    // Crear una función recursiva para polling adaptativo
    const scheduleNextPoll = () => {
      const interval = setTimeout(() => {
        // Ejecutar consulta y programar siguiente
        checkAiStatus(id).finally(() => {
          // Si seguimos en polling activo, programar siguiente
          if (aiStatusPolling) {
            scheduleNextPoll();
          }
        });
      }, getPollingInterval(pollingRetryCount));
      
      setAiPollingInterval(interval);
    };
    
    // Iniciar el ciclo de polling
    scheduleNextPoll();
  };
  
  // Función para detener el polling
  const stopPolling = () => {
    if (aiPollingInterval) {
      clearTimeout(aiPollingInterval);
      setAiPollingInterval(null);
    }
    setAiStatusPolling(false);
  };
  
  // Función para cuando se cierra el resumen de acciones
  const handleAiSummaryClose = () => {
    setShowAiSummary(false);
    setAiThinking(false);
    console.log("AI summary closed, cleaning up related states");
  };
  
  // Limpiar el intervalo de polling al desmontar el componente
  useEffect(() => {
    return () => {
      if (aiPollingInterval) {
        clearTimeout(aiPollingInterval);
      }
      if (aiThinkingTimeoutRef.current) {
        clearTimeout(aiThinkingTimeoutRef.current);
      }
    };
  }, [aiPollingInterval]);
  
  // Función auxiliar para animar movimientos de héroes de la IA
  const animateAIHeroMovement = async (action: any, actionResponse: any) => {
    const heroId = action.details.hero_id || action.details.heroId;
    const destination = action.details.destination;
    
    if (!heroId || !destination) return;
    
    // Buscar el héroe en el nuevo estado
    const hero = actionResponse.data.game_state.ai.heroes.find(
      (h: Hero) => h.id === heroId
    );
    
    if (hero && destination) {
      // Encontrar un camino desde la posición actual hasta el destino
      const { findPath } = await import('../services/gameEngine');
      const mapWidth = actionResponse.data.game_state.map.size.width;
      const mapHeight = actionResponse.data.game_state.map.size.height;
      const tiles2D: MapTile[][] = [];
      
      // Crear el mapa 2D para pathfinding
      for (let y = 0; y < mapHeight; y++) {
        const row: MapTile[] = [];
        for (let x = 0; x < mapWidth; x++) {
          const index = y * mapWidth + x;
          if (index < actionResponse.data.game_state.map.tiles.length) {
            row.push(actionResponse.data.game_state.map.tiles[index]);
          }
        }
        tiles2D.push(row);
      }
      
      // Calcular el camino
      const path = findPath(hero.position, destination, tiles2D);
      
      // Animar el movimiento del héroe a lo largo del camino
      if (path && path.length > 0) {
        for (let i = 1; i < path.length; i++) {
          const step = path[i];
          
          // Actualizar posición del héroe en el estado
          hero.position = {...step};
          setGameState((prevState) => {
            if (!prevState) return prevState;
            
            return {
              ...prevState,
              ai: {
                ...prevState.ai,
                heroes: prevState.ai.heroes.map((h: Hero) => (h.id === heroId ? {...hero} : h))
              }
            } as GameState;
          });
          
          // Esperar un tiempo antes del siguiente paso
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }
  };

  // Ampliar el valor del contexto para incluir nuevas funciones y estados
  const value: GameContextType = {
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
    showAiSummary,
    setShowAiSummary,
    aiGameState,
    aiThinking,
    skipAnimation: () => setSkipAiAnimation(true),
    aiActions,
    aiStrategicInfo,
    aiRetryInfo,
    aiStatusPolling,
    pollingRetryCount,
    aiResponseReceived,
    handleAiSummaryClose
  };

  // Make sure the component returns JSX
  return (
    <GameContext.Provider value={value}>
      {children}
      
      {/* AI Thinking Indicator con mensaje de reintento mejorado */}
      <AIThinkingIndicator 
        isThinking={aiThinking} 
        message={aiThinkingMessage}
        retryInfo={aiRetryInfo.retrying ? aiRetryInfo : undefined}
        networkIssues={pollingRetryCount > 3}
      />
      
      {/* AI Actions Summary - usando el manejador correcto */}
      <AIActionsSummary 
        actions={aiActions}
        strategicInfo={aiStrategicInfo}
        isVisible={showAiSummary}
        onClose={handleAiSummaryClose}
      />
    </GameContext.Provider>
  );
};
