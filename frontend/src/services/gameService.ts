import axios from 'axios';
import { authService } from './authService';
import { GameState } from '../types/gameTypes';

export interface GameServiceResponse {
    data: {
        game_state: GameState;
        [key: string]: any;
    };
}

export interface GameService {
    loadGame: (gameId: string) => Promise<GameServiceResponse>;
    saveGame: (gameId: string, gameState: GameState) => Promise<GameServiceResponse>;
    executeAction: (gameId: string, action: any) => Promise<GameServiceResponse>;
}

export const gameService: GameService = {
    loadGame: async (gameId: string) => {
        const response = await axios.get(`/api/games/${gameId}`, {
            headers: {
                Authorization: `Bearer ${authService.getToken()}`,
            },
        });
        return response.data;
    },
    saveGame: async (gameId: string, gameState: GameState) => {
        const response = await axios.put(`/api/games/${gameId}`, gameState, {
            headers: {
                Authorization: `Bearer ${authService.getToken()}`,
            },
        });
        return response.data;
    },
    executeAction: async (gameId: string, action: any) => {
        try {
            console.log('Executing action:', { gameId, action });
            const response = await axios.post(`/api/games/${gameId}/actions`, action, {
                headers: {
                    Authorization: `Bearer ${authService.getToken()}`,
                },
            });
            console.log('Action response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Action error:', error);
            throw error;
        }
    },
};