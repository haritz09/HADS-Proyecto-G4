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
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    # Asegurarnos de que ambos valores son numéricos
    x1 = float(pos1.x)
    y1 = float(pos1.y)
    x2 = float(pos2.x)
    y2 = float(pos2.y)
    
    return math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)

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
    
    # Registro detallado antes de la deducción
    print(f"DEBUG: Resources BEFORE deduction: Gold={getattr(resources, 'gold', 0)}, Wood={getattr(resources, 'wood', 0)}, Stone={getattr(resources, 'stone', 0)}")
    print(f"DEBUG: Cost to deduct: {cost}")
    
    # Asegurar que estamos deduciendo valores numéricos
    for resource, amount in cost.items():
        if not isinstance(amount, (int, float)):
            print(f"WARNING: Non-numeric cost for {resource}: {amount}, converting to int")
            cost[resource] = int(amount)
    
    # Realizar la deducción de recursos
    for resource, amount in cost.items():
        current_value = getattr(resources, resource, 0)
        print(f"DEBUG: Deducting {amount} from {resource} (current: {current_value})")
        
        # Establecer el nuevo valor
        new_value = current_value - amount
        setattr(resources, resource, new_value)
        
        # Verificar que la deducción se realizó correctamente
        after_value = getattr(resources, resource, 0)
        print(f"DEBUG: After deduction, {resource} = {after_value} (expected {new_value})")
    
    # Registro detallado después de la deducción
    print(f"DEBUG: Resources AFTER deduction: Gold={getattr(resources, 'gold', 0)}, Wood={getattr(resources, 'wood', 0)}, Stone={getattr(resources, 'stone', 0)}")

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

def process_hero_movement(game_state: GameState, action: dict) -> dict:
    try:
        hero_id = action["details"]["hero_id"]
        # Handle both destination object and separate x,y coordinates
        if "destination" in action["details"]:
            target_x = int(action["details"]["destination"]["x"])
            target_y = int(action["details"]["destination"]["y"])
        else:
            target_x = int(action["details"].get("x"))
            target_y = int(action["details"].get("y"))

        if target_x is None or target_y is None:
            raise ValueError("Invalid target coordinates")
        
        hero = next((h for h in game_state.player.heroes if h.id == hero_id), None)
        if not hero:
            raise ValueError(f"Hero not found with ID: {hero_id}")
        
        # Validate map boundaries
        if target_x < 0 or target_x >= game_state.map.size.width or target_y < 0 or target_y >= game_state.map.size.height:
            raise ValueError(f"Target position ({target_x}, {target_y}) is outside map boundaries")
        
        # Calculate movement cost without map parameter
        movement_cost = calculate_movement_cost(hero.position, Position(x=target_x, y=target_y))
        if movement_cost > hero.stats.movement_points_left:
            raise ValueError(f"Not enough movement points: needed {movement_cost}, available {hero.stats.movement_points_left}")
        
        # Ensure position values are integers
        original_x, original_y = hero.position.x, hero.position.y
        
        # Update position
        hero.position.x = target_x
        hero.position.y = target_y
        hero.stats.movement_points_left -= movement_cost
        
        print(f"DEBUG: Hero moved from ({original_x}, {original_y}) to ({target_x}, {target_y})")
        print(f"DEBUG: Hero position after update: ({hero.position.x}, {hero.position.y})")
        
        # Check for interactions at the new position (artifacts, resources, etc.)
        try:
            print(f"DEBUG: Checking interactions at position ({target_x}, {target_y}) for hero {hero_id}")
            interaction_result = process_tile_interaction(hero, Position(x=target_x, y=target_y), game_state)
            print(f"DEBUG: Interaction result: {interaction_result}")
        except Exception as e:
            print(f"ERROR in interaction processing: {str(e)}")
            # Continue execution even if interaction processing fails
            interaction_result = {"interaction": "error", "error_message": str(e)}
        
        return {
            "success": True,
            "hero_id": hero_id,
            "new_position": {"x": target_x, "y": target_y},
            "movement_points_left": hero.stats.movement_points_left,
            "interaction": interaction_result  # Include the interaction result in the response
        }
    except Exception as e:
        print(f"ERROR in process_hero_movement: {str(e)}")
        # Return a structured error to avoid 500 response
        return {
            "success": False,
            "error": f"Error processing hero movement: {str(e)}"
        }

def calculate_movement_cost(start: Position, end: Position, game_map: Any = None) -> float:
    """Calcula el coste de movimiento entre dos posiciones usando distancia euclídea."""
    # Make game_map parameter optional
    distance = math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2)
    # Basic movement cost is just the distance
    return distance

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
    
    # Recolectar recursos de las minas para el jugador actual
    if current_player == "player":
        collect_resource_income(game_state.player, game_state.map, "player")
    else:
        collect_resource_income(game_state.ai, game_state.map, "ai")
    
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
        "turn": game_state.turn,
        "resources_collected": True
    }

def process_build_structure(game_state: GameState, action: Dict[str, Any]) -> Dict[str, Any]:
    try:
        details = action["details"]
        city_id = details["cityId"]
        structure_type = details["structureType"]
        current_player = game_state.current_player
        
        print(f"DEBUG: Processing build structure. Type: {structure_type}, City ID: {city_id}, Player: {current_player}")
        
        # Building configurations - asegurarse de incluir TODOS los tipos de edificios
        building_configs = {
            "barracks": {
                "cost": {"gold": 1000, "wood": 50, "stone": 50},
                "can_recruit": True,
                "available_creatures": [
                    {
                        "type": "Guerrero",
                        "count": 10,
                        "growth_per_week": 4,
                        "stats": {"attack": 4, "defense": 4, "speed": 3, "movement_points": 5, "movement_points_left": 5},
                        "recruit_cost": {"gold": 100}
                    }
                ]
            },
            "archery": {
                "cost": {"gold": 1200, "wood": 70, "stone": 30},
                "can_recruit": True,
                "available_creatures": [
                    {
                        "type": "Arquero",
                        "count": 8,
                        "growth_per_week": 3,
                        "stats": {"attack": 5, "defense": 3, "speed": 4, "movement_points": 5, "movement_points_left": 5},
                        "recruit_cost": {"gold": 150}
                    }
                ]
            },
            "knights_tower": {
                "cost": {"gold": 1500, "wood": 100, "stone": 100},
                "can_recruit": True,
                "available_creatures": [
                    {
                        "type": "Caballero",
                        "count": 5,
                        "growth_per_week": 2,
                        "stats": {"attack": 6, "defense": 5, "speed": 5, "movement_points": 7, "movement_points_left": 7},
                        "recruit_cost": {"gold": 300}
                    }
                ]
            },
            "mage_tower": {
                "cost": {"gold": 2000, "wood": 100, "stone": 100},
                "can_recruit": True,
                "available_creatures": [
                    {
                        "type": "Mago",
                        "count": 3,
                        "growth_per_week": 1,
                        "stats": {"attack": 7, "defense": 2, "speed": 4, "movement_points": 5, "movement_points_left": 5},
                        "recruit_cost": {"gold": 350}
                    }
                ]
            },
            "dragons_lair": {
                "cost": {"gold": 5000, "wood": 200, "stone": 200},
                "can_recruit": True,
                "available_creatures": [
                    {
                        "type": "Dragón",
                        "count": 1,
                        "growth_per_week": 1,  # Cambiado de 0.5 a 1 para evitar el error de validación
                        "stats": {"attack": 10, "defense": 8, "speed": 8, "movement_points": 10, "movement_points_left": 10},
                        "recruit_cost": {"gold": 1000}
                    }
                ]
            }
        }

        # Verificar si el structure_type solicitado existe en la configuración
        if structure_type not in building_configs:
            print(f"ERROR: Unknown building type requested: {structure_type}")
            print(f"Available building types: {list(building_configs.keys())}")
            raise ValueError(f"Unknown building type: {structure_type}")

        # Get building configuration
        building_config = building_configs.get(structure_type)

        # Find player resources and cities based on current player
        player = game_state.player if current_player == "player" else game_state.ai
        
        print(f"DEBUG: All player cities: {[c.id for c in player.cities]}")
        
        # Mapping of building types to their respective city IDs
        building_type_to_city_id = {
            "barracks": "barracks_city",
            "archery": "archery_city",
            "knights_tower": "knights_city", 
            "mage_tower": "mage_city",
            "dragons_lair": "dragon_city"
        }
        
        # Find the correct city for this building type
        target_city_id = None
        
        # If we're building in the central city, use that
        if city_id == "central_city" or city_id == "central_castle":
            target_city_id = "central_city"
        else:
            # Otherwise, find the correct city for this building type
            target_city_id = building_type_to_city_id.get(structure_type, city_id)
        
        print(f"DEBUG: Looking for building of type '{structure_type}' in city: {target_city_id}")
        
        # Find the city
        city = None
        for c in player.cities:
            if c.id == target_city_id:
                city = c
                print(f"DEBUG: Found target city with ID: {c.id}")
                break
                
        # Fallback to central_city if needed
        if not city:
            for c in player.cities:
                if c.id == "central_city" or (hasattr(c, 'position') and c.position.x == 48 and c.position.y == 48):
                    city = c
                    print(f"DEBUG: Falling back to central city: {c.id}")
                    break
        
        if not city:
            print(f"ERROR: City with ID {target_city_id} not found")
            print(f"Available cities: {[c.id for c in player.cities]}")
            raise ValueError(f"City {target_city_id} not found")

        # Find the building of the specified type in the city
        building = None
        print(f"DEBUG: Searching for building of type '{structure_type}' in city {city.id}")
        
        # List all buildings and their types for diagnostics
        for i, b in enumerate(city.buildings):
            building_type = getattr(b, 'building_type', 'no_type')
            print(f"DEBUG: Building {i}: {getattr(b, 'id', 'no_id')}, type={building_type}")
            
            # Check if it matches the requested type
            if building_type == structure_type:
                building = b
                print(f"DEBUG: Found matching building with type {structure_type}")
                break
        
        # If no building is found with the matching type, search in the other cities
        if not building:
            print(f"DEBUG: No building of type '{structure_type}' found in {city.id}, checking other cities")
            for c in player.cities:
                if c.id != city.id:
                    for b in c.buildings:
                        if getattr(b, 'building_type', '') == structure_type:
                            building = b
                            city = c
                            print(f"DEBUG: Found {structure_type} in city {c.id}")
                            break
                if building:
                    break
        
        # If we still don't have a building, create a new one
        if not building:
            print(f"DEBUG: Creating new {structure_type} building in city {city.id}")
            
            # Create a new building with all required fields
            new_building = Building(
                id=f"{structure_type}_{city.position.x}_{city.position.y}",
                name=structure_type.capitalize(),
                position=city.position,
                building_type=structure_type,
                is_castle=False,
                built=False,
                owner=None,
                can_recruit=building_config.get("can_recruit", False),
                has_tavern=False,
                requirements=[],
                available_creatures=[]
            )
            
            # Add to the city
            city.buildings.append(new_building)
            building = city.buildings[-1]
            print(f"DEBUG: Added new building: {building.id}, type={building.building_type}")
        
        # Check if building is already built
        if building.built:
            print(f"DEBUG: Building is already built. Owner check: built={building.built}, owner={building.owner}, current_player={current_player}")
            if building.owner == current_player:
                print(f"ERROR: Building already owned by {current_player}")
                return {
                    "success": False,
                    "error": f"You already own this {structure_type}"
                }
            elif building.owner is not None:
                print(f"DEBUG: Building is owned by {building.owner}, but current player is {current_player} - allowing purchase")
            else:
                print(f"DEBUG: Building is built but has no owner (None) - allowing purchase")
            return {
                "success": False,
                "error": f"Building already constructed"
            }

        # Only deduct resources if not built
        # Make a backup of the resources before deduction for logging
        if not has_enough_resources(player, building_config["cost"]):
            raise ValueError("Recursos insuficientes para construir el edificio")
        deduct_resources(player, building_config["cost"])
        
        # Update building properties with better logging
        try:
            # Set built status
            if hasattr(building, 'built'):
                print(f"DEBUG: Setting building.built = True (was {building.built})")
                building.built = True
            
            # Set owner - explicitly log the change
            if hasattr(building, 'owner'):
                print(f"DEBUG: Setting building.owner = {current_player} (was {building.owner})")
                building.owner = current_player
                
            # Set can_recruit
            if hasattr(building, 'can_recruit'):
                building.can_recruit = building_config.get("can_recruit", False)
                
            # Set creatures
            if "available_creatures" in building_config and hasattr(building, 'available_creatures'):
                building.available_creatures = building_config["available_creatures"]
        except Exception as e:
            print(f"WARNING: Error updating building properties: {str(e)}")

        # Update city owner only if it doesn't have an owner yet
        try:
            if hasattr(city, 'owner') and (city.owner is None or city.owner == ""):
                print(f"DEBUG: Updating city {city.id} owner from {city.owner} to {current_player}")
                city.owner = current_player
            else:
                print(f"DEBUG: City {city.id} already has owner: {city.owner}, not changing")
        except Exception as e:
            print(f"WARNING: Error updating city owner: {str(e)}")
            
        print(f"SUCCESS: Built {structure_type} in city {city.id}")

        return {
            "success": True,
            "built": structure_type,
            "city": city.id,
            "building": getattr(building, 'id', 'unknown'),
            "new_resources": {
                "gold": player.resources.gold,
                "wood": player.resources.wood,
                "stone": player.resources.stone
            },
            "game_state": game_state
        }
    except Exception as e:
        print(f"CRITICAL ERROR in process_build_structure: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e)
        }

def process_tile_interaction(hero: Heroe, position: Position, game_state: GameState) -> Dict[str, Any]:
    """Procesa la interacción con objetos en la casilla: recursos, minas, artefactos, enemigos, etc."""
    try:
        idx = position.y * game_state.map.size.width + position.x
        
        # Validate index is within bounds
        if idx < 0 or idx >= len(game_state.map.tiles):
            print(f"WARNING: Tile index {idx} out of bounds (map size: {game_state.map.size.width}x{game_state.map.size.height}, tiles: {len(game_state.map.tiles)})")
            return {"interaction": "none", "warning": "Tile index out of bounds"}
            
        tile = game_state.map.tiles[idx] if game_state.map.tiles else None
        print(f"DEBUG: process_tile_interaction at ({position.x}, {position.y}), tile={tile}")
        print(f"DEBUG: Tile object_type = {getattr(tile, 'object_type', None)}, object_id = {getattr(tile, 'object_id', None)}")
        
        if not tile:
            return {"interaction": "none", "reason": "No tile found"}
        
        # Imprimir todos los objetos visibles para depuración
        print(f"DEBUG: Total visible objects: {len(game_state.map.visible_objects)}")
        for i, obj in enumerate(game_state.map.visible_objects):
            print(f"DEBUG: Object #{i}: id={getattr(obj, 'id', 'unknown')}, type={getattr(obj, 'type', 'unknown')}, "
                  f"position=({getattr(getattr(obj, 'position', None), 'x', '?')}, {getattr(getattr(obj, 'position', None), 'y', '?')})")
            if hasattr(obj, 'subtype'):
                print(f"DEBUG: Object #{i} has subtype: {obj.subtype}")
        
        # Mejorado: Verificar artefactos primero para mayor prioridad
        print(f"DEBUG: Checking artifacts at ({position.x}, {position.y})...")
        found_artifact = False
        
        for obj in (game_state.map.visible_objects or []):
            # Método mejorado para detectar artefactos - comprobar tanto por tipo como por atributos
            is_artifact = (
                (hasattr(obj, 'type') and getattr(obj, 'type') == 'artifact') or 
                hasattr(obj, 'subtype')
            )
            
            is_at_position = (
                hasattr(obj, 'position') and 
                hasattr(obj.position, 'x') and 
                hasattr(obj.position, 'y') and
                obj.position.x == position.x and 
                obj.position.y == position.y
            )
            
            if is_artifact:
                print(f"DEBUG: Found artifact object: {obj.id if hasattr(obj, 'id') else 'unknown id'}")
            
            if is_at_position:
                print(f"DEBUG: Found object at position ({position.x}, {position.y})")
            
            if is_artifact and is_at_position:
                found_artifact = True
                print(f"DEBUG: ARTIFACT FOUND at position ({position.x}, {position.y}): {obj}")
                
                # Comprobar límite de artefactos
                print(f"DEBUG: Hero {hero.id} current artifacts: {hero.artifacts}")
                print(f"DEBUG: Hero artifacts count: {len(hero.artifacts)}")
                
                if len(hero.artifacts) >= 2:
                    print(f"DEBUG: Artifact limit reached ({len(hero.artifacts)}/2)")
                    return {"interaction": "artifact_found", "error": "Inventario de artefactos lleno", "stop_movement": False}
                
                # Recoger artefacto
                artifact = Artifact(
                    id=getattr(obj, 'id', f"artifact_{position.x}_{position.y}"),
                    name=getattr(obj, 'name', getattr(obj, 'subtype', 'Artefacto')),
                    subtype=getattr(obj, 'subtype', 'unknown'),
                    effect=getattr(obj, 'effect', {})
                )
                
                print(f"DEBUG: Created new artifact object: {artifact}")
                print(f"DEBUG: New artifact ID: {artifact.id}, Name: {artifact.name}, Subtype: {artifact.subtype}")
                
                # Aplicar bonificación según el tipo (sin cambios)
                if artifact.subtype == 'totemDeGuerra':
                    print(f"DEBUG: Applying totemDeGuerra effect")
                    for unit in hero.army:
                        if hasattr(unit, 'stats'):
                            unit.stats.attack = int(unit.stats.attack * 1.2)
                            unit.stats.health = int(getattr(unit.stats, 'health', 10) * 1.2)
                            unit.stats.speed = int(unit.stats.speed * 1.2)
                    artifact.effect = {"army_buff": "+20% attack, health, speed"}
                elif artifact.subtype == 'totemVelocidad':
                    print(f"DEBUG: Applying totemVelocidad effect")
                    hero.stats.movement_points = int(hero.stats.movement_points * 1.3)
                    hero.stats.movement_points_left = int(hero.stats.movement_points_left * 1.3)
                    artifact.effect = {"movement_buff": "+30% movement points"}
                elif artifact.subtype == 'totemReclutamiento':
                    print(f"DEBUG: Applying totemReclutamiento effect")
                    artifact.effect = {"recruitment_discount": "-30% cost"}
                
                # CRÍTICO: Verificar si hero.artifacts existe
                if not hasattr(hero, 'artifacts'):
                    print(f"DEBUG: Hero {hero.id} doesn't have 'artifacts' attribute, creating it")
                    hero.artifacts = []
                
                # Añadir el artefacto a la lista
                try:
                    hero.artifacts.append(artifact)
                    print(f"DEBUG: Added artifact to hero. Hero now has {len(hero.artifacts)} artifacts")
                    print(f"DEBUG: Hero artifacts after adding: {[a.id for a in hero.artifacts]}")
                except Exception as e:
                    print(f"CRITICAL ERROR adding artifact to hero: {str(e)}")
                
                # Eliminar artefacto del mapa - MEJORADO para usar el ID
                try:
                    print(f"DEBUG: Removing artifact from visible_objects. Before: {len(game_state.map.visible_objects)}")
                    artifact_id = getattr(obj, 'id', None)
                    game_state.map.visible_objects = [
                        o for o in game_state.map.visible_objects 
                        if getattr(o, 'id', None) != artifact_id
                    ]
                    print(f"DEBUG: After removal: {len(game_state.map.visible_objects)}")
                except Exception as e:
                    print(f"ERROR removing artifact from visible_objects: {str(e)}")
                
                # Limpiar el tile
                try:
                    print(f"DEBUG: Clearing tile at ({position.x}, {position.y}) from object_type: {tile.object_type} to None")
                    if tile and tile.object_type == 'artifact':
                        tile.object_type = None
                        tile.object_id = None
                except Exception as e:
                    print(f"ERROR clearing tile object info: {str(e)}")
                
                # Notificar al frontend con la interacción correcta
                print(f"DEBUG: Returning artifact_collected interaction with artifact name: {artifact.name}")
                return {"interaction": "artifact_collected", "artifact": artifact.name, "stop_movement": False}
        
        if not found_artifact:
            print(f"DEBUG: No artifacts found at position ({position.x}, {position.y})")
        
        # El resto del código sin cambios
        # Captura de minas y sitios de recursos
        for obj in (game_state.map.visible_objects or []):
            # --- MINAS ---
            if hasattr(obj, 'position') and obj.position.x == position.x and obj.position.y == position.y:
                # Asegurarnos de que el objeto tiene type
                if not hasattr(obj, 'type') and hasattr(obj, 'resource_type'):
                    resource_mapping = {
                        'gold': 'goldmine',
                        'wood': 'sawmill',
                        'stone': 'quarry'
                    }
                    obj.type = resource_mapping.get(obj.resource_type, 'mine')
                
                if hasattr(obj, 'owner') and hasattr(obj, 'resource_type') and hasattr(obj, 'resource_per_turn'):
                    previous_owner = obj.owner
                    # Determinar si el héroe pertenece al jugador o a la IA
                    hero_owner = 'player' if hero in game_state.player.heroes else 'ai'
                    obj.owner = hero_owner
                    
                    # Información detallada sobre la mina capturada
                    resource_name = obj.resource_type.capitalize()
                    income_per_turn = obj.resource_per_turn
                    
                    return {
                        "interaction": "resource_site_captured", 
                        "site_type": obj.type, 
                        "resource_type": obj.resource_type,
                        "resource_per_turn": income_per_turn,
                        "previous_owner": previous_owner, 
                        "new_owner": obj.owner, 
                        "message": f"¡Has capturado una mina de {resource_name}! +{income_per_turn} {resource_name} por turno.",
                        "stop_movement": False
                    }
                    
            # --- ARTEFACTOS ---
            if isinstance(obj, Artifact) and obj.position.x == position.x and obj.position.y == position.y:
                print(f"DEBUG: Artifact found at position ({position.x}, {position.y}): {obj}")
                
                # Comprobar límite de artefactos
                print(f"DEBUG: Hero {hero.id} current artifacts: {hero.artifacts}")
                
                if len(hero.artifacts) >= 2:
                    print(f"DEBUG: Artifact limit reached ({len(hero.artifacts)}/2)")
                    return {"interaction": "artifact_found", "error": "Inventario de artefactos lleno", "stop_movement": False}
                
                # Si hay guardianes, no se recoge hasta derrotarlos (no implementado aquí)
                # Recoger artefacto
                artifact = Artifact(
                    id=getattr(obj, 'id', f"artifact_{position.x}_{position.y}"),
                    name=getattr(obj, 'name', obj.subtype),
                    subtype=obj.subtype,
                    effect={}
                )
                
                print(f"DEBUG: Creating artifact object to add to hero: {artifact}")
                
                # Aplicar bonificación según el tipo
                if obj.subtype == 'totemDeGuerra':
                    print(f"DEBUG: Applying totemDeGuerra effect")
                    for unit in hero.army:
                        if hasattr(unit, 'stats'):
                            unit.stats.attack = int(unit.stats.attack * 1.2)
                            unit.stats.health = int(unit.stats.health * 1.2)
                            unit.stats.speed = int(unit.stats.speed * 1.2)
                    artifact.effect = {"army_buff": "+20% attack, health, speed"}
                elif obj.subtype == 'totemVelocidad':
                    print(f"DEBUG: Applying totemVelocidad effect")
                    hero.stats.movement_points = int(hero.stats.movement_points * 1.3)
                    hero.stats.movement_points_left = int(hero.stats.movement_points_left * 1.3)
                    artifact.effect = {"movement_buff": "+30% movement points"}
                elif obj.subtype == 'totemReclutamiento':
                    print(f"DEBUG: Applying totemReclutamiento effect")
                    artifact.effect = {"recruitment_discount": "-30% cost"}
                
                hero.artifacts.append(artifact)
                print(f"DEBUG: Hero {hero.id} artifacts after adding: {hero.artifacts}")
                
                # Remove artifact from visible objects safely
                try:
                    print(f"DEBUG: Removing artifact from visible_objects. Before: {len(game_state.map.visible_objects)}")
                    game_state.map.visible_objects = [o for o in game_state.map.visible_objects if o != obj]
                    print(f"DEBUG: After removal: {len(game_state.map.visible_objects)}")
                except Exception as e:
                    print(f"ERROR removing artifact from visible_objects: {str(e)}")
                
                # Clear the tile's object_type and object_id safely
                try:
                    print(f"DEBUG: Clearing tile at ({position.x}, {position.y}) from object_type: {tile.object_type} to None")
                    if tile and tile.object_type == 'artifact':
                        tile.object_type = None
                        tile.object_id = None
                except Exception as e:
                    print(f"ERROR clearing tile object info: {str(e)}")
                
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
    except Exception as e:
        print(f"ERROR in process_tile_interaction: {str(e)}")
        return {"interaction": "error", "error_message": str(e)}

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

def collect_resource_income(player: Entity, game_map: Any, owner: str) -> Dict[str, int]:
    """Recolecta recursos de minas y generadores controlados por el jugador o la IA según el owner."""
    if not game_map.visible_objects:
        return {}
    
    collected_resources = {"gold": 0, "wood": 0, "stone": 0}
    
    for obj in game_map.visible_objects:
        if hasattr(obj, 'owner') and obj.owner == owner:
            resource_type = getattr(obj, 'resource_type', None)
            resource_per_turn = getattr(obj, 'resource_per_turn', 0)
            
            if resource_type in collected_resources:
                player.resources.__dict__[resource_type] += resource_per_turn
                collected_resources[resource_type] += resource_per_turn
    
    return collected_resources

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

def build_structure(game_state, city_id, structure_type):
    """
    Construye una estructura en una ciudad si hay recursos suficientes
    """
    # Encuentra la ciudad y el edificio
    city = None
    building = None
    
    # Buscar en las ciudades del jugador
    for player_city in game_state["player"]["cities"]:
        if player_city["id"] == city_id:
            city = player_city
            # Buscar el edificio por tipo
            for b in city["buildings"]:
                if b["building_type"] == structure_type:
                    building = b
                    break
            break
    
    if not city or not building:
        return {"success": False, "error": "Ciudad o edificio no encontrado"}
    
    # Comprobar si ya está construido
    if building["built"]:
        return {"success": False, "error": "El edificio ya está construido"}
    
    # Comprobar si hay suficientes recursos
    player_resources = game_state["player"]["resources"]
    cost = building.get("cost", {"gold": 0, "wood": 0, "stone": 0})
    
    if player_resources["gold"] < cost.get("gold", 0) or \
       player_resources["wood"] < cost.get("wood", 0) or \
       player_resources["stone"] < cost.get("stone", 0):
        return {"success": False, "error": "Recursos insuficientes"}
    
    # Deducir recursos
    player_resources["gold"] -= cost.get("gold", 0)
    player_resources["wood"] -= cost.get("wood", 0)
    player_resources["stone"] -= cost.get("stone", 0)
    
    # Marcar como construido
    building["built"] = True
    building["owner"] = "player"  # Asignar propiedad al jugador
    
    # Determinar si el edificio permite reclutar unidades
    # Los edificios que pueden reclutar son todos excepto el castillo que ya está marcado
    recruit_buildings = ["barracks", "archery", "knights_tower", "mage_tower", "dragons_lair"]
    if structure_type in recruit_buildings:
        building["can_recruit"] = True
        # Añadir unidades disponibles según el tipo de edificio
        building["available_creatures"] = get_available_creatures(structure_type)
    
    # Actualizar la ciudad
    city["owner"] = "player"  # La ciudad pertenece al jugador cuando construye un edificio
    
    return {
        "success": True, 
        "message": f"Edificio {structure_type} construido con éxito",
        "new_resources": player_resources
    }

def get_available_creatures(building_type):
    """Devuelve las criaturas disponibles para un tipo de edificio."""
    creatures = {
        "barracks": [
            {
                "type": "Soldado",
                "count": 10,
                "growth_per_week": 3,
                "stats": {"attack": 5, "defense": 5, "speed": 3, "movement_points": 5, "movement_points_left": 5},
                "unit_cost": {"gold": 100}
            }
        ],
        "archery": [
            {
                "type": "Arquero",
                "count": 8,
                "growth_per_week": 2,
                "stats": {"attack": 6, "defense": 2, "speed": 4, "movement_points": 5, "movement_points_left": 5},
                "unit_cost": {"gold": 150}
            }
        ],
        "knights_tower": [
            {
                "type": "Caballero",
                "count": 5,
                "growth_per_week": 1,
                "stats": {"attack": 8, "defense": 6, "speed": 6, "movement_points": 7, "movement_points_left": 7},
                "unit_cost": {"gold": 300}
            }
        ],
        "mage_tower": [
            {
                "type": "Mago",
                "count": 3,
                "growth_per_week": 1,
                "stats": {"attack": 10, "defense": 3, "speed": 3, "movement_points": 5, "movement_points_left": 5},
                "unit_cost": {"gold": 500}
            }
        ],
        "dragons_lair": [
            {
                "type": "Dragón",
                "count": 1,
                "growth_per_week": 0.5,
                "stats": {"attack": 15, "defense": 12, "speed": 8, "movement_points": 10, "movement_points_left": 10},
                "unit_cost": {"gold": 2000}
            }
        ]
    }
    
    return creatures.get(building_type, [])