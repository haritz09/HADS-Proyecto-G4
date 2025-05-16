import { gameService } from './api';
import { Position } from '../types/game';

export interface GameAction {
  type: string;
  details: any;
}

export const executeAction = async (gameId: string, action: GameAction) => {
  return await gameService.executeAction(gameId, action);
};

export const createMoveHeroAction = (heroId: string, destination: Position): GameAction => {
  return {
    type: 'moveHero',
    details: {
      heroId,
      destination
    }
  };
};

export const createEndTurnAction = (): GameAction => {
  return {
    type: 'endTurn',
    details: {}
  };
};
