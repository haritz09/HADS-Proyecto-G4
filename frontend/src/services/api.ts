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
  withCredentials: true,
  timeout: 5000
});

// Interceptor para agregar el token de autenticación
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Ensure headers are accessible
    config.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000';
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
    return await API.post(`/games/${gameId}/save`, gameState);
  },
  
  // Acciones del juego usando el sistema unificado de acciones
  executeAction: async (gameId: string, action: any) => {
    return await API.post(`/games/${gameId}/action`, action);
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
