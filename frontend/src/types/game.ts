export interface MapSize {
  width: number;
  height: number;
}

export interface Resources {
  gold: number;
  wood: number;
  stone: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface Stats {
  attack: number;
  defense: number;
  speed: number;
  movement_points: number;
  movement_points_left: number;
}

export interface ArmyUnit {
  type: string;
  count: number;
  stats?: Stats;
}

export interface Unit {
  id: string;
  type: string;
  count: number;
  stats: Stats;
}

export interface Artifact {
  id: string;
  name: string;
  subtype: 'totemDeGuerra' | 'totemVelocidad' | 'reclutamiento';
  effect: Record<string, any>;
}

export interface Hero {
  id: string;
  name: string;
  position: Position;
  stats: Stats;
  army: ArmyUnit[];
  artifacts: any[];
}

export interface Creature {
  id: string;
  type: string;
  name: string;  // Añadido
  count: number;
  growth_per_week: number;
  unit_cost: Resources;  // Cambiado de cost a unit_cost
  stats: Stats;
}

// Nueva interfaz para las criaturas disponibles para reclutamiento
export interface AvailableCreature {
  type: string;  // El tipo sirve como identificador único
  name?: string;
  count: number;
  growth_per_week: number;
  unit_cost?: Resources;  // Opcional, para evitar errors de tipado
  recruit_cost?: Resources;  // Alias alternativo usado en algunos endpoints
  stats: Stats;
}

export interface MapTile {
  terrain: string;
  passable: boolean;
  object_type?: string;
  object_id?: string;
}

// Base interface for all visible objects on the map
export interface VisibleObject {
  id: string;
  type?: string;
  position: Position;
  owner?: string | null;
  justCaptured?: boolean; // Added property for animation
}

// Specialized interface for resource mines
export interface ResourceMine extends VisibleObject {
  type: 'goldmine' | 'sawmill' | 'quarry' | string;
  resource_type: 'gold' | 'wood' | 'stone' | string;
  resource_per_turn: number;
  symbol?: string; // Símbolo personalizable para mostrar en el mapa
}

// Specialized interface for artifacts
export interface ArtifactObject extends VisibleObject {
  type: 'artifact';
  subtype: string;
  name: string;
  effect?: any;
}

export interface Building {
  id: string;
  name: string;
  position: Position;
  building_type: string;  // Incluye 'knights_tower' y 'dragons_lair'
  cost: { gold: number; wood: number; stone: number };
  built: boolean;
  can_recruit: boolean;
  is_castle: boolean;
  has_tavern: boolean;
  requirements: string[];
  available_creatures: AvailableCreature[];
  owner: string | null;
}

export interface City {
  id: string;
  name: string;
  position: Position;
  owner: string | null; // Cambiado de string a string | null
  buildings: Building[];
  garrison?: ArmyUnit[];
  availableUnits?: any[];
}

export interface GameMap {
  size: {
    width: number;
    height: number;
  };
  tiles: MapTile[];
  fog_of_war: boolean[];
  explored: any[];
  visible_objects: (VisibleObject | ResourceMine | ArtifactObject)[];
}

export interface GameState {
  turn: number;
  current_player: string;
  player: {
    heroes: Hero[];
    cities: City[];
    resources: Resources;
  };
  ai: {
    heroes: Hero[];
    cities: City[];
    resources: Resources;
  };
  map: GameMap;
  cities?: City[]; // Optional cities directly on gameState
}
