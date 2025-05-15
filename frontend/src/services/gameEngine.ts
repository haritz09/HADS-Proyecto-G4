/*
* Motor del juego que contiene la lógica principal
* Implementar:
* - Gestión del estado del juego
* - Validación de movimientos
* - Cálculo de combates
* - Cálculo de recursos
*/

import { GameState, Hero, Position, MapTile, Resources, ArmyUnit, ResourceMine } from '../types/game';

// Calcula si un héroe puede moverse a una posición
export const canMoveToPosition = (hero: Hero, target: Position, map: MapTile[][]): boolean => {
  // Implementar validación de movimiento basada en:
  // - Distancia (según puntos de movimiento)
  // - Tipo de terreno (algunos terrenos cuestan más)
  // - Obstáculos (montañas, agua, etc.)
  
  // Implementar algoritmo de pathfinding (A*) para encontrar el camino más corto
  
  return false; // Placeholder
};

// Calcula el coste de movimiento entre celdas
export const calculateMovementCost = (from: MapTile, to: MapTile): number => {
  // Implementar cálculo basado en tipo de terreno
  switch (to.terrain) {
    case 'grass': return 1;
    case 'forest': return 2;
    case 'mountain': return 3;
    case 'water': return Infinity; // No se puede atravesar sin barco
    case 'desert': return 2;
    case 'snow': return 2;
    default: return 1;
  }
};

// Simula un combate entre dos ejércitos
export const simulateCombat = (attackerArmy: ArmyUnit[], defenderArmy: ArmyUnit[]): {
  winner: 'attacker' | 'defender',
  attackerLosses: ArmyUnit[],
  defenderLosses: ArmyUnit[],
} => {
  // Implementar algoritmo de combate que considere:
  // - Estadísticas de las unidades
  // - Cantidad de unidades
  // - Modificadores de terreno
  
  return {
    winner: 'attacker', // Placeholder
    attackerLosses: [],
    defenderLosses: [],
  };
};

// Calcula los recursos generados al final del turno
export const calculateEndTurnResources = (gameState: GameState): Resources => {
  const resources: Resources = {
    gold: 0,
    wood: 0,
    stone: 0
  };
  
  // Procesar recursos del jugador actual
  const entity = gameState.current_player === 'player' ? gameState.player : gameState.ai;
  
  // Recursos de ciudades
  entity.cities.forEach(city => {
    city.buildings.forEach(building => {
      if (building.can_recruit && building.available_creatures) {
        // Sumar recursos de producción de edificios
        // TODO: Implementar cuando se defina la producción de recursos
      }
    });
  });
  
  // Recursos de minas 
  gameState.map.visible_objects
    .filter(obj => 'resource_type' in obj && obj.owner === gameState.current_player)
    .forEach(obj => {
      const mine = obj as ResourceMine;
      if (mine.resource_type in resources) {
        resources[mine.resource_type as keyof Resources] += mine.resource_per_turn;
      }
    });
  
  return resources;
};

// Prepara el estado del juego para el siguiente turno
export const prepareNextTurn = (gameState: GameState): GameState => {
  const newState = { ...gameState };
  
  // Cambiar jugador actual
  newState.current_player = newState.current_player === 'player' ? 'ai' : 'player';
  
  // Incrementar turno si volvemos al jugador
  if (newState.current_player === 'player') {
    newState.turn += 1;
  }
  
  // Restaurar puntos de movimiento de los héroes del jugador actual
  const currentEntity = newState.current_player === 'player' ? newState.player : newState.ai;
  currentEntity.heroes.forEach(hero => {
    hero.stats.movement_points_left = hero.stats.movement_points;
  });
  
  // Crecimiento semanal de unidades (cada 7 turnos)
  if (newState.turn % 7 === 1) {
    [...newState.player.cities, ...newState.ai.cities].forEach(city => {
      city.buildings.forEach(building => {
        if (building.can_recruit && building.available_creatures) {
          building.available_creatures.forEach(creature => {
            creature.count += creature.growth_per_week;
          });
        }
      });
    });
  }
  
  return newState;
};
