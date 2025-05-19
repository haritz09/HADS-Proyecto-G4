/*
* Servicio de comunicación con el backend
* Implementar funciones para:
* - Autenticación (login, registro, logout)
* - Gestión de partidas (crear, cargar, guardar)
* - Acciones del juego (movimiento, combate, gestión)
*/

import axios from 'axios';
// Add import for ResourceMine type
import { ResourceMine } from '../types/game';

// Configuración base de axios
const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  // Set to false - withCredentials:true only needed for cookie auth, not token auth
  withCredentials: false,
  timeout: 5000
});

// Interceptor para agregar el token de autenticación
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Añadir esta función para obtener los headers de autenticación
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Add response interceptor for better error handling
API.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Servicios de autenticación
export const authService = {
  login: async (username: string, password: string) => {
    // El endpoint de login espera un form-data, no un JSON
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await API.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    if (response.data && response.data.access_token) {
      localStorage.setItem('authToken', response.data.access_token);
      API.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
    }
    return response.data;
  },
  
  register: async (username: string, email: string, password: string) => {
    const response = await API.post('/auth/register', { username, email, password });
    if (response.data && response.data.access_token) {
      localStorage.setItem('authToken', response.data.access_token);
    }
    return response.data;
  },
  
  logout: () => {
    localStorage.removeItem('authToken');
    delete API.defaults.headers.common['Authorization'];
  },
  
  getProfile: async () => {
    return await API.get('/auth/profile');
  }
};

// Servicios de gestión de partidas
const INITIAL_BUILDINGS = [
  {
    id: 'castle',
    name: 'Castillo',
    building_type: 'castle',
    cost: { gold: 0, wood: 0, stone: 0 },
    built: true,
    can_recruit: false,
    is_castle: true,
    has_tavern: false,
    requirements: []
  },
  {
    id: 'barracks',
    name: 'Cuartel',
    building_type: 'barracks',
    cost: { gold: 400, wood: 200, stone: 100 },
    built: false,
    can_recruit: false,
    is_castle: false,
    has_tavern: false,
    requirements: ['castle']
  },
  {
    id: 'archery',
    name: 'Campo de Tiro',
    building_type: 'archery',
    cost: { gold: 400, wood: 300, stone: 100 },
    built: false,
    can_recruit: false,
    is_castle: false,
    has_tavern: false,
    requirements: ['castle']
  }
  // Añadir más edificios según necesites
];

// Función para generar artefactos aleatorios
const generateRandomArtifacts = (mapSize: number, mapTiles: any[], count = 10) => {
  const artifacts = [];
  const subtypes = ['totemDeGuerra', 'totemVelocidad', 'totemReclutamiento'];
  const names = {
    'totemDeGuerra': 'Tótem de Guerra',
    'totemVelocidad': 'Tótem de Velocidad',
    'totemReclutamiento': 'Tótem de Reclutamiento'
  };
  
  // Evitar posiciones de ciudades y héroes
  const usedPositions = [
    {x: 5, y: 5},    // Posición del héroe inicial
    {x: 48, y: 48},  // Castillo central
    {x: 48, y: 52},  // Ciudad de caballería
    {x: 5, y: 90},   // Ciudad de dragones
    {x: 50, y: 50},  // Ciudad cuartel
    {x: 52, y: 52},  // Ciudad arquería
    {x: 70, y: 58}   // Ciudad mágica
  ];
  
  // Crear una copia de los tiles para modificarlos sin mutar el original
  const updatedTiles = [...mapTiles];
  
  for (let i = 0; i < count; i++) {
    // Generar posición aleatoria que no esté ya ocupada
    let x = 0, y = 0;
    do {
      x = Math.floor(Math.random() * (mapSize - 10)) + 5; // Evitar bordes
      y = Math.floor(Math.random() * (mapSize - 10)) + 5;
    } while (usedPositions.some(pos => 
      Math.abs(pos.x - x) < 3 && Math.abs(pos.y - y) < 3
    ));
    
    // Registrar posición usada
    usedPositions.push({x, y});
    
    // Seleccionar subtipo aleatorio
    const subtype = subtypes[Math.floor(Math.random() * subtypes.length)];
    
    // Crear artefacto con todas las propiedades necesarias
    const artifactId = `artifact-${i}-${Date.now()}`;
    
    // Crear artefacto en visible_objects
    artifacts.push({
      id: artifactId,
      name: names[subtype as keyof typeof names],
      type: "artifact",
      subtype: subtype,
      position: { x, y },
      effect: {},
      owner: null
    });

    // CORREGIDO: Actualizar los tiles reales para marcar la posición del artefacto
    const idx = y * mapSize + x;
    if (idx >= 0 && idx < mapSize * mapSize) {
      updatedTiles[idx] = {
        ...updatedTiles[idx],
        object_type: 'artifact',
        object_id: artifactId
      };
    }
  }
  
  return { artifacts, updatedTiles };
};

// Nueva función para generar minas de recursos
const generateResourceMines = (mapSize: number, mapTiles: any[], usedPositions: {x: number, y: number}[]): { mines: ResourceMine[], updatedTiles: any[] } => {
  const mines: ResourceMine[] = [];
  const resourceTypes = [
    { type: 'goldmine', resourceType: 'gold', symbol: '💰', perTurn: [200, 500] },
    { type: 'sawmill', resourceType: 'wood', symbol: '🪵', perTurn: [50, 150] },
    { type: 'quarry', resourceType: 'stone', symbol: '⛏️', perTurn: [50, 100] }
  ];
  
  // Crear una copia de los tiles para modificarlos sin mutar el original
  const updatedTiles = [...mapTiles];
  
  // Generar 3 minas de cada tipo (9 en total)
  resourceTypes.forEach((resource, resourceIndex) => {
    for (let i = 0; i < 3; i++) {
      // Generar posición aleatoria que no esté ya ocupada
      let x = 0, y = 0;
      do {
        x = Math.floor(Math.random() * (mapSize - 20)) + 10; // Evitar bordes
        y = Math.floor(Math.random() * (mapSize - 20)) + 10;
      } while (usedPositions.some(pos => 
        Math.abs(pos.x - x) < 5 && Math.abs(pos.y - y) < 5
      ));
      
      // Registrar posición usada
      usedPositions.push({x, y});
      
      // Generar valor aleatorio de recursos por turno dentro del rango
      const resourcePerTurn = Math.floor(
        Math.random() * (resource.perTurn[1] - resource.perTurn[0]) + resource.perTurn[0]
      );
      
      // Crear mina con todas las propiedades necesarias
      const mineId = `${resource.type}_${i}_${Date.now()}`;
      
      // Crear mina en visible_objects
      mines.push({
        id: mineId,
        type: resource.type,
        resource_type: resource.resourceType,
        resource_per_turn: resourcePerTurn,
        position: { x, y },
        symbol: resource.symbol,
        owner: null
      });

      // Actualizar los tiles para marcar la posición de la mina
      const idx = y * mapSize + x;
      if (idx >= 0 && idx < mapSize * mapSize) {
        updatedTiles[idx] = {
          ...updatedTiles[idx],
          object_type: 'mine',
          object_id: mineId
        };
      }
    }
  });
  
  console.log(`Generadas ${mines.length} minas de recursos para el mapa`);
  return { mines, updatedTiles };
};

// Crear un nuevo método para sincronizar artefactos al cargar juegos guardados
const syncArtifactsWithTiles = (gameState: any) => {
  // Verificar la estructura del gameState recibido
  console.log("syncArtifactsWithTiles - Estado del juego:", {
    hasMap: !!gameState?.map,
    visibleObjectsLength: gameState?.map?.visible_objects?.length || 0,
    tilesLength: gameState?.map?.tiles?.length || 0
  });
  
  if (!gameState?.map?.visible_objects?.length || !gameState?.map?.tiles?.length) return gameState;

  // Crear copias profundas para evitar mutación
  const updatedGameState = JSON.parse(JSON.stringify(gameState));
  const mapSize = gameState.map.size.width;
  
  // Examinar los objetos visibles antes del filtrado
  console.log("Objetos visibles antes del filtrado:", 
    gameState.map.visible_objects.map((obj: any) => ({
      id: obj.id,
      type: obj.type,
      hasPosition: !!obj.position,
      subtype: obj.subtype
    }))
  );
  
  // CRÍTICO: Restaurar el tipo 'artifact' para cualquier objeto que tenga subtype
  // Este paso es necesario porque el backend no está preservando la propiedad 'type'
  updatedGameState.map.visible_objects.forEach((obj: any) => {
    if ('subtype' in obj && obj.subtipo && !obj.type) {
      //console.log(`Restaurando tipo 'artifact' para objeto con id ${obj.id} y subtipo ${obj.subtipo}`);
      obj.type = 'artifact';
    }
  });
  
  // PROBLEMA CRÍTICO: Las posiciones de los artefactos son undefined
  console.log("⚠️ Reconstruyendo posiciones perdidas de artefactos...");
  
  // Reconstruir la información de posición desde los tiles
  const reconstructArtifactPositions = () => {
    // Clone los objetos visibles
    const updatedVisibleObjects = [...updatedGameState.map.visible_objects];
    
    // Crear un mapa de ID de artefacto a su posición
    const artifactPositions: {[key: string]: {x: number, y: number}} = {};
    
    // Buscar en cada tile por artefactos
    updatedGameState.map.tiles.forEach((tile: any, index: number) => {
      if (tile.object_type === 'artifact' && tile.object_id) {
        // Calcular la posición (x,y) desde el índice lineal
        const y = Math.floor(index / updatedGameState.map.size.width);
        const x = index % updatedGameState.map.size.width;
        
        // Guardar la posición para este ID de artefacto
        artifactPositions[tile.object_id] = { x, y };
        console.log(`⚠️ Reconstruida posición (${x},${y}) para artefacto ${tile.object_id}`);
      }
    });
    
    // Actualizar los objetos visibles con las posiciones reconstruidas
    const updatedObjects = updatedVisibleObjects.map((obj: any) => {
      if (obj.type === 'artifact' && !obj.position && artifactPositions[obj.id]) {
        return {
          ...obj,
          position: artifactPositions[obj.id]
        };
      }
      return obj;
    });
    
    // Si no pudimos reconstruir todas las posiciones desde los tiles,
    // como fallback, generamos nuevas posiciones aleatorias para los artefactos restantes
    const objectsWithPositions = updatedObjects.map((obj: any, index: number) => {
      if (obj.type === 'artifact' && !obj.position) {
        // Generar posición aleatoria y asegurarse de que no colisiona
        // Usar el índice para distribuirlos en el mapa
        const x = 10 + (index * 5) % (updatedGameState.map.size.width - 20);
        const y = 10 + Math.floor(index / 10) * 5;
        
        console.log(`⚠️ Generando posición aleatoria (${x},${y}) para artefacto ${obj.id}`);
        
        // También actualizar el tile correspondiente
        const tileIdx = y * updatedGameState.map.size.width + x;
        if (tileIdx >= 0 && tileIdx < updatedGameState.map.tiles.length) {
          updatedGameState.map.tiles[tileIdx] = {
            ...updatedGameState.map.tiles[tileIdx],
            object_type: 'artifact',
            object_id: obj.id
          };
        }
        
        // Devolver objeto con posición generada
        return {
          ...obj,
          position: { x, y }
        };
      }
      return obj;
    });
    
    return objectsWithPositions;
  };
  
  // Actualizar los objetos visibles con posiciones reconstruidas
  updatedGameState.map.visible_objects = reconstructArtifactPositions();
  
  // Verificar que todos los artefactos ahora tienen posición
  console.log("Artefactos con posiciones reconstruidas:", 
    updatedGameState.map.visible_objects.map((obj: any) => ({
      id: obj.id, 
      hasPosition: !!obj.position,
      position: obj.position
    }))
  );
  
  // Ahora buscar artefactos con tipo restaurado
  const artifacts = updatedGameState.map.visible_objects.filter((obj: any) => 
    obj.type === 'artifact' && obj.position
  );
  
  console.log(`Sincronizando ${artifacts.length} artefactos con tiles (después de reconstruir posiciones)`);
  
  // Marcar posiciones de artefactos en los tiles
  artifacts.forEach((artifact: any) => {
    const { x, y } = artifact.position;
    const idx = y * mapSize + x;
    
    if (idx >= 0 && idx < updatedGameState.map.tiles.length) {
      // Actualizar el tile sin mutar el original
      updatedGameState.map.tiles[idx] = {
        ...updatedGameState.map.tiles[idx],
        object_type: 'artifact',
        object_id: artifact.id
      };
    }
  });
  
  return updatedGameState;
};

export const gameService = {
  getScenarios: async () => {
    return await API.get('/scenarios');
  },
  
  createGame: async (scenarioId: string) => {
    try {
      const userResponse = await API.get('/auth/profile');
      const userId = userResponse.data._id;

      // Crear mapa 100x100
      const mapSize = 100;
      const totalTiles = mapSize * mapSize;
      
      // Crear tiles iniciales
      const initialTiles = Array(totalTiles).fill(null).map(() => ({
        terrain: 'grass',
        passable: true,
        object_type: null,
        object_id: null
      }));

      // Lista para seguir las posiciones usadas
      const usedPositions = [
        {x: 5, y: 5},    // Posición del héroe inicial
        {x: 48, y: 48},  // Castillo central
        {x: 48, y: 52},  // Ciudad de caballería
        {x: 5, y: 90},   // Ciudad de dragones
        {x: 50, y: 50},  // Ciudad cuartel
        {x: 52, y: 52},  // Ciudad arquería
        {x: 70, y: 58}   // Ciudad mágica
      ];

      // Generar artefactos y actualizar tiles
      const { artifacts, updatedTiles: tilesWithArtifacts } = generateRandomArtifacts(mapSize, initialTiles, 15);
      
      // Generar minas y actualizar tiles
      const { mines, updatedTiles: finalTiles } = generateResourceMines(mapSize, tilesWithArtifacts, usedPositions);

      // Verificar los artefactos y minas generados
      console.log("Artefactos generados:", {
        count: artifacts.length,
        firstFew: artifacts.slice(0, 3).map(a => ({
          id: a.id,
          type: a.type,
          subtype: a.subtype,
          position: a.position
        }))
      });
      
      console.log("Minas generadas:", {
        count: mines.length,
        types: mines.map(m => m.type),
        firstFew: mines.slice(0, 3).map(m => ({
          id: m.id,
          type: m.type,
          resource_type: m.resource_type,
          position: m.position
        }))
      });
      
      const defaultGameState = {
        turn: 1,
        current_player: "player",
        player: {
          heroes: [{
            id: "hero1",
            name: "Test Hero",
            position: { x: 5, y: 5 },
            stats: {
              attack: 5,
              defense: 3,
              speed: 3,
              movement_points: 1000,
              movement_points_left: 1000
            },
            army: [],
            artifacts: []
          }],
          cities: [
            {
              id: "central_castle",
              name: "Castillo Central",
              position: { x: 48, y: 48 },
              owner: "player",
              buildings: [{
                id: "castle",
                name: "Castillo Central",
                position: { x: 48, y: 48 },
                building_type: "castle",
                built: true,
                can_recruit: true,
                is_castle: true,
                has_tavern: true,
                owner: "player",
                requirements: [],
                cost: { gold: 0, wood: 0, stone: 0 },
                available_creatures: []
              }]
            },
            {
              id: "knights_city",
              name: "Ciudad de Caballería",
              position: { x: 48, y: 52 },
              owner: "player",
              buildings: [{
                id: "knights_tower",
                name: "Torre de Caballería",
                position: { x: 48, y: 52 },
                building_type: "knights",
                cost: { gold: 1500, wood: 100, stone: 100 },
                built: false,
                can_recruit: false,
                is_castle: false,
                has_tavern: false,
                owner: null,
                requirements: [],
                available_creatures: []
              }]
            },
            {
              id: "dragon_city",
              name: "Ciudad de Dragones",
              position: { x: 5, y: 90 },
              owner: "player",
              buildings: [{
                id: "dragons_lair",
                name: "Guarida de Dragones",
                position: { x: 5, y: 90 },
                building_type: "dragon",
                cost: { gold: 5000, wood: 200, stone: 200 },
                built: false,
                can_recruit: false,
                is_castle: false,
                has_tavern: false,
                owner: null,
                requirements: [],
                available_creatures: []
              }]
            },
            {
              id: "barracks_city",
              name: "Ciudad Cuartel",
              position: { x: 50, y: 50 },
              owner: "player",
              buildings: [{
                id: "barracks",
                name: "Cuartel",
                position: { x: 50, y: 50 },
                cost: { gold: 1000, wood: 50, stone: 50 },
                built: false,
                can_recruit: false,
                is_castle: false,
                has_tavern: false,
                owner: null,
                requirements: [],
                available_creatures: []
              }]
            },
            {
              id: "archery_city",
              name: "Ciudad Arquería",
              position: { x: 52, y: 52 },
              owner: "player",
              buildings: [{
                id: "archery",
                name: "Campo de Tiro",
                position: { x: 52, y: 52 },
                cost: { gold: 1200, wood: 70, stone: 30 },
                built: false,
                can_recruit: false,
                is_castle: false,
                has_tavern: false,
                owner: null,
                requirements: [],
                available_creatures: []
              }]
            },
            {
              id: "mage_city",
              name: "Ciudad Mágica",
              position: { x: 70, y: 58 },
              owner: "player",
              buildings: [{
                id: "mage_tower",
                name: "Torre de Magos",
                position: { x: 70, y: 58 },
                cost: { gold: 2000, wood: 100, stone: 100 },
                built: false,
                can_recruit: false,
                is_castle: false,
                has_tavern: false,
                owner: null,
                requirements: [],
                available_creatures: []
              }]
            }
          ],
          resources: { gold: 1000, wood: 500, stone: 300 }
        },
        ai: {
          heroes: [],
          cities: [],
          resources: { gold: 1000, wood: 500, stone: 300 }
        },
        map: {
          size: { width: mapSize, height: mapSize },
          tiles: finalTiles, // Usar los tiles actualizados con artefactos y minas marcados
          fog_of_war: Array(totalTiles).fill(false),
          explored: Array(totalTiles).fill(true),
          visible_objects: [...artifacts, ...mines] // Incluir tanto artefactos como minas
        },
        cities: [] // Array global de ciudades según schema.py
      };

      // CRITICAL DEBUG: Check visible_objects right before sending the request
      console.log("DEBUG FRONTEND CREATE_GAME [1]: Sending game data with visible_objects:", {
        count: defaultGameState.map.visible_objects.length,
        types: defaultGameState.map.visible_objects.map(obj => obj.type),
        mineObjects: defaultGameState.map.visible_objects.filter(obj => 
          obj.type === 'goldmine' || obj.type === 'sawmill' || obj.type === 'quarry' || 
          ('resource_type' in obj && ['gold', 'wood', 'stone'].includes(obj.resource_type as string))
        )
      });

      // Verificar el estado del juego antes de enviarlo
      console.log("Estado del juego a enviar:", {
        visibleObjectsCount: defaultGameState.map.visible_objects.length,
        tilesWithArtifacts: finalTiles.filter((t: any) => t.object_type === 'artifact').length
      });
      
      const gameData = {
        user_id: userId,
        name: `Nueva partida - ${new Date().toISOString()}`,
        scenario_id: scenarioId,
        is_autosave: false,
        cheats_used: [],
        game_state: defaultGameState
      };

      console.log("Creando partida con mapa 100x100");
      const response = await API.post('/games', gameData);
      
      // CRITICAL DEBUG: Inspect the response to verify mines were saved
      console.log("DEBUG FRONTEND CREATE_GAME [2]: Response from server:", response.data);
      
      // Check if mines were properly saved in the response
      const responseVisibleObjects = response.data?.game_state?.map?.visible_objects || [];
      const savedMines = responseVisibleObjects.filter((obj: any) => 
        obj.type === 'goldmine' || obj.type === 'sawmill' || obj.type === 'quarry' || 
        ('resource_type' in obj && ['gold', 'wood', 'stone'].includes(obj.resource_type as string))
      );
      
      console.log(`DEBUG FRONTEND CREATE_GAME [3]: Mines in response: ${savedMines.length}`);
      savedMines.forEach((mine: any, index: number) => {
        console.log(`DEBUG FRONTEND CREATE_GAME [4]: Mine ${index+1}:`, mine);
      });
      
      return response;
    } catch (error) {
      console.error("Error en createGame:", error);
      throw error;
    }
  },
  
  getSavedGames: async () => {
    try {
      console.log('DEBUG Frontend: Inicio getSavedGames');
      const profileResponse = await API.get('/auth/profile');
      console.log('DEBUG Frontend: Profile response:', profileResponse.data);
      
      const gamesResponse = await API.get('/games');
      console.log('DEBUG Frontend: Games response:', gamesResponse.data);
      return gamesResponse;
    } catch (error) {
      console.error('DEBUG Frontend: Error in getSavedGames:', error);
      throw error;
    }
  },
  
  loadGame: async (gameId: string) => {
    console.log(`DEBUG FRONTEND [1]: Loading game with ID: ${gameId}`);
    const response = await API.get(`/games/${gameId}`);
    
    // DETAILED network inspection of response - particularmente para minas
    console.log("DEBUG FRONTEND [2]: Datos completos del juego recibidos:", response.data);
    
    // Verificar datos específicos de minas
    const visibleObjects = response.data?.game_state?.map?.visible_objects || [];
    const mines = visibleObjects.filter((obj: any) => 
      obj.type === 'goldmine' || obj.type === 'sawmill' || obj.type === 'quarry' || 
      (obj.resource_type && ['gold', 'wood', 'stone'].includes(obj.resource_type as string))
    );
    
    // Registrar información detallada de las minas
    console.log(`DEBUG FRONTEND [3]: Se encontraron ${mines.length} minas en la respuesta de la API`);
    mines.forEach((mine: any, index: number) => {
      console.log(`DEBUG FRONTEND [4]: Detalles de la mina ${index+1}:`, {
        id: mine.id,
        type: mine.type,
        resource_type: mine.resource_type,
        resource_per_turn: mine.resource_per_turn,
        position: mine.position,
        owner: mine.owner
      });
    });
    
    // Verificar los datos recibidos del servidor
    console.log("Datos recibidos del servidor:", {
      hasGameState: !!response.data?.game_state,
      hasMap: !!response.data?.game_state?.map,
      visibleObjectsCount: response.data?.game_state?.map?.visible_objects?.length || 0,
      visibleObjectsTypes: response.data?.game_state?.map?.visible_objects?.map((o: any) => o.type) || [],
      minesCount: response.data?.game_state?.map?.visible_objects?.filter((o: any) => 
        o.type === 'goldmine' || o.type === 'sawmill' || o.type === 'quarry' || 
        ('resource_type' in o && ['gold', 'wood', 'stone'].includes(o.resource_type as string))
      ).length || 0
    });
    
    // Sincronizar artefactos y minas al cargar el juego
    if (response.data && response.data.game_state) {
      // Restaurar tipos de minas que pueden haberse perdido
      if (response.data.game_state?.map?.visible_objects) {
        response.data.game_state.map.visible_objects.forEach((obj: any) => {
          if ('resource_type' in obj && !obj.type) {
            const resourceMapping: Record<string, string> = {
              'gold': 'goldmine',
              'wood': 'sawmill',
              'stone': 'quarry'
            };
            obj.type = resourceMapping[obj.resource_type] || 'mine';
            //console.log(`Restaurando tipo '${obj.type}' para mina con resource_type ${obj.resource_type}`);
          }
        });
      }
      
      // Primero sincronizar artefactos (función existente)
      response.data.game_state = syncArtifactsWithTiles(response.data.game_state);
      
      // Luego importar y sincronizar minas (desde gameMapUtils)
      const { syncMinesWithTiles } = await import('../utils/gameMapUtils');
      response.data.game_state = syncMinesWithTiles(response.data.game_state);
    }
    return response;
  },
  
  saveGame: async (gameId: string, gameState: any) => {
    try {
      const response = await API.post(`/game/${gameId}/save`, {
        game_state: gameState
      });
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to save game');
      }
      
      return response;
    } catch (error: any) {
      console.error('Error saving game:', error);
      throw new Error(error.response?.data?.error || 'Failed to save game');
    }
  },
  
  // Acciones del juego usando el sistema unificado de acciones
  executeAction: async (gameId: string, action: any) => {
    console.log(`API: Executing action of type ${action.type} for game ${gameId}`);
    try {
      const response = await API.post(`/games/${gameId}/action`, action);
      return response;
    } catch (err) {
      console.error('Error executing game action:', err);
      throw err;
    }
  },
  
  // Gestión de ciudades
  buildBuilding: async (gameId: string, cityId: string, buildingId: string) => {
    return await API.post(`/games/${gameId}/action`, {
      type: 'buildStructure',
      details: {
        cityId,
        buildingId
      }
    });
  },
  
  recruitUnits: async (gameId: string, cityId: string, unitType: string, amount: number, heroId?: string) => {
    console.log(`API: Recruiting ${amount} ${unitType} units in city ${cityId}${heroId ? ` for hero ${heroId}` : ''}`);
    
    const action = {
      type: 'recruitUnits',
      details: {
        cityId,
        unitType,
        count: amount, // Usar 'count' en lugar de 'amount' para coincidir con el backend
        heroId
      }
    };
    
    return await gameService.executeAction(gameId, action);
  },

  transferTroops: async (gameId: string, sourceId: string, targetId: string, units: any[]) => {
    return await API.post(`/games/${gameId}/action`, {
      type: 'transfer',
      details: {
        sourceId,
        targetId,
        units
      }
    });
  },
  
  heroAttack: async (gameId: string, attackerId: string, defenderId: string) => {
    return await API.post(`/games/${gameId}/action`, {
      type: 'combat',
      details: {
        attackerId,
        defenderId
      }
    });
  },

  getAIActions: async (gameId: string) => {
    try {
      return await API.post(`/games/${gameId}/ai`, { execute_actions: false });
    } catch (error) {
      console.error('Error al obtener acciones de la IA:', error);
      throw error;
    }
  },
  
  executeAIActions: async (gameId: string) => {
    try {
      return await API.post(`/games/${gameId}/ai`, { execute_actions: true });
    } catch (error) {
      console.error('Error al ejecutar acciones de la IA:', error);
      throw error;
    }
  },
};

export default API;
