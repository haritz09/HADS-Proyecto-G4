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

export interface AvailableCreature {
  type: string;
  count: number;
  growth_per_week: number;
  stats: Stats;
  recruit_cost: Record<string, number>;
}

export interface Building {
  id: string;
  name: string;
  position: Position;
  cost: Partial<Resources>;
  requirements: string[];
  built: boolean;
  produces?: {
    resource?: keyof Resources;
    amount?: number;
    unit?: string;
    unitCost?: Record<string, number>;
  };
  available_creatures: AvailableCreature[];
  is_castle: boolean;
  has_tavern: boolean;
  can_recruit: boolean;
}

export interface City {
  id: string;
  name: string;
  position: Position;
  buildings: Building[];
  owner: string | null;
  availableUnits: {
    unitId: string;
    amount: number;
  }[];
  garrison: Unit[];
}

export interface ResourceMine {
  id: string;
  type: 'goldmine' | 'sawmill' | 'quarry';
  position: Position;
  owner: string | null;
  resource_type: 'gold' | 'wood' | 'stone';
  resource_per_turn: number;
}

export interface Entity {
  heroes: Hero[];
  resources: Resources;
  cities: City[];
}

export interface MapObject {
  type: 'resource' | 'dwelling' | 'artifact' | 'city' | 'hero' | 'obstacle';
  id?: string;
  visitable: boolean;
  explored: boolean;
}

export interface MapTile {
  terrain: string;
  passable: boolean;
  object?: MapObject;
  object_id?: string;
  object_type?: string;
}

export interface GameMap {
  size: MapSize;
  tiles: MapTile[];
  fog_of_war: boolean[];
  explored: any[];
  visible_objects: (ResourceMine | Artifact)[];
}

export interface GameState {
  turn: number;
  player: Entity;
  ai: Entity;
  map: GameMap;
  current_player: string;
}

// Estas interfaces son para la gestión de partidas guardadas
export interface GameBase {
  user_id: string;
  name: string;
  scenario_id: string;
  created_at: string;
  last_saved: string;
  is_autosave: boolean;
  cheats_used: string[];
  game_state: GameState;
}

export interface Game extends GameBase {
  id: string;
}

export interface ScenarioBase {
  name: string;
  description: string;
  difficulty: string;
  map_size: MapSize;
  initial_state: Record<string, any>;
}

export interface Scenario extends ScenarioBase {
  id: string;
}
