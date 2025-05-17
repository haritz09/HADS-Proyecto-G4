/*
* Servicio de comunicación con el backend
* Implementar funciones para:
* - Autenticación (login, registro, logout)
* - Gestión de partidas (crear, cargar, guardar)
* - Acciones del juego (movimiento, combate, gestión)
*/

import axios from 'axios';

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
          tiles: Array(totalTiles).fill({
            terrain: 'grass',
            passable: true,
            object_type: null,
            object_id: null
          }),
          fog_of_war: Array(totalTiles).fill(false),
          explored: Array(totalTiles).fill(true),
          visible_objects: []
        },
        cities: [] // Array global de ciudades según schema.py
      };

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
    return await API.get(`/games/${gameId}`);
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
    try {
      console.log('Sending action:', action);
      const response = await API.post(`/games/${gameId}/action`, action);
      return response;
    } catch (error) {
      console.error('Error executing action:', error);
      throw error;
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
    return await API.post(`/games/${gameId}/action`, {
      type: 'recruitUnits',
      details: {
        cityId,
        unitType,
        amount,
        heroId
      }
    });
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
  }
};

export default API;
