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
  stats: Stats;
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
  artifacts: Artifact[];
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

export interface MapTile {
  terrain: 'grass' | 'forest' | 'mountain' | 'water' | 'desert' | 'snow';
  passable: boolean;
  object_type?: string;
  object_id?: string;
}

export interface Building {
  id: string;
  name: string;
  position: Position;
  building_type: string;
  cost: { gold: number; wood: number; stone: number };
  built: boolean;
  can_recruit: boolean;
  is_castle: boolean;
  has_tavern: boolean;
  requirements: string[];
  available_creatures: any[];
  owner: string | null;  // Add this line
}

export interface City {
  id: string;
  name: string;
  position: Position;
  owner: string;
  buildings: Building[];
  garrison: Creature[]; // Cambiado de Hero[] a Creature[]
  availableUnits: {
    unitId: string;
    amount: number;
  }[];
}

export interface GameState {
  turn: number;
  current_player: 'player' | 'ai';
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
  map: {
    size: MapSize;
    tiles: MapTile[];
    fog_of_war: boolean[];
    explored: boolean[];
    visible_objects: VisibleObject[];
  };
  cities: City[];
}

export interface ResourceMine extends VisibleObject {
  resource_type: keyof Resources;
  resource_per_turn: number;
}

export interface VisibleObject {
  id: string;
  type: string;
  position: Position;
  owner: string | null;
  resource_type?: string;
  resource_per_turn?: number;
}
