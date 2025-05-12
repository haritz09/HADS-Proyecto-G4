/*
* Datos de muestra para desarrollo
* Implementar:
* - Estado de juego para pruebas
* - Héroes, ciudades, mapas, etc. de ejemplo
*/

import { GameState, Hero, City, Resources, Position, MapTile } from '../types/game';

// Crear un mapa de muestra
export const createSampleMap = (width: number, height: number): MapTile[][] => {
  const map: MapTile[][] = [];
  
  for (let y = 0; y < height; y++) {
    const row: MapTile[] = [];
    for (let x = 0; x < width; x++) {
      // Determinar tipo de terreno
      let terrain: 'grass' | 'forest' | 'mountain' | 'water' | 'desert' | 'snow' = 'grass';
      
      // Probabilidades simples para terrenos
      const rand = Math.random();
      if (rand < 0.6) terrain = 'grass';
      else if (rand < 0.75) terrain = 'forest';
      else if (rand < 0.85) terrain = 'mountain';
      else if (rand < 0.95) terrain = 'water';
      else terrain = 'desert';
      
      // Crear tile
      row.push({
        terrain,
        position: { x, y },
        object: undefined
      });
    }
    map.push(row);
  }
  
  return map;
};

// Crear héroe de muestra
export const createSampleHero = (playerId: string, name: string, position: Position): Hero => {
  return {
    id: `${playerId}-hero-${Date.now()}`,
    name,
    stats: {
      attack: Math.floor(Math.random() * 5) + 1,
      defense: Math.floor(Math.random() * 5) + 1,
      power: Math.floor(Math.random() * 5) + 1,
      knowledge: Math.floor(Math.random() * 5) + 1
    },
    position,
    movementPoints: 20,
    maxMovementPoints: 20,
    army: [],
    artifacts: [],
    experience: 0,
    level: 1,
    portrait: ''
  };
};

// Crear ciudad de muestra
export const createSampleCity = (name: string, position: Position, owner: string | null = null): City => {
  return {
    id: `city-${Date.now()}`,
    name,
    position,
    owner,
    buildings: [
      {
        id: 'town_hall',
        name: 'Ayuntamiento',
        level: 1,
        cost: { gold: 0 },
        requirements: [],
        built: true
      },
      {
        id: 'barracks',
        name: 'Cuartel',
        level: 1,
        cost: { gold: 500, wood: 5 },
        requirements: ['town_hall'],
        built: false
      },
      {
        id: 'marketplace',
        name: 'Mercado',
        level: 1,
        cost: { gold: 500, wood: 5 },
        requirements: ['town_hall'],
        built: false
      }
    ],
    availableUnits: [],
    garrison: []
  };
};

// Estado de juego de muestra
export const sampleGameState: GameState = {
  id: 'sample-game-1',
  scenario: 'sample-scenario',
  turn: 1,
  currentPlayer: 'player1',
  players: [
    {
      id: 'player1',
      name: 'Jugador 1',
      resources: {
        gold: 1000,
        wood: 10,
        stone: 10,
        gems: 5,
        crystal: 5
      },
      cities: ['city1'],
      heroes: ['player1-hero1']
    },
    {
      id: 'ai',
      name: 'IA Enemiga',
      resources: {
        gold: 1000,
        wood: 10,
        stone: 10,
        gems: 5,
        crystal: 5
      },
      cities: ['city2'],
      heroes: ['ai-hero1']
    }
  ],
  map: {
    width: 20,
    height: 20,
    tiles: createSampleMap(20, 20)
  },
  heroes: {
    'player1-hero1': createSampleHero('player1', 'Sir Lancelot', { x: 3, y: 3 }),
    'ai-hero1': createSampleHero('ai', 'Mordred', { x: 16, y: 16 })
  },
  cities: {
    'city1': createSampleCity('Camelot', { x: 5, y: 5 }, 'player1'),
    'city2': createSampleCity('Avalon', { x: 15, y: 15 }, 'ai')
  },
  objects: {
    'resource1': {
      type: 'resource',
      position: { x: 10, y: 10 },
      data: {
        resourceType: 'gold',
        amount: 500
      }
    }
  }
};
