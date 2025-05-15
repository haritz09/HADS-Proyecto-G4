import { GameState } from '../types/game';

interface ScenarioData {
  id: string;
  name: string;
  description: string;
  initialState: GameState;
}

class ScenarioService {
  async loadScenario(scenarioId: string): Promise<ScenarioData> {
    try {
      const response = await fetch(`/api/scenarios/${scenarioId}`);
      if (!response.ok) {
        throw new Error('Error cargando escenario');
      }
      return await response.json();
    } catch (error) {
      console.error('Error loading scenario:', error);
      throw error;
    }
  }

  async startNewGame(scenarioId: string): Promise<{ gameId: string; initialState: GameState }> {
    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scenarioId }),
      });

      if (!response.ok) {
        throw new Error('Error iniciando nueva partida');
      }

      return await response.json();
    } catch (error) {
      console.error('Error starting new game:', error);
      throw error;
    }
  }
}

export const scenarioService = new ScenarioService();
