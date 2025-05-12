/*
* Definiciones de tipos para el juego
* Implementar interfaces para:
* - Entidades del juego (Héroes, Unidades, Ciudades, etc.)
* - Estado del juego
* - Acciones del juego
*/

// Tipos de terreno
export type TerrainType = 'grass' | 'forest' | 'mountain' | 'water' | 'desert' | 'snow';

// Tipo de recursos
export type ResourceType = 'gold' | 'wood' | 'stone' | 'gems' | 'crystal';

// Interfaz para los recursos del jugador
export interface Resources {
  gold: number;
  wood: number;
  stone: number;
  gems: number;
  crystal: number;
}

// Interfaz para una posición en el mapa
export interface Position {
  x: number;
  y: number;
}

// Interfaz para estadísticas de un héroe
export interface HeroStats {
  attack: number;
  defense: number;
  power: number;
  knowledge: number;
}

// Interfaz para una unidad
export interface Unit {
  id: string;
  name: string;
  attack: number;
  defense: number;
  health: number;
  speed: number;
  quantity: number;
  tier: number;
  cost: Partial<Resources>;
}

// Interfaz para un héroe
export interface Hero {
  id: string;
  name: string;
  stats: HeroStats;
  position: Position;
  movementPoints: number;
  maxMovementPoints: number;
  army: Unit[];
  artifacts: Artifact[];
  experience: number;
  level: number;
  portrait: string;
}

// Interfaz para un artefacto
export interface Artifact {
  id: string;
  name: string;
  description: string;
  bonuses: Partial<HeroStats>;
  slot: 'head' | 'neck' | 'armor' | 'weapon' | 'shield' | 'boots' | 'misc';
}

// Interfaz para un edificio
export interface Building {
  id: string;
  name: string;
  level: number;
  cost: Partial<Resources>;
  requirements: string[];
  produces?: Produces;
  built: boolean;
}

// Interfaz para una ciudad
export interface City {
  id: string;
  name: string;
  position: Position;
  owner: string | null;
  buildings: Building[];
  availableUnits: {
    unitId: string;
    amount: number;
  }[];
  garrison: Unit[];
}

// Interfaz para una celda del mapa
export interface MapTile {
  terrain: TerrainType;
  position: Position;
  object?: {
    type: 'resource' | 'dwelling' | 'artifact' | 'city' | 'hero' | 'obstacle';
    id?: string;
    visitable: boolean;
    explored: boolean;
  };
}

// Interfaz para el estado del juego
export interface GameState {
  id: string;
  scenario: string;
  turn: number;
  currentPlayer: string;
  players: {
    id: string;
    name: string;
    resources: Resources;
    cities: string[];
    heroes: string[];
  }[];
  map: {
    width: number;
    height: number;
    tiles: MapTile[][];
  };
  heroes: { [id: string]: Hero };
  cities: { [id: string]: City };
  objects: {
    [id: string]: {
      type: string;
      position: Position;
      data: any;
    };
  };
}

// Interfaz para un jugador
export interface Player {
  id: string;
  name: string;
  resources: Resources;
  // Add other player properties as needed
}

// Interfaz para la producción de un edificio
export interface Produces {
  resource?: ResourceType;
  amount?: number;
  unit?: string;
  unitPerWeek?: number;
  unitCost?: Record<string, number>; // Add this property
}
