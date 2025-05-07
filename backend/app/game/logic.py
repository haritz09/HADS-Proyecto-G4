from typing import Dict, Any, Tuple, List
from backend.app.db.schema import (
    GameState, Position, Entity, Heroe, ArmyUnit, Stats, City,
    Building, AvailableCreature, Resources
)
import math
import random

# Constantes del sistema
XP_POR_COMBATE = 100
XP_POR_NIVEL = 1000
PUNTOS_POR_NIVEL = 5
MAX_NIVEL = 20
EXPERIENCE_PER_COMBAT = 100
LEVELS_THRESHOLDS = [100, 300, 600, 1000, 1500]  # Experiencia necesaria para cada nivel
STAT_POINTS_PER_LEVEL = 2
MOVEMENT_POINTS_BASE = 10

def calculate_distance(pos1: Position, pos2: Position) -> float:
    """Calcula la distancia entre dos posiciones."""
    return math.sqrt((pos2.x - pos1.x) ** 2 + (pos2.y - pos1.y) ** 2)

def has_enough_movement_points(hero: Heroe, start: Position, end: Position) -> bool:
    """Verifica si un héroe tiene suficientes puntos de movimiento."""
    distance = calculate_distance(start, end)
    return hero.stats.movement_points_left >= distance

def has_enough_resources(entity: Any, cost: Dict[str, int]) -> bool:
    """Verifica si una entidad tiene suficientes recursos."""
    resources = entity.resources if hasattr(entity, 'resources') else entity
    for resource, amount in cost.items():
        if getattr(resources, resource, 0) < amount:
            return False
    return True

def deduct_resources(entity: Any, cost: Dict[str, int]) -> None:
    """Deduce recursos de una entidad."""
    resources = entity.resources if hasattr(entity, 'resources') else entity
    for resource, amount in cost.items():
        current = getattr(resources, resource, 0)
        setattr(resources, resource, current - amount)

def calculate_level(experience: int) -> int:
    """Calcula el nivel basado en la experiencia"""
    for level, threshold in enumerate(LEVELS_THRESHOLDS, 1):
        if experience < threshold:
            return level
    return len(LEVELS_THRESHOLDS) + 1

def process_hero_movement(game_state: GameState, action: Dict[str, Any]) -> Dict[str, Any]:
    """Procesa el movimiento de un héroe"""
    hero_id = action["hero_id"]
    target_position = Position(**action["target_position"])
    
    # Encontrar el héroe
    hero = next((h for h in game_state.player.heroes if h.id == hero_id), None)
    if not hero:
        raise ValueError("Héroe no encontrado")
        
    # Validar puntos de movimiento
    movement_cost = calculate_movement_cost(hero.position, target_position, game_state.map)
    if hero.stats.movement_points_left < movement_cost:
        raise ValueError("Puntos de movimiento insuficientes")
        
    # Validar terreno y objeto en destino
    check_terrain_passable(target_position, game_state.map)
    
    # Actualizar posición y puntos de movimiento
    hero.stats.movement_points_left -= movement_cost
    hero.position = target_position
    
    # Procesar recursos o objetos en la casilla
    result = process_tile_interaction(hero, target_position, game_state)
    
    return result

def process_hero_attack(game_state: GameState, action: Dict[str, Any]) -> Dict[str, Any]:
    """Procesa el ataque de un héroe a otro"""
    attacker_id = action["attacker_id"]
    defender_id = action["defender_id"]
    
    # Encontrar héroes
    attacker = next((h for h in game_state.player.heroes if h.id == attacker_id), None)
    defender = next((h for h in game_state.ai.heroes if h.id == defender_id), None)
    
    if not attacker or not defender:
        raise ValueError("Héroe no encontrado")
    
    # Resolver combate por turnos basado en velocidad
    combat_result = resolve_combat(attacker, defender)
    
    # Otorgar experiencia al ganador
    if combat_result["winner"] == "player":
        grant_experience(attacker, EXPERIENCE_PER_COMBAT)
    
    return combat_result

def process_recruitment(game_state: GameState, action: Dict[str, Any]) -> Dict[str, Any]:
    """Procesa el reclutamiento de unidades en un edificio de una ciudad"""
    city_id = action["city_id"]
    unit_type = action["unit_type"]
    amount = action["amount"]
    building_id = action.get("building_id")  # Permitir especificar el edificio

    # Encontrar la ciudad
    city = next((c for c in game_state.player.cities if c.id == city_id), None)
    if not city:
        raise ValueError("Ciudad no encontrada")

    # Encontrar el edificio (por defecto el castillo si no se especifica)
    building = None
    if building_id:
        building = next((b for b in city.buildings if b.id == building_id), None)
    else:
        building = next((b for b in city.buildings if b.is_castle), None)
    if not building:
        raise ValueError("Edificio de reclutamiento no encontrado")
    if not building.can_recruit:
        raise ValueError("Este edificio no permite reclutar unidades")

    # Validar disponibilidad de unidades
    available = next((u for u in building.available_creatures if u.type == unit_type), None)
    if not available or available.count < amount:
        raise ValueError("Unidades no disponibles")

    # Validar recursos
    cost = {k: v * amount for k, v in available.recruit_cost.items()}
    if not has_enough_resources(game_state.player, cost):
        raise ValueError("Recursos insuficientes")

    # Realizar reclutamiento
    available.count -= amount
    deduct_resources(game_state.player, cost)
    add_units_to_hero_or_city(city, unit_type, amount, game_state)

    return {"recruited": amount, "type": unit_type}

def add_units_to_hero_or_city(city: City, unit_type: str, amount: int, game_state: GameState) -> None:
    """Añade unidades reclutadas al ejército del primer héroe de la ciudad, o a la guarnición si no hay héroe."""
    # Buscar héroe en la ciudad
    hero = next((h for h in game_state.player.heroes if h.position.x == city.position.x and h.position.y == city.position.y), None)
    if hero:
        # Añadir a ejército del héroe
        unit = next((u for u in hero.army if u.type == unit_type), None)
        if unit:
            unit.count += amount
        else:
            hero.army.append(ArmyUnit(type=unit_type, count=amount))
    else:
        # Si no hay héroe, podrías implementar una guarnición de ciudad aquí
        pass  # Implementación opcional

def process_end_turn(game_state: GameState) -> Dict[str, Any]:
    """Procesa el final del turno"""
    current_player = game_state.current_player
    
    # Restaurar puntos de movimiento
    for hero in game_state.player.heroes:
        hero.stats.movement_points_left = hero.stats.movement_points
    
    # Cambiar el jugador actual
    game_state.current_player = "ai" if current_player == "player" else "player"
    
    # Si es un nuevo día
    if current_player == "ai":  # El turno de la IA es el último del día
        game_state.turn += 1
        
        # Procesar crecimiento semanal si estamos en múltiplo de 7
        if game_state.turn % 7 == 0:
            for city in game_state.player.cities + game_state.ai.cities:
                for building in getattr(city, 'buildings', []):
                    for creature in getattr(building, 'available_creatures', []):
                        creature.count += getattr(creature, 'growth_per_week', 0)
    
    return {
        "next_player": game_state.current_player,
        "turn": game_state.turn
    }

# Funciones auxiliares
def calculate_movement_cost(start: Position, end: Position, game_map: Any) -> float:
    """Calcula el coste de movimiento entre dos posiciones usando distancia euclídea."""
    return math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2)

def check_terrain_passable(position: Position, game_map: Any) -> bool:
    """Verifica si el terreno es transitable"""
    # Implementación simplificada
    return True

def process_tile_interaction(hero: Heroe, position: Position, game_state: GameState) -> Dict[str, Any]:
    """Procesa la interacción con objetos en la casilla"""
    # Implementación simplificada
    return {"interaction": "none"}

def resolve_combat(attacker: Heroe, defender: Heroe) -> Dict[str, Any]:
    """Resuelve un combate entre dos héroes"""
    # Sistema de combate por turnos basado en velocidad
    combat_order = []
    
    # Crear lista de unidades ordenada por velocidad
    units = []
    for army in [attacker.army, defender.army]:
        for unit in army:
            units.append({
                "unit": unit,
                "speed": get_unit_speed(unit.type),
                "side": "attacker" if army == attacker.army else "defender"
            })
    
    # Ordenar por velocidad
    units.sort(key=lambda x: x["speed"], reverse=True)
    
    # Simular ronda de combate
    damage_dealt = {
        "attacker": 0,
        "defender": 0
    }
    
    for unit in units:
        # Aplicar moral y suerte
        if check_morale_bonus():
            # Turno extra
            damage = calculate_damage(unit["unit"], unit["side"])
            if check_luck_bonus():
                damage *= 2  # Daño crítico
            
            damage_dealt[unit["side"]] += damage
    
    # Determinar ganador
    winner = "player" if damage_dealt["attacker"] > damage_dealt["defender"] else "ai"
    
    return {
        "winner": winner,
        "damage_dealt": damage_dealt
    }

def grant_experience(hero: Heroe, amount: int) -> None:
    """Otorga experiencia a un héroe y maneja la subida de nivel"""
    # Implementación simplificada
    pass

def calculate_unit_cost(unit_type: str, amount: int) -> Dict[str, int]:
    """Calcula el coste de reclutar unidades"""
    # Implementación simplificada
    return {"gold": amount * 100}

def add_units_to_city_army(city: City, unit_type: str, amount: int) -> None:
    """Añade unidades al ejército de la ciudad"""
    # Implementación simplificada
    pass

def collect_resource_income(player: Entity) -> None:
    """Recolecta recursos de minas y generadores"""
    # Implementación simplificada
    pass

def process_weekly_growth(player: Entity) -> None:
    """Procesa el crecimiento semanal de población en las ciudades"""
    for city in player.cities:
        for creature in city.available_creatures:
            creature.count += creature.growth_per_week

def check_morale_bonus() -> bool:
    """Verifica si se activa un bonus de moral"""
    # Implementación simplificada
    return False

def check_luck_bonus() -> bool:
    """Verifica si se activa un bonus de suerte"""
    # Implementación simplificada
    return False

def get_unit_speed(unit_type: str) -> int:
    """Obtiene la velocidad base de un tipo de unidad"""
    # Implementación simplificada
    return 5

def calculate_damage(unit: Any, side: str) -> int:
    """Calcula el daño base de una unidad"""
    # Implementación simplificada
    return 10