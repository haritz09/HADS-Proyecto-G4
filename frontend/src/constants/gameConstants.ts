/*
* Constantes del juego
* Definir:
* - Configuración por defecto
* - Valores para cálculos de juego
* - Tipos y enumeraciones comunes
*/

// Dimensiones del mapa
export const MAP_SIZES = {
  SMALL: { width: 16, height: 16 },
  MEDIUM: { width: 24, height: 24 },
  LARGE: { width: 32, height: 32 },
};

// Costes de movimiento por terreno
export const MOVEMENT_COSTS = {
  grass: 1,
  forest: 2,
  mountain: 3,
  water: Infinity,
  desert: 2,
  snow: 2,
};

// Valores de recursos iniciales por dificultad
export const INITIAL_RESOURCES = {
  EASY: {
    gold: 2000,
    wood: 10,
    stone: 10,
    gems: 5,
    crystal: 5,
  },
  MEDIUM: {
    gold: 1000,
    wood: 5,
    stone: 5,
    gems: 2,
    crystal: 2,
  },
  HARD: {
    gold: 500,
    wood: 3,
    stone: 3,
    gems: 1,
    crystal: 1,
  },
};

// Configuración de héroes
export const HERO_CONFIG = {
  BASE_MOVEMENT_POINTS: 20,
  LEVEL_UP_EXPERIENCE: 1000,
  MAX_ARTIFACTS: 7,
  MAX_ARMY_SLOTS: 7,
};

// Configuración de combate
export const COMBAT_CONFIG = {
  ATTACK_BONUS: 0.1, // 10% de daño extra por punto de ataque
  DEFENSE_BONUS: 0.05, // 5% de reducción de daño por punto de defensa
  TERRAIN_BONUS: {
    forest: { defense: 0.2 }, // 20% de bonificación a la defensa en bosque
    mountain: { defense: 0.3 }, // 30% de bonificación a la defensa en montaña
    castle: { defense: 0.5 }, // 50% de bonificación a la defensa en castillo
  },
};

// Tipos de edificios
export const BUILDING_TYPES = {
  TOWN_HALL: 'town_hall',
  FORT: 'fort',
  MARKETPLACE: 'marketplace',
  RESOURCE_SILO: 'resource_silo',
  MAGE_GUILD: 'mage_guild',
  BLACKSMITH: 'blacksmith',
  TAVERN: 'tavern',
  DWELLING_TIER_1: 'dwelling_tier_1',
  DWELLING_TIER_2: 'dwelling_tier_2',
  DWELLING_TIER_3: 'dwelling_tier_3',
};

// Configuración de recursos
export const RESOURCE_CONFIG = {
  MINE_PRODUCTION: {
    gold: 500,
    wood: 5,
    stone: 5,
    gems: 2,
    crystal: 2,
  },
  CITY_BASE_INCOME: 500, // Oro base por ciudad y turno
};

// Tiempo de respuesta máximo para AI
export const AI_RESPONSE_TIMEOUT = 30000; // 30 segundos

// Acciones del juego
export enum GameAction {
  MOVE_HERO = 'move_hero',
  ATTACK = 'attack',
  BUILD = 'build',
  RECRUIT = 'recruit',
  END_TURN = 'end_turn',
  COLLECT_RESOURCE = 'collect_resource',
  INTERACT_OBJECT = 'interact_object',
}

// Estado de la partida
export enum GameStatus {
  ONGOING = 'ongoing',
  VICTORY = 'victory',
  DEFEAT = 'defeat',
  DRAW = 'draw',
}
