/*
* Motor del juego que contiene la lógica principal
* Implementar:
* - Gestión del estado del juego
* - Validación de movimientos
* - Cálculo de combates
* - Cálculo de recursos
*/

import { GameState, Hero, Position, MapTile, Resources, Unit } from '../types/game';

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
export const simulateCombat = (attackerArmy: Unit[], defenderArmy: Unit[]): {
  winner: 'attacker' | 'defender',
  attackerLosses: Unit[],
  defenderLosses: Unit[],
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
export const calculateEndTurnResources = (gameState: GameState, playerId: string): Resources => {
  const player = gameState.players.find(p => p.id === playerId);
  if (!player) throw new Error('Player not found');
  
  // Recursos base
  const resources: Resources = {
    gold: 0,
    wood: 0,
    stone: 0,
    gems: 0,
    crystal: 0,
  };
  
  // Recursos de ciudades
  player.cities.forEach(cityId => {
    const city = gameState.cities[cityId];
    city.buildings.forEach(building => {
      if (building.built && building.produces?.resource) {
        const resource = building.produces.resource;
        const amount = building.produces.amount || 0;
        resources[resource] = (resources[resource] || 0) + amount;
      }
    });
  });
  
  // Recursos de minas y otros objetos del mapa
  Object.values(gameState.objects).forEach(obj => {
    if (obj.type === 'resource' && obj.data.owner === playerId) {
      const resource = obj.data.resourceType as keyof Resources;
      const amount = obj.data.amount || 0;
      resources[resource] = (resources[resource] || 0) + amount;
    }
  });
  
  return resources;
};

// Prepara el estado del juego para el siguiente turno
export const prepareNextTurn = (gameState: GameState): GameState => {
  // Crear una copia del estado para no mutar el original
  const newState = { ...gameState };
  
  // Incrementar contador de turno si todos los jugadores han jugado
  const playerIndex = newState.players.findIndex(p => p.id === newState.currentPlayer);
  const nextPlayerIndex = (playerIndex + 1) % newState.players.length;
  
  if (nextPlayerIndex === 0) {
    newState.turn += 1;
  }
  
  // Actualizar jugador actual
  newState.currentPlayer = newState.players[nextPlayerIndex].id;
  
  // Restaurar puntos de movimiento de los héroes del jugador actual
  Object.values(newState.heroes).forEach(hero => {
    if (hero.id.startsWith(newState.currentPlayer)) {
      hero.movementPoints = hero.maxMovementPoints;
    }
  });
  
  // Actualizar recursos del jugador que acaba de terminar su turno
  const currentPlayer = newState.players[playerIndex];
  const newResources = calculateEndTurnResources(gameState, currentPlayer.id);
  
  // Sumar los nuevos recursos a los existentes
  newState.players[playerIndex].resources = {
    gold: currentPlayer.resources.gold + newResources.gold,
    wood: currentPlayer.resources.wood + newResources.wood,
    stone: currentPlayer.resources.stone + newResources.stone,
    gems: currentPlayer.resources.gems + newResources.gems,
    crystal: currentPlayer.resources.crystal + newResources.crystal,
  };
  
  // Actualizar unidades disponibles en ciudades (semanalmente)
  if (newState.turn % 7 === 1) {
    Object.values(newState.cities).forEach(city => {
      city.buildings.forEach(building => {
        if (building.built && building.produces?.unit) {
          const unitId = building.produces.unit;
          const amount = building.produces.unitPerWeek || 0;
          
          const existingUnitIndex = city.availableUnits.findIndex(u => u.unitId === unitId);
          
          if (existingUnitIndex >= 0) {
            city.availableUnits[existingUnitIndex].amount += amount;
          } else {
            city.availableUnits.push({
              unitId,
              amount
            });
          }
        }
      });
    });
  }
  
  return newState;
};
