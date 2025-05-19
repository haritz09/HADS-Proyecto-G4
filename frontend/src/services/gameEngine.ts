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
  // Verificar si hay suficientes puntos de movimiento
  const path = findPath(hero.position, target, map);
  if (!path.length) return false;
  
  // Calcular el costo total del camino
  const totalCost = calculatePathCost(path, map);
  
  // Verificar si el héroe tiene suficientes puntos de movimiento
  return totalCost <= hero.stats.movement_points_left;
};

// Calcula el costo total de un camino
export const calculatePathCost = (path: Position[], map: MapTile[][]): number => {
  let cost = 0;
  
  for (let i = 0; i < path.length - 1; i++) {
    const current = path[i];
    const next = path[i + 1];
    
    // Coste por tipo de terreno
    const from = map[current.y][current.x];
    const to = map[next.y][next.x];
    const terrainCost = calculateMovementCost(from, to);
    
    // Coste adicional por movimiento diagonal
    const isDiagonal = current.x !== next.x && current.y !== next.y;
    const moveCost = isDiagonal ? 1.414 : 1; // sqrt(2) para diagonales
    
    cost += moveCost * terrainCost;
  }
  
  return cost;
};

// Encuentra un camino usando el algoritmo A*
export const findPath = (start: Position, target: Position, map: MapTile[][]): Position[] => {
  
  if (!map || !map.length || !map[0].length) {
    console.error(`[PathFinding] ERROR: Mapa inválido o vacío`);
    return [];
  }
  
  const rows = map.length;
  const cols = map[0].length;
  
  
  // Verificar límites del mapa
  if (target.x < 0 || target.x >= cols || target.y < 0 || target.y >= rows) {
    console.error(`[PathFinding] ERROR: Target (${target.x},${target.y}) fuera de los límites del mapa (${cols}x${rows})`);
    return [];
  }
  if (start.x < 0 || start.x >= cols || start.y < 0 || start.y >= rows) {
    console.error(`[PathFinding] ERROR: Start (${start.x},${start.y}) fuera de los límites del mapa (${cols}x${rows})`);
    return [];
  }
  
  // No buscar camino si la casilla destino es agua y no es la posición actual
  if (map[target.y][target.x].terrain === 'water' && (start.x !== target.x || start.y !== target.y)) {
    console.error(`[PathFinding] ERROR: Destino en agua (${target.x},${target.y}), no se puede encontrar camino`);
    return [];
  }

  console.log(`[PathFinding] Verificaciones iniciales pasadas, ejecutando algoritmo A*`);
  
  // Definir direcciones de movimiento (8 direcciones, incluyendo diagonales)
  const directions = [
    {x: 0, y: -1}, {x: 1, y: -1}, {x: 1, y: 0}, {x: 1, y: 1},
    {x: 0, y: 1}, {x: -1, y: 1}, {x: -1, y: 0}, {x: -1, y: -1}
  ];
  
  // Inicializar estructuras para A*
  const openSet: Position[] = [start];
  const closedSet: boolean[][] = Array(rows).fill(0).map(() => Array(cols).fill(false));
  const gScore: number[][] = Array(rows).fill(0).map(() => Array(cols).fill(Infinity));
  const fScore: number[][] = Array(rows).fill(0).map(() => Array(cols).fill(Infinity));
  const cameFrom: {[key: string]: Position} = {};
  
  gScore[start.y][start.x] = 0;
  fScore[start.y][start.x] = heuristic(start, target);
  
  let iterations = 0;
  const MAX_ITERATIONS = 1000; // Límite de seguridad para evitar bucles infinitos
  
  while (openSet.length > 0) {
    iterations++;
    if (iterations > MAX_ITERATIONS) {
      console.error(`[PathFinding] ERROR: Excedido máximo de iteraciones (${MAX_ITERATIONS})`);
      return [];
    }
    
    // Encontrar el nodo con menor fScore
    let current = openSet[0];
    let lowestFScore = fScore[current.y][current.x];
    let currentIndex = 0;
    
    for (let i = 1; i < openSet.length; i++) {
      const score = fScore[openSet[i].y][openSet[i].x];
      if (score < lowestFScore) {
        lowestFScore = score;
        current = openSet[i];
        currentIndex = i;
      }
    }
    
    // Si hemos alcanzado el destino, reconstruir y devolver el camino
    if (current.x === target.x && current.y === target.y) {
      console.log(`[PathFinding] ÉXITO: Destino alcanzado en ${iterations} iteraciones`);
      const path = reconstructPath(cameFrom, current);
      console.log(`[PathFinding] Camino encontrado con ${path.length} pasos: ${path.map(p => `(${p.x},${p.y})`).join(' → ')}`);
      return path;
    }
    
    // Sacar el nodo actual del openSet y marcarlo como visitado
    openSet.splice(currentIndex, 1);
    closedSet[current.y][current.x] = true;
    
    // Explorar vecinos
    for (const dir of directions) {
      const neighbor = {
        x: current.x + dir.x,
        y: current.y + dir.y
      };
      
      // Validar límites
      if (neighbor.x < 0 || neighbor.x >= cols || neighbor.y < 0 || neighbor.y >= rows) {
        continue;
      }
      
      // Ignorar nodos ya evaluados
      if (closedSet[neighbor.y][neighbor.x]) {
        continue;
      }
      
      // Ignorar terreno impassable (agua)
      if (map[neighbor.y][neighbor.x].terrain === 'water') {
        console.log(`[PathFinding] Ignorando vecino en (${neighbor.x},${neighbor.y}) porque es agua`);
        continue;
      }
      
      // Calcular costo de movimiento (mayor para diagonal)
      const isDiagonal = dir.x !== 0 && dir.y !== 0;
      const moveCost = isDiagonal ? 1.414 : 1; // sqrt(2) para diagonales
      
      // Costo del terreno
      const terrainCost = calculateMovementCost(map[current.y][current.x], map[neighbor.y][neighbor.x]);
      
      // Costo acumulado hasta este vecino
      const tentativeGScore = gScore[current.y][current.x] + (moveCost * terrainCost);
      
      // Si no está en openSet, añadirlo
      const neighborInOpenSet = openSet.some(pos => pos.x === neighbor.x && pos.y === neighbor.y);
      if (!neighborInOpenSet) {
        openSet.push({...neighbor});
      } else if (tentativeGScore >= gScore[neighbor.y][neighbor.x]) {
        // No es un camino mejor
        continue;
      }
      
      // Este es el mejor camino hasta ahora
      const key = `${neighbor.x},${neighbor.y}`;
      cameFrom[key] = {...current};
      gScore[neighbor.y][neighbor.x] = tentativeGScore;
      fScore[neighbor.y][neighbor.x] = tentativeGScore + heuristic(neighbor, target);
    }
  }
  
  // No se encontró camino
  console.error(`[PathFinding] ERROR: No se encontró camino después de ${iterations} iteraciones`);
  return [];
};

// Reconstruye el camino desde el destino hasta el inicio
const reconstructPath = (cameFrom: {[key: string]: Position}, current: Position): Position[] => {
  const path = [current];
  let key = `${current.x},${current.y}`;
  
  while (key in cameFrom) {
    current = cameFrom[key];
    path.unshift(current);
    key = `${current.x},${current.y}`;
  }
  
  return path;
};

// Heurística: distancia euclidiana
const heuristic = (a: Position, b: Position): number => {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
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

export function updateAvailableCreatures(state: GameState): GameState {
  const newState = { ...state };
  
  [...newState.player.cities, ...newState.ai.cities].forEach(city => {
    city.buildings.forEach(building => {
      if (building.can_recruit && building.available_creatures) {
        building.available_creatures = building.available_creatures.map(creature => ({
          ...creature,
          count: creature.count + (creature.growth_per_week || 0)
        }));
      }
    });
  });

  return newState;
}
