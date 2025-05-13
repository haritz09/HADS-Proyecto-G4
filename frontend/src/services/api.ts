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
  login: async (username: string, password: string, email: string) => {
    const response = await API.post('/auth/login', { username, password, email });
    if (response.data && response.data.token) {
      localStorage.setItem('authToken', response.data.token);
      API.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
    }
    return response.data;
  },
  
  register: async (username: string, email: string, password: string) => {
    const response = await API.post('/auth/register', { username, email, password });
    localStorage.setItem('authToken', response.data.token);
    return response.data;
  },
  
  logout: () => {
    localStorage.removeItem('authToken');
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
    return await API.post('/games', { scenarioId });
  },
  
  getSavedGames: async () => {
    return await API.get('/games');
  },
  
  loadGame: async (gameId: string) => {
    return await API.get(`/games/${gameId}`);
  },
  
  saveGame: async (gameId: string, gameState: any) => {
    return await API.post(`/games/${gameId}/save`, gameState);
  },
  
  // Acciones del juego
  moveHero: async (gameId: string, heroId: string, destination: { x: number, y: number }) => {
    return await API.post(`/games/${gameId}/actions/move`, { heroId, destination });
  },
  
  interactWithObject: async (gameId: string, heroId: string, objectId: string) => {
    return await API.post(`/games/${gameId}/actions/interact`, { heroId, objectId });
  },
  
  endTurn: async (gameId: string) => {
    return await API.post(`/games/${gameId}/actions/endTurn`);
  },
  
  // Gestión de ciudades
  buildBuilding: async (gameId: string, cityId: string, buildingId: string) => {
    return await API.post(`/games/${gameId}/cities/${cityId}/build`, { buildingId });
  },
  
  recruitUnits: async (gameId: string, cityId: string, unitId: string, amount: number, heroId?: string) => {
    return await API.post(`/games/${gameId}/cities/${cityId}/recruit`, { unitId, amount, heroId });
  }
};

export default API;
