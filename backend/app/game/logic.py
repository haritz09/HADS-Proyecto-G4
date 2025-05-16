from typing import Dict, Any, Tuple, List
from backend.app.db.schema import (
    GameState, Position, Entity, Heroe, ArmyUnit, Stats, City,
    Building, AvailableCreature, Resources, Artifact
)
import math
import random
import heapq
import copy  # Add this import for deepcopy
from backend.app.game.figures import render_hero_on_map, clear_hero_from_map
from backend.app.db.crud import update_game, get_game

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

def check_terrain_passable(position: Position, game_map: Any) -> bool:
    """Verifica si el terreno es transitable en la posición dada."""
    if not game_map or not game_map.tiles:
        return True
    idx = position.y * game_map.size.width + position.x
    if idx < 0 or idx >= len(game_map.tiles):
        return False
    tile = game_map.tiles[idx]
    # Considera 'mountain', 'water' y otros como no transitables
    return getattr(tile, 'passable', True)

def find_path_a_star(start: Position, end: Position, game_map: Any) -> List[Position]:
    """Algoritmo A* para encontrar el camino más corto evitando obstáculos."""
    width = game_map.size.width
    height = game_map.size.height
    def neighbors(pos):
        for dx, dy in [(-1,0),(1,0),(0,-1),(0,1)]:
            nx, ny = pos.x + dx, pos.y + dy
            if 0 <= nx < width and 0 <= ny < height:
                npos = Position(x=nx, y=ny)
                if check_terrain_passable(npos, game_map):
                    yield npos
    open_set = []
    heapq.heappush(open_set, (0, start))
    came_from = {}
    g_score = { (start.x, start.y): 0 }
    f_score = { (start.x, start.y): abs(end.x - start.x) + abs(end.y - start.y) }
    while open_set:
        _, current = heapq.heappop(open_set)
        if current.x == end.x and current.y == end.y:
            # Reconstruir path
            path = [current]
            while (current.x, current.y) in came_from:
                current = came_from[(current.x, current.y)]
                path.append(current)
            return list(reversed(path))
        for neighbor in neighbors(current):
            tentative_g = g_score[(current.x, current.y)] + 1
            if (neighbor.x, neighbor.y) not in g_score or tentative_g < g_score[(neighbor.x, neighbor.y)]:
                came_from[(neighbor.x, neighbor.y)] = current
                g_score[(neighbor.x, neighbor.y)] = tentative_g
                f = tentative_g + abs(end.x - neighbor.x) + abs(end.y - neighbor.y)
                f_score[(neighbor.x, neighbor.y)] = f
                heapq.heappush(open_set, (f, neighbor))
    return []  # No path found

def process_hero_movement(game_state: GameState, action: Dict[str, Any]) -> Dict[str, Any]:
    """Procesa el movimiento de un héroe con pathfinding y actualiza el estado paso a paso."""
    try:
        # Extract hero_id and destination - more robust handling of different formats
        hero_id = None
        destination = None
        
        if "details" in action:
            details = action["details"]
            hero_id = details.get("heroId") or details.get("hero_id")
            destination = details.get("destination")
        else:
            # Handle older format or direct properties
            hero_id = action.get("heroId") or action.get("hero_id")
            destination = action.get("destination") or action.get("target_position")
        
        if not hero_id or not destination:
            raise ValueError("Formato de acción inválido: hero_id y destination son requeridos")
            
        target_position = Position(**destination)
        
        # Find hero with more verbose error reporting
        hero = None
        for h in game_state.player.heroes:
            if h.id == hero_id:
                hero = h
                break
                
        if not hero:
            available_heroes = [h.id for h in game_state.player.heroes]
            raise ValueError(f"Héroe no encontrado: {hero_id}. Héroes disponibles: {available_heroes}")
        
        # Safely access map properties with default values if missing
        map_width = getattr(game_state.map.size, 'width', 100) 
        map_height = getattr(game_state.map.size, 'height', 100)
        
        # Basic validation of positions
        if (target_position.x < 0 or target_position.x >= map_width or
            target_position.y < 0 or target_position.y >= map_height):
            raise ValueError(f"Posición destino fuera de límites: {target_position.x}, {target_position.y}")
        
        # Simplified movement for now - direct move without pathfinding if that's causing issues
        movement_cost = calculate_movement_cost(hero.position, target_position, game_state.map)
        
        if hero.stats.movement_points_left < movement_cost:
            raise ValueError("Puntos de movimiento insuficientes")
        
        # Update hero position
        old_position = copy.deepcopy(hero.position)
        hero.stats.movement_points_left -= movement_cost
        hero.position = target_position
        
        # Update map representation if needed
        if hasattr(game_state.map, 'tiles') and game_state.map.tiles:
            try:
                # Clear old position and render in new position (safely)
                clear_hero_from_map(hero, game_state.map)
                render_hero_on_map(hero, game_state.map)
            except Exception as e:
                print(f"Warning: Error updating map tiles: {str(e)}")
        
        # Return simplified result
        return {
            "success": True,
            "old_position": {"x": old_position.x, "y": old_position.y},
            "new_position": {"x": hero.position.x, "y": hero.position.y},
            "remaining_movement": hero.stats.movement_points_left
        }
    except Exception as e:
        print(f"Error in process_hero_movement: {str(e)}")
        raise ValueError(f"Error procesando movimiento: {str(e)}")

def process_hero_attack(game_state: GameState, action: Dict[str, Any]) -> Dict[str, Any]:
    """Procesa el ataque de un héroe a otro"""
    attacker_id = action["attacker"]
    defender_id = action["defender"]
    
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

def is_hero_in_city(hero: Heroe, city: City, radius: int = 1) -> bool:
    """Devuelve True si el héroe está dentro del radio de la ciudad (incluyendo diagonales)."""
    dx = abs(hero.position.x - city.position.x)
    dy = abs(hero.position.y - city.position.y)
    return dx <= radius and dy <= radius

def process_recruitment(game_state: GameState, action: Dict[str, Any]) -> Dict[str, Any]:
    """Procesa el reclutamiento de unidades en un edificio de una ciudad"""
    details = action["details"]
    hero_id = details["heroId"]
    city_id = details["cityId"]
    unit_type = details["unitType"]
    count = details["count"]
    building_id = details.get("buildingId")

    # Encontrar la ciudad
    city = next((c for c in game_state.player.cities if c.id == city_id), None)
    if not city:
        raise ValueError("Ciudad no encontrada")

    # Validar que el héroe está dentro del radio de la ciudad
    hero = next((h for h in game_state.player.heroes if h.id == hero_id), None)
    if not hero or not is_hero_in_city(hero, city, radius=1):
        raise ValueError("El héroe no está en la ciudad ni adyacente a ella")

    # Encontrar el edificio por id y validar can_recruit
    building = next((b for b in city.buildings if b.id == building_id), None)
    if not building or not getattr(building, 'can_recruit', False):
        raise ValueError("Edificio de reclutamiento no válido o no permite reclutar")

    # Validar que el unit_type está disponible en el edificio
    available = next((u for u in getattr(building, 'available_creatures', []) if u.type == unit_type), None)
    if not available:
        raise ValueError("Esta tropa no se puede reclutar en este edificio")
    if available.count < count:
        raise ValueError("No hay suficientes unidades disponibles para reclutar")

    # Validar recursos y aplicar descuento si el héroe tiene el artefacto de reclutamiento
    base_cost = {k: v * count for k, v in available.recruit_cost.items()}
    discount = 1.0
    if any(a.subtype == 'totemReclutamiento' for a in getattr(hero, 'artifacts', [])):
        discount = 0.7
    cost = {k: int(v * discount) for k, v in base_cost.items()}
    if not has_enough_resources(game_state.player, cost):
        raise ValueError("Recursos insuficientes")

    # Realizar reclutamiento
    available.count -= count
    deduct_resources(game_state.player, cost)
    add_units_to_hero_or_city(city, unit_type, count, game_state)

    return {"recruited": count, "type": unit_type, "hero": hero_id, "city": city_id, "building": building_id, "cost": cost}

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
            process_weekly_growth_both(game_state)
    
    return {
        "next_player": game_state.current_player,
        "turn": game_state.turn
    }

def process_build_structure(game_state: GameState, action: Dict[str, Any]) -> Dict[str, Any]:
    """Procesa la construcción de un edificio en la ciudad."""
    details = action["details"]
    city_id = details["cityId"]
    structure_type = details["structureType"]

    # Encontrar la ciudad
    city = next((c for c in game_state.player.cities if c.id == city_id), None)
    if not city:
        raise ValueError("Ciudad no encontrada")

    # Buscar héroe dentro del castillo central (is_castle=True, radio=0)
    castle = next((b for b in city.buildings if getattr(b, 'is_castle', False)), None)
    if not castle:
        raise ValueError("No hay castillo en la ciudad")
    hero = next((h for h in game_state.player.heroes if h.position.x == castle.position.x and h.position.y == castle.position.y), None)
    if not hero:
        raise ValueError("El héroe debe estar dentro del castillo para construir")

    # Verificar si el edificio ya está construido
    existing = next((b for b in city.buildings if b.name == structure_type), None)
    if existing and existing.can_recruit:
        raise ValueError("El edificio ya está construido")

    # Definir el coste de construcción (puedes ajustar esto según el tipo)
    build_costs = {
        "barracks": {"gold": 1000, "wood": 50, "stone": 50},
        "archery": {"gold": 1200, "wood": 70, "stone": 30},
        "knigths_tower": {"gold": 1500, "wood": 100, "stone": 100},
        "mage_tower": {"gold": 2000, "wood": 100, "stone": 100},
        "dragons_lair": {"gold": 5000, "wood": 200, "stone": 200},

        "tavern": {"gold": 1000, "wood": 200, "stone": 200}, #Esto sirve para reclutar héroes (esta dentro del castillo)
    }
    cost = build_costs.get(structure_type)
    if not cost:
        raise ValueError("Tipo de edificio desconocido")
    if not has_enough_resources(game_state.player, cost):
        raise ValueError("Recursos insuficientes para construir el edificio")

    # Crear el edificio y añadirlo a la ciudad
    from backend.app.db.schema import Building, Position
    building_id = f"{city_id}_{structure_type}"
    # Asumimos que cada tipo tiene una posición fija relativa al castillo
    structure_positions = {
        "barracks": Position(x=50, y=50),
        "archery": Position(x=52, y=52),
        "knigths_tower": Position(x=48, y=52),
        "mage_tower": Position(x=70, y=58),
        "dragons_lair": Position(x=5, y=90),
        "tavern": Position(x=castle.position.x, y=castle.position.y),
        # ...otros edificios...
    }
    pos = structure_positions.get(structure_type)
    if not pos:
        raise ValueError("No se ha definido la posición para este edificio")
    new_building = Building(
        id=building_id,
        name=structure_type,
        position=pos,
        available_creatures=[],
        is_castle=False,
        has_tavern=False,
        can_recruit=True
    )
    city.buildings.append(new_building)
    deduct_resources(game_state.player, cost)

    # Mostrar el edificio en el mapa
    from backend.app.game.figures import render_building_on_map
    render_building_on_map(new_building, game_state.map)

    return {"built": structure_type, "city": city_id, "position": {"x": pos.x, "y": pos.y}}

# Funciones auxiliares
def calculate_movement_cost(start: Position, end: Position, game_map: Any) -> float:
    """Calcula el coste de movimiento entre dos posiciones usando distancia euclídea."""
    return math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2)

def process_tile_interaction(hero: Heroe, position: Position, game_state: GameState) -> Dict[str, Any]:
    """Procesa la interacción con objetos en la casilla: recursos, minas, artefactos, enemigos, etc."""
    idx = position.y * game_state.map.size.width + position.x
    tile = game_state.map.tiles[idx] if game_state.map.tiles and 0 <= idx < len(game_state.map.tiles) else None
    if not tile:
        return {"interaction": "none"}
    # Captura de minas y sitios de recursos
    for obj in (game_state.map.visible_objects or []):
        # --- ARTEFACTOS ---
        if isinstance(obj, Artifact) and obj.position.x == position.x and obj.position.y == position.y:
            # Comprobar límite de artefactos
            if len(hero.artifacts) >= 2:
                return {"interaction": "artifact_found", "error": "Inventario de artefactos lleno", "stop_movement": False}
            # Si hay guardianes, no se recoge hasta derrotarlos (no implementado aquí)
            # Recoger artefacto
            artifact = Artifact(
                id=getattr(obj, 'id', f"artifact_{position.x}_{position.y}"),
                name=getattr(obj, 'name', obj.subtype),
                subtype=obj.subtype,
                effect={}
            )
            # Aplicar bonificación según el tipo
            if obj.subtype == 'totemDeGuerra':
                for unit in hero.army:
                    if hasattr(unit, 'stats'):
                        unit.stats.attack = int(unit.stats.attack * 1.2)
                        unit.stats.health = int(unit.stats.health * 1.2)
                        unit.stats.speed = int(unit.stats.speed * 1.2)
                artifact.effect = {"army_buff": "+20% attack, health, speed"}
            elif obj.subtype == 'totemVelocidad':
                hero.stats.movement_points = int(hero.stats.movement_points * 1.3)
                hero.stats.movement_points_left = int(hero.stats.movement_points_left * 1.3)
                artifact.effect = {"movement_buff": "+30% movement points"}
            elif obj.subtype == 'totemReclutamiento':
                artifact.effect = {"recruitment_discount": "-30% cost"}
            hero.artifacts.append(artifact)
            game_state.map.visible_objects = [o for o in game_state.map.visible_objects if o != obj]
            return {"interaction": "artifact_collected", "artifact": artifact.name, "stop_movement": False}
        # --- MINAS Y SITIOS DE RECURSOS ---
        if hasattr(obj, 'position') and obj.position.x == position.x and obj.position.y == position.y:
            if hasattr(obj, 'owner'):
                previous_owner = obj.owner
                obj.owner = 'player' if hero in game_state.player.heroes else 'ai'
                return {"interaction": "resource_site_captured", "site_type": obj.type, "previous_owner": previous_owner, "new_owner": obj.owner, "stop_movement": False}
    # Combate contra enemigo (héroe IA en la misma casilla)
    if getattr(tile, 'object_type', None) == 'enemy':
        enemy_hero = next((h for h in game_state.ai.heroes if h.position.x == position.x and h.position.y == position.y), None)
        if enemy_hero:
            combat_result = resolve_combat(hero, enemy_hero)
            return {"interaction": "enemy_encountered", "combat_result": combat_result, "stop_movement": True}
        else:
            return {"interaction": "enemy_encountered", "error": "No se encontró héroe enemigo en la casilla", "stop_movement": True}
    return {"interaction": "none"}

def resolve_combat(attacker: Heroe, defender: Heroe) -> Dict[str, Any]:
    """Resuelve un combate entre dos héroes"""
    # Sistema de combate por turnos basado en velocidad
    units = []
    for army, side in [(attacker.army, 'attacker'), (defender.army, 'defender')]:
        for unit in army:
            units.append({
                "unit": unit,
                "speed": unit.stats.speed,
                "side": side
            })
    units.sort(key=lambda x: x["speed"], reverse=True)
    damage_dealt = {"attacker": 0, "defender": 0}
    for unit in units:
        # Moral y suerte (simplificado)
        if check_morale_bonus():
            damage = calculate_damage(unit["unit"], unit["side"])
            if check_luck_bonus():
                damage *= 2
            damage_dealt[unit["side"]] += damage
    winner = "player" if damage_dealt["attacker"] > damage_dealt["defender"] else "ai"
    return {"winner": winner, "damage_dealt": damage_dealt}

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

def collect_resource_income(player: Entity, game_map: Any, owner: str) -> None:
    """Recolecta recursos de minas y generadores controlados por el jugador o la ia según el owner."""
    if not game_map.visible_objects:
        return
    for obj in game_map.visible_objects:
        if hasattr(obj, 'owner') and obj.owner == owner:
            if getattr(obj, 'resource_type', None) == 'gold':
                player.resources.gold += getattr(obj, 'resource_per_turn', 0)
            elif getattr(obj, 'resource_type', None) == 'wood':
                player.resources.wood += getattr(obj, 'resource_per_turn', 0)
            elif getattr(obj, 'resource_type', None) == 'stone':
                player.resources.stone += getattr(obj, 'resource_per_turn', 0)

def process_weekly_growth(player: Entity, game_map: Any, owner: str) -> None:
    """Procesa el crecimiento semanal de población en los edificios de las ciudades y suma recursos de minas."""
    for city in player.cities:
        for building in getattr(city, 'buildings', []):
            for creature in getattr(building, 'available_creatures', []):
                creature.count += getattr(creature, 'growth_per_week', 0)
    collect_resource_income(player, game_map, owner)

def process_weekly_growth_both(game_state: GameState) -> None:
    """Procesa el crecimiento semanal y suma recursos de minas para ambos bandos."""
    process_weekly_growth(game_state.player, game_state.map, owner="player")
    process_weekly_growth(game_state.ai, game_state.map, owner="ai")

def check_morale_bonus() -> bool:
    """Verifica si se activa un bonus de moral"""
    # Implementación simplificada
    return False

def check_luck_bonus() -> bool:
    """Verifica si se activa un bonus de suerte"""
    # Implementación simplificada
    return False


def calculate_damage(unit: Any, side: str) -> int:
    """Calcula el daño base de una unidad"""
    # Implementación simplificada
    return 10

def transfer_troops_between_hero_and_castle(game_state: GameState, action: Dict[str, Any]) -> Dict[str, Any]:
    """
    Permite transferir tropas entre el héroe y el castillo central si el héroe está en el castillo.
    action['details'] debe tener:
      - heroId: id del héroe
      - cityId: id de la ciudad
      - transfer: lista de dicts con { 'unitType': str, 'to_castle': int, 'to_hero': int }
        (to_castle: cantidad a dejar en el castillo, to_hero: cantidad a llevarse del castillo)
    """
    details = action["details"]
    hero_id = details["heroId"]
    city_id = details["cityId"]
    transfers = details["transfer"]  # lista de transferencias

    # Encontrar ciudad y castillo
    city = next((c for c in game_state.player.cities if c.id == city_id), None)
    if not city:
        raise ValueError("Ciudad no encontrada")
    castle = next((b for b in city.buildings if getattr(b, 'is_castle', False)), None)
    if not castle:
        raise ValueError("Castillo no encontrado en la ciudad")

    # Verificar que el héroe está en el castillo
    hero = next((h for h in game_state.player.heroes if h.id == hero_id), None)
    if not hero or hero.position.x != castle.position.x or hero.position.y != castle.position.y:
        raise ValueError("El héroe debe estar en el castillo para transferir tropas")

    # Inicializar guarnición del castillo si no existe
    if not hasattr(castle, 'garrison'):
        castle.garrison = []  # lista de ArmyUnit

    # Procesar transferencias
    for t in transfers:
        unit_type = t['unitType']
        to_castle = t.get('to_castle', 0)
        to_hero = t.get('to_hero', 0)

        # Transferir del héroe al castillo
        if to_castle > 0:
            hero_unit = next((u for u in hero.army if u.type == unit_type), None)
            if not hero_unit or hero_unit.count < to_castle:
                raise ValueError(f"El héroe no tiene suficientes unidades de {unit_type} para dejar en el castillo")
            # Quitar del héroe
            hero_unit.count -= to_castle
            if hero_unit.count == 0:
                hero.army.remove(hero_unit)
            # Añadir al castillo
            castle_unit = next((u for u in castle.garrison if u.type == unit_type), None)
            if castle_unit:
                castle_unit.count += to_castle
            else:
                castle.garrison.append(ArmyUnit(type=unit_type, count=to_castle))

        # Transferir del castillo al héroe
        if to_hero > 0:
            castle_unit = next((u for u in castle.garrison if u.type == unit_type), None)
            if not castle_unit or castle_unit.count < to_hero:
                raise ValueError(f"El castillo no tiene suficientes unidades de {unit_type} para dar al héroe")
            # Quitar del castillo
            castle_unit.count -= to_hero
            if castle_unit.count == 0:
                castle.garrison.remove(castle_unit)
            # Añadir al héroe
            hero_unit = next((u for u in hero.army if u.type == unit_type), None)
            if hero_unit:
                hero_unit.count += to_hero
            else:
                hero.army.append(ArmyUnit(type=unit_type, count=to_hero))

    # Limitar a 5 slots por ejército (héroe y castillo)
    if len(hero.army) > 5:
        raise ValueError("El héroe no puede llevar más de 5 tipos de tropas")
    if len(castle.garrison) > 5:
        raise ValueError("El castillo no puede tener más de 5 tipos de tropas en la guarnición")

    return {
        "hero_army": [{"type": u.type, "count": u.count} for u in hero.army],
        "castle_garrison": [{"type": u.type, "count": u.count} for u in castle.garrison]
    }