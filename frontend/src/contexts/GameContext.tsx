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
import AIThinkingIndicator from '../components/ui/AIThinkingIndicator';
import AIActionsSummary from '../components/game/AIActionsSummary';
import AIPlaybackControls from '../components/game/AIPlaybackControls';
import AIViewToggle, { AIViewMode } from '../components/game/AIViewToggle';
import SplitViewContainer from '../components/game/SplitViewContainer';

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
  aiViewMode: AIViewMode;
  setAiViewMode: (mode: AIViewMode) => void;
  showAiSummary: boolean;
  setShowAiSummary: (show: boolean) => void;
  aiGameState: GameState | null;
  aiThinking: boolean;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  skipAnimation: () => void;
  aiActions: any[]; // Added missing property
  aiStrategicInfo: Record<string, string> | undefined; // Added missing property
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
  aiViewMode: 'normal',
  setAiViewMode: () => { /* eslint-disable-line @typescript-eslint/no-empty-function */ },
  showAiSummary: false,
  setShowAiSummary: () => { /* eslint-disable-line @typescript-eslint/no-empty-function */ },
  aiGameState: null,
  aiThinking: false,
  playbackSpeed: 1.0,
  setPlaybackSpeed: () => { /* eslint-disable-line @typescript-eslint/no-empty-function */ },
  skipAnimation: () => { /* eslint-disable-line @typescript-eslint/no-empty-function */ },
  aiActions: [], // Add default value
  aiStrategicInfo: undefined, // Add default value
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
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [skipAiAnimation, setSkipAiAnimation] = useState(false);
  const [aiThinkingMessage, setAiThinkingMessage] = useState("La IA está analizando el estado del juego...");
  
  // Nuevo estado para el modo de visualización de la IA
  const [aiViewMode, setAiViewMode] = useState<AIViewMode>('normal');
  
  // Nuevo estado para mantener una copia del estado de juego desde la perspectiva de la IA
  const [aiGameState, setAiGameState] = useState<GameState | null>(null);
  
  // Nuevo estado para la acción actual de la IA (para mostrar descripciones)
  const [currentAiAction, setCurrentAiAction] = useState<string>('');
  
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
      console.log("Dentro de if (!gameState || !gameId)");
      setError('No hay partida activa');
      return;
    }
    
    try {
      console.log("Dentro de try");
      setLoading(true);
      
      const action = createEndTurnAction();
      const response = await executeAction(gameId, action);
      
      setGameState(response.data.game_state);
      setSelectedHero(null);
      
      // Usa la estructura correcta del estado del juego
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
  
  // Nueva función para procesar el turno de la IA con mejor feedback visual y manejo de errores
  const processAITurn = async () => {
    if (!gameId) {
      console.error("No hay ID de juego disponible para procesar el turno de la IA");
      return;
    }
    
    try {
      // Indicar que la IA está pensando
      setAiThinking(true);
      setAiThinkingMessage("La IA está analizando el estado del juego...");
      
      // Llamar al endpoint con execute_actions=true para que el backend ejecute las acciones
      const response = await gameService.executeAIActions(gameId);
      
      // Verificar que la respuesta tiene la estructura esperada
      if (!response.data) {
        console.error("Respuesta vacía del servidor para executeAIActions");
        setGameMessage('Error al procesar el turno de la IA: Respuesta vacía');
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
      
      // Mostrar el resumen de acciones de la IA
      setShowAiSummary(true);
      
    } catch (err: any) {
      console.error("Error procesando el turno de la IA:", err);
      setError(err.response?.data?.detail || 'Error procesando el turno de la IA');
      setGameMessage('Error durante el turno de la IA. Es tu turno');
    } finally {
      // Finalizar el indicador de pensamiento de la IA
      setAiThinking(false);
    }
  };
  
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
      if (path.length > 1) {
        for (let i = 1; i < path.length; i++) {
          // Actualizar posición del héroe
          hero.position = {...path[i]};
          setGameState(actionResponse.data.game_state); // Actualizar estado con la nueva posición del héroe
          
          // Esperar un momento para la animación
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
  };
  
  // Nueva función para visualizar el camino del héroe antes del movimiento
  const visualizeAIHeroPath = async (action: any, actionResponse: any) => {
    const heroId = action.details.hero_id || action.details.heroId;
    const destination = action.details.destination;
    
    if (!heroId || !destination) return;
    
    // Encontrar el héroe y calcular el camino
    const hero = actionResponse.data.game_state.ai.heroes.find(
      (h: Hero) => h.id === heroId
    );
    
    if (hero && destination) {
      const { findPath } = await import('../services/gameEngine');
      const mapWidth = actionResponse.data.game_state.map.size.width;
      const mapHeight = actionResponse.data.game_state.map.size.height;
      const tiles2D: MapTile[][] = [];
      
      // Crear mapa 2D para pathfinding
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
      
      // Calcular camino
      const path = findPath(hero.position, destination, tiles2D);
      
      // Visualizar el camino con flechas direccionales
      if (path.length > 1) {
        const getArrowDirection = (current: Position, next: Position): string => {
          if (next.x > current.x && next.y === current.y) return 'arrow-right';
          if (next.x < current.x && next.y === current.y) return 'arrow-left';
          if (next.x === current.x && next.y < current.y) return 'arrow-up';
          if (next.x === current.x && next.y > current.y) return 'arrow-down';
          return '';
        };

        setGameState(prev => {
          if (!prev) return prev;
          
          // Crear copia profunda del estado
          const newState = JSON.parse(JSON.stringify(prev));
          
          // Marcar cada posición en el camino con la clase correcta
          for (let i = 0; i < path.length - 1; i++) {
            const current = path[i];
            const next = path[i + 1];
            const direction = getArrowDirection(current, next);
            
            // Almacenar el camino en una propiedad adicional temporal
            if (!newState.visualEffects) newState.visualEffects = {};
            if (!newState.visualEffects.paths) newState.visualEffects.paths = [];
            
            newState.visualEffects.paths.push({
              position: current,
              classes: `ai-movement-path ${direction}`
            });
          }
          
          return newState;
        });
        
        // Esperar para que el jugador vea el camino
        await new Promise(resolve => setTimeout(resolve, 2000 / playbackSpeed));
        
        // Limpiar el camino después de mostrarlo
        setGameState(prev => {
          if (!prev) return prev;
          
          const newState = JSON.parse(JSON.stringify(prev));
          delete newState.visualEffects?.paths;
          
          return newState;
        });
      }
    }
  };
  
  // Función mejorada para visualizar la construcción de edificios
  const visualizeBuildingConstruction = async (action: any, actionResponse: any) => {
    const cityId = action.details.cityId;
    const structureType = action.details.structureType;
    
    // Buscar la ciudad y el edificio
    const city = actionResponse.data.game_state.ai.cities.find(
      (c: any) => c.id === cityId
    );
    
    if (city) {
      // Marcar la ciudad para el efecto visual
      setGameState(prev => {
        if (!prev) return prev;
        
        const newState = JSON.parse(JSON.stringify(prev));
        const aiCity = newState.ai.cities.find(
          (c: any) => c.id === cityId
        );
        
        if (aiCity) {
          // Marcar la ciudad para animación
          if (!newState.visualEffects) newState.visualEffects = {};
          newState.visualEffects.buildingConstruction = {
            cityId,
            position: aiCity.position,
            structureType
          };
        }
        
        return newState;
      });
      
      // Mostrar mensaje y esperar
      setGameMessage(`🏗️ La IA está construyendo un ${getStructureName(structureType)} en ${city.name}`);
      await new Promise(resolve => setTimeout(resolve, 2500 / playbackSpeed));
      
      // Limpiar el efecto
      setGameState(prev => {
        if (!prev) return prev;
        
        const newState = JSON.parse(JSON.stringify(prev));
        delete newState.visualEffects?.buildingConstruction;
        
        return newState;
      });
    }
  };
  
  // Función para visualizar combate
  const visualizeCombat = async (action: any, actionResponse: any) => {
    // Implementación del efecto visual de combate
    // ...
    
    setGameMessage(`⚔️ La IA está atacando a tu héroe!`);
    await new Promise(resolve => setTimeout(resolve, 2000 / playbackSpeed));
  };
  
  // Función para visualizar reclutamiento
  const visualizeRecruitment = async (action: any, actionResponse: any) => {
    // Implementación del efecto visual de reclutamiento
    // ...
    
    const unitType = action.details.unitType || action.details.unit_type || '';
    const amount = action.details.amount || action.details.quantity || 0;
    
    setGameMessage(`👥 La IA está reclutando ${amount} ${unitType}s`);
    await new Promise(resolve => setTimeout(resolve, 2000 / playbackSpeed));
  };
  
  // Handler para saltar animaciones
  const skipAnimation = () => {
    setSkipAiAnimation(true);
    setGameMessage('Saltando animaciones...');
  };
  
  // Función para obtener descripciones de acciones
  const getActionDescription = (action: any): string => {
    try {
      const details = action.details || {};
      
      switch (action.type.toLowerCase()) {
        case 'movehero':
          return `La IA está moviendo a su héroe ${details.heroId || details.hero_id || ''} a la posición (${details.destination?.x || '?'}, ${details.destination?.y || '?'})`;
        
        case 'buildstructure': {
          const structureType = details.structureType || details.structure_type || '';
          return `La IA está construyendo un ${getStructureName(structureType)} en la ciudad ${details.cityId || details.city_id || ''}`;
        }
        
        case 'recruitunits': {
          const unitType = details.unitType || details.unit_type || '';
          const amount = details.amount || details.quantity || 0;
          return `La IA está reclutando ${amount} ${unitType}s`;
        }
        
        case 'combat':
        case 'attack':
          return `La IA está atacando a tu héroe`;
        
        case 'transfer':
          return `La IA está transfiriendo tropas entre su héroe y castillo`;
        
        case 'collectresource': {
          const resourceType = details.resourceType || details.resource_type || '';
          return `La IA está recolectando recursos de ${resourceType}`;
        }
        
        case 'pickupartifact':
        case 'collectartifact':
          return `La IA está recogiendo un artefacto`;
        
        case 'endturn':
          return `La IA está finalizando su turno`;
        
        default:
          return `La IA está realizando una acción de tipo ${action.type}`;
      }
    } catch (err) {
      return `La IA está realizando una acción`;
    }
  };

  // Función para obtener nombres legibles de estructuras
  const getStructureName = (structureType: string): string => {
    const structureNames: {[key: string]: string} = {
      'barracks': 'Cuartel',
      'archery': 'Campo de Tiro',
      'knights_tower': 'Torre de Caballeros',
      'mage_tower': 'Torre de Magos',
      'dragons_lair': 'Guarida de Dragones',
      'tavern': 'Taberna'
    };
    return structureNames[structureType] || structureType;
  };

  // Crear el valor del contexto
  const value: GameContextType = {
    gameState,
    loading,
    error,
    selectedHero,
    gameMessage,
    currentPath,
    aiViewMode,
    setAiViewMode,
    showAiSummary,
    setShowAiSummary,
    aiGameState,
    aiThinking,
    playbackSpeed,
    setPlaybackSpeed,
    skipAnimation,
    loadGame,
    saveGame,
    moveHero,
    selectHero,
    setCurrentPath,
    endTurn,
    setGameMessage,
    aiActions, // Expose this state value
    aiStrategicInfo, // Expose this state value
  };
  
  return (
    <GameContext.Provider value={value}>
      {children}
      
      {/* AI Thinking Indicator */}
      <AIThinkingIndicator 
        isThinking={aiThinking} 
        message={aiThinkingMessage} 
      />
      
      {/* AI Actions Summary */}
      <AIActionsSummary 
        actions={aiActions}
        strategicInfo={aiStrategicInfo}
        isVisible={showAiSummary}
        onClose={() => setShowAiSummary(false)}
      />
      
      {/* AI Playback Controls - visible solo durante el turno de la IA y cuando no está pensando */}
      <AIPlaybackControls 
        playbackSpeed={playbackSpeed}
        onSpeedChange={setPlaybackSpeed}
        onSkip={skipAnimation}
        isVisible={gameState?.current_player === 'ai' && !aiThinking}
      />
      
      {/* AI View Toggle - para cambiar entre modos de visualización */}
      <AIViewToggle
        currentMode={aiViewMode}
        onModeChange={setAiViewMode}
        isVisible={gameState?.current_player === 'ai' && !aiThinking}
      />
      
      {/* Split View Container - solo visible en modo de vista dividida */}
      {gameState && aiGameState && (
        <SplitViewContainer
          gameState={gameState}
          aiGameState={aiGameState}
          actionDescription={currentAiAction}
          onTileClick={() => { /* No action needed in this context */ }}
          onHeroClick={() => { /* No action needed in this context */ }}
          onCityClick={() => { /* No action needed in this context */ }}
          onBuildingClick={() => { /* No action needed in this context */ }}
          isVisible={aiViewMode === 'splitView' && gameState.current_player === 'ai' && !aiThinking}
        />
      )}
    </GameContext.Provider>
  );
};