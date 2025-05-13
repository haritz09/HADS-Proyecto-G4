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
  },
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
export const gameService = {
  getScenarios: async () => {
    return await API.get('/scenarios');
  },
  
  createGame: async (scenarioId: string) => {
    // Este endpoint espera un objeto game_data completo, no solo el scenarioId
    // Esta es una implementación simplificada
    const gameData = {
      name: `Nueva partida - ${new Date().toISOString()}`,
      scenario_id: scenarioId,
      // El backend asignará otros valores como user_id y timestamps
    };
    return await API.post('/games', gameData);
  },
  
  getSavedGames: async () => {
    // Este endpoint requiere el user_id como query param
    // El user_id se obtendrá del token en el backend
    const profile = await authService.getProfile();
    const userId = profile.data._id;
    return await API.get(`/games?user_id=${userId}`);
  },
  
  loadGame: async (gameId: string) => {
    return await API.get(`/games/${gameId}`);
  },
  
  saveGame: async (gameId: string, gameState: any) => {
    return await API.post(`/games/${gameId}/save`, gameState);
  },
  
  // Acciones del juego
  // El backend implementa un único endpoint para todas las acciones
  moveHero: async (gameId: string, heroId: string, destination: { x: number, y: number }) => {
    return await API.post(`/games/${gameId}/action`, {
      type: "MOVE_HERO",
      hero_id: heroId,
      target_position: destination
    });
  },
  
  interactWithObject: async (gameId: string, heroId: string, objectId: string) => {
    return await API.post(`/games/${gameId}/action`, {
      type: "INTERACT_OBJECT",
      hero_id: heroId,
      object_id: objectId
    });
  },
  
  endTurn: async (gameId: string) => {
    return await API.post(`/games/${gameId}/action`, {
      type: "END_TURN"
    });
  },
  
  // Gestión de ciudades
  buildBuilding: async (gameId: string, cityId: string, buildingId: string) => {
    return await API.post(`/games/${gameId}/action`, {
      type: "BUILD_BUILDING",
      city_id: cityId,
      building_id: buildingId
    });
  },
  
  recruitUnits: async (gameId: string, cityId: string, unitType: string, amount: number, heroId?: string) => {
    return await API.post(`/games/${gameId}/action`, {
      type: "RECRUIT_UNITS",
      city_id: cityId,
      unit_type: unitType,
      amount: amount,
      hero_id: heroId
    });
  },
  
  heroAttack: async (gameId: string, attackerId: string, defenderId: string) => {
    return await API.post(`/games/${gameId}/action`, {
      type: "HERO_ATTACK",
      attacker_id: attackerId,
      defender_id: defenderId
    });
  }
};

export default API;
