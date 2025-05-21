import { gameService } from './api';
import { Position } from '../types/game';

export interface GameAction {
  type: string;
  details: any;
}

// Crear acción de movimiento de héroe
export const createMoveHeroAction = (heroId: string, destination: Position): GameAction => {
  return {
    type: 'moveHero',
    details: {
      hero_id: heroId,
      destination
    }
  };
};

// Crear acción de fin de turno (simplificada)
export const createEndTurnAction = (): GameAction => {
  return {
    type: 'endTurn',
    details: {} // No se necesitan detalles adicionales
  };
};

// Ejecutar acción en el backend
export const executeAction = async (gameId: string, action: GameAction) => {
  return await gameService.executeAction(gameId, action);
};
