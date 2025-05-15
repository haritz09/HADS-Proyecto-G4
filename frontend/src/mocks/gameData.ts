/*
* Datos de muestra para desarrollo
* Implementar:
* - Estado de juego para pruebas
* - Héroes, ciudades, mapas, etc. de ejemplo
*/

import { GameState, Hero, City, Resources, Position, MapTile } from '../types/game';

// Determinar tipo de terreno
const determineTerrainType = (): 'grass' | 'forest' | 'mountain' | 'water' | 'desert' | 'snow' => {
  const rand = Math.random();
  if (rand < 0.6) return 'grass';
  else if (rand < 0.75) return 'forest';
  else if (rand < 0.85) return 'mountain';
  else if (rand < 0.95) return 'water';
  else return 'desert';
};

// Crear un mapa de muestra
export const createSampleMap = (width: number, height: number): MapTile[] => {
  const tiles: MapTile[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      tiles.push({
        terrain: determineTerrainType(),
        passable: true,
        object_type: undefined,
        object_id: undefined
      });
    }
  }
  return tiles;
};

// Crear héroe de muestra
export const createSampleHero = (playerId: string, name: string, position: Position): Hero => ({
  id: `${playerId}-hero-${Date.now()}`,
  name,
  stats: {
    attack: Math.floor(Math.random() * 5) + 1,
    defense: Math.floor(Math.random() * 5) + 1,
    speed: Math.floor(Math.random() * 5) + 1,
    movement_points: 20,
    movement_points_left: 20
  },
  position,
  army: [],
  artifacts: []
});

// Crear ciudad de muestra
export const createSampleCity = (name: string, position: Position, owner: string | null = null): City => ({
  id: `city-${Date.now()}`,
  name,
  position,
  owner,
  buildings: [
    {
      id: 'town_hall',
      name: 'Ayuntamiento',
      position,
      available_creatures: [],
      is_castle: true,
      has_tavern: true,
      can_recruit: true,
      cost: { gold: 0, wood: 0, stone: 0 },
      requirements: [],
      built: true
    }
  ],
  availableUnits: [], // Añadido: array de unidades disponibles para reclutar
  garrison: []        // Añadido: array de unidades en la guarnición
});

// Estado de juego de muestra
export const sampleGameState: GameState = {
  turn: 1,
  current_player: 'player',
  player: {
    heroes: [createSampleHero('player', 'Sir Lancelot', { x: 3, y: 3 })],
    cities: [createSampleCity('Camelot', { x: 5, y: 5 }, 'player')],
    resources: {
      gold: 1000,
      wood: 10,
      stone: 10
    }
  },
  ai: {
    heroes: [createSampleHero('ai', 'Mordred', { x: 16, y: 16 })],
    cities: [createSampleCity('Avalon', { x: 15, y: 15 }, 'ai')],
    resources: {
      gold: 1000,
      wood: 10,
      stone: 10
    }
  },
  map: {
    size: {
      width: 20,
      height: 20
    },
    tiles: createSampleMap(20, 20),
    fog_of_war: Array(400).fill(false),
    explored: [],
    visible_objects: [
      {
        id: 'mine1',
        type: 'goldmine',
        position: { x: 10, y: 10 },
        owner: null,
        resource_type: 'gold',
        resource_per_turn: 500
      }
    ]
  }
};
