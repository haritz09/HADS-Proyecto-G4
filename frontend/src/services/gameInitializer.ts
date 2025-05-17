import { GameState, City, Building, Position } from '../types/game';

const INITIAL_BUILDINGS = [
  {
    type: 'castle',
    name: 'Castle',
    cost: { gold: 1000, wood: 500, stone: 500 }
  },
  {
    type: 'barracks',
    name: 'Barracks',
    cost: { gold: 400, wood: 200, stone: 100 }
  },
  {
    type: 'stable',
    name: 'Stable',
    cost: { gold: 400, wood: 300, stone: 100 }
  },
  // Añade más edificios según logic.py
];

export function initializeCity(position: Position, owner: string): City {
  const centralCastle: Building = {
    id: `building-castle-${position.x}-${position.y}`,
    name: 'Central Castle',
    position: position,
    building_type: 'castle',
    built: true,
    can_recruit: true,
    is_castle: true,
    has_tavern: true,
    requirements: [],
    cost: INITIAL_BUILDINGS[0].cost,
    available_creatures: [],
    owner: owner
  };

  return {
    id: `city-${position.x}-${position.y}`,
    name: 'Central City',
    position: position,
    owner: owner,
    buildings: [centralCastle],
    garrison: [],
    availableUnits: []
  };
}

export function initializeGameWithCities(baseGameState: GameState): GameState {
  // Añadir ciudad central con castillo
  const centerX = Math.floor(baseGameState.map.size.width / 2);
  const centerY = Math.floor(baseGameState.map.size.height / 2);
  
  const centralCity = initializeCity(
    { x: centerX, y: centerY },
    'player'
  );

  return {
    ...baseGameState,
    cities: [centralCity]
  };
}
