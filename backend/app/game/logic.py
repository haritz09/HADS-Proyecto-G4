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
HERO_VISION_RADIUS = 3  # Radio de visión estándar para héroes
MAX_TURNS = 10  # Número máximo de turnos antes de un empate

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
                    
    # Add a counter to avoid comparing Position objects directly
    counter = 0
    open_set = []
    # Add counter as a third element in the tuple to make each entry unique
    heapq.heappush(open_set, (0, counter, start))
    counter += 1
    
    came_from = {}
    g_score = { (start.x, start.y): 0 }
    f_score = { (start.x, start.y): abs(end.x - start.x) + abs(end.y - start.y) }
    
    while open_set:
        # Unpack the counter but we don't need to use it
        _, _, current = heapq.heappop(open_set)
        
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
                # Include counter in the heap entry to avoid Position comparisons
                heapq.heappush(open_set, (f, counter, neighbor))
                counter += 1
                
    return []  # No path found

def update_fog_of_war(game_state: GameState, hero_position: Position, vision_radius: int = HERO_VISION_RADIUS):
    """
    Actualiza la niebla de guerra y las casillas exploradas basándose en la posición del héroe.
    
    Args:
        game_state: Estado del juego
        hero_position: Posición del héroe
        vision_radius: Radio de visión del héroe (por defecto HERO_VISION_RADIUS)
    """
    if not game_state.map or not hasattr(game_state.map, 'fog_of_war'):
        print("ERROR: No se puede actualizar fog_of_war, estructura del mapa incorrecta")
        return
    
    map_width = game_state.map.size.width
    map_height = game_state.map.size.height
    
    # Inicializar explored si aún no existe
    if not hasattr(game_state.map, 'explored') or not game_state.map.explored:
        game_state.map.explored = [False] * (map_width * map_height)
    
    # Iteramos por todas las casillas dentro del radio de visión
    for y in range(max(0, hero_position.y - vision_radius), min(map_height, hero_position.y + vision_radius + 1)):
        for x in range(max(0, hero_position.x - vision_radius), min(map_width, hero_position.x + vision_radius + 1)):
            # Calcular distancia
            distance = math.sqrt((x - hero_position.x) ** 2 + (y - hero_position.y) ** 2)
            
            # Si está dentro del radio de visión
            if distance <= vision_radius:
                idx = y * map_width + x
                
                # Marcar como visible (quitar niebla)
                if 0 <= idx < len(game_state.map.fog_of_war):
                    game_state.map.fog_of_war[idx] = False
                
                # Marcar como explorado permanentemente
                if 0 <= idx < len(game_state.map.explored):
                    game_state.map.explored[idx] = True

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
        
        # Buscar el héroe en la entidad correcta según el turno actual
        if game_state.current_player == "player":
            hero = next((h for h in game_state.player.heroes if h.id == hero_id), None)
            enemy_heroes = game_state.ai.heroes  # The enemy heroes are AI heroes
        else:
            hero = next((h for h in game_state.ai.heroes if h.id == hero_id), None)
            enemy_heroes = game_state.player.heroes  # The enemy heroes are player heroes
            
        if not hero:
            raise ValueError(f"Hero not found with ID: {hero_id}")
        
        # Validate map boundaries
        if target_x < 0 or target_x >= game_state.map.size.width or target_y < 0 or target_y >= game_state.map.size.height:
            raise ValueError(f"Target position ({target_x}, {target_y}) is outside map boundaries")
        
        # Store original destination for return value
        original_destination = Position(x=target_x, y=target_y)
        
        # Calculate full path from current position to destination using A*
        start_position = Position(x=hero.position.x, y=hero.position.y)
        target_position = Position(x=target_x, y=target_y)
        
        print(f"DEBUG: Calculating path from ({start_position.x},{start_position.y}) to ({target_position.x},{target_position.y})")
        full_path = find_path_a_star(start_position, target_position, game_state.map)
        
        if not full_path or len(full_path) < 2:
            print(f"DEBUG: No valid path found to destination ({target_x},{target_y})")
            return {
                "success": False,
                "error": f"No valid path to destination ({target_x},{target_y})"
            }
        
        print(f"DEBUG: Found path with {len(full_path)} steps")
        
        # Track remaining movement points and walk through the path
        remaining_points = hero.stats.movement_points_left
        current_position = start_position
        final_position = None
        partial_movement = False
        
        # Log the hero's starting position and movement points
        print(f"DEBUG: Hero starting at ({current_position.x},{current_position.y}) with {remaining_points} movement points")
        
        # Get the hero's vision radius before starting movement
        vision_radius = getattr(hero.stats, 'vision_radius', HERO_VISION_RADIUS)
        
        # Update fog of war at the starting position
        update_fog_of_war(game_state, current_position, vision_radius)
        
        # Walk through the path until we reach the end or run out of movement points
        for i in range(1, len(full_path)):
            next_position = full_path[i]
            
            # Calculate cost for this path segment
            segment_cost = calculate_movement_cost(current_position, next_position)
            print(f"DEBUG: Step {i}: Moving to ({next_position.x},{next_position.y}), cost: {segment_cost}, remaining: {remaining_points}")
            
            # Check if we can afford this segment
            if remaining_points >= segment_cost:
                # Move to this position
                current_position = next_position
                remaining_points -= segment_cost
                final_position = current_position
                print(f"DEBUG: Moved to ({current_position.x},{current_position.y}), remaining points: {remaining_points}")
                
                # Update fog of war at this position in the path
                update_fog_of_war(game_state, current_position, vision_radius)
            else:
                # Can't move further along the path
                partial_movement = True
                print(f"DEBUG: Insufficient movement points to continue. Stopping at ({current_position.x},{current_position.y})")
                break
        
        # If we reached the end of the path, use the target position
        if not partial_movement:
            final_position = target_position
        
        # If no movement was possible at all, return error
        if final_position is None:
            return {
                "success": False,
                "error": "Insufficient movement points for any movement"
            }
        
        # Update hero position to the furthest reachable point
        original_x, original_y = hero.position.x, hero.position.y
        hero.position.x = final_position.x
        hero.position.y = final_position.y
        hero.stats.movement_points_left = remaining_points
        
        # We already updated fog of war at each step, so we don't need to do it again here
        # Just log that we've been updating fog of war along the path
        print(f"DEBUG: Updated fog of war along the path with vision radius {vision_radius}")
        
        print(f"DEBUG: Hero moved from ({original_x}, {original_y}) to ({hero.position.x}, {hero.position.y})")
        print(f"DEBUG: Hero has {hero.stats.movement_points_left} movement points left")
        
        # Improved enemy hero detection - ensure positions are compared as integers
        enemy_hero = None
        for e_hero in enemy_heroes:
            # Convert positions to integers to ensure accurate comparison
            hero_x, hero_y = int(hero.position.x), int(hero.position.y)
            e_hero_x, e_hero_y = int(e_hero.position.x), int(e_hero.position.y)
            
            print(f"DEBUG: Checking if hero at ({hero_x}, {hero_y}) is on same position as enemy at ({e_hero_x}, {e_hero_y})")
            if e_hero_x == hero_x and e_hero_y == hero_y:
                enemy_hero = e_hero
                print(f"DEBUG: Enemy hero detected at position ({hero_x}, {hero_y}): {enemy_hero.id}")
                break
                
        # If an enemy hero was found, trigger combat
        if enemy_hero:
            print(f"DEBUG: Combat detected between {hero.id} and {enemy_hero.id}")
            combat_result = resolve_combat(hero, enemy_hero)
            
            if game_state.current_player == "player":
                attacker_side = "player"
                defender_side = "ai" 
            else:
                attacker_side = "ai"
                defender_side = "player"
                
            # Format the result for frontend with battle steps included
            formatted_combat_result = {
                "winner": combat_result["winner"],
                "damage_dealt": {
                    "player": combat_result["damage_dealt"]["attacker"] if attacker_side == "player" else combat_result["damage_dealt"]["defender"],
                    "ai": combat_result["damage_dealt"]["attacker"] if attacker_side == "ai" else combat_result["damage_dealt"]["defender"],
                },
                "attacker_side": attacker_side,
                "defender_side": defender_side,
                "battle_steps": combat_result.get("battle_steps", [])  # Include battle steps
            }
            
            # Return combat result information directly
            return {
                "success": True,
                "hero_id": hero_id,
                "new_position": {"x": hero.position.x, "y": hero.position.y},
                "movement_points_left": hero.stats.movement_points_left,
                "interaction": "combat",  # Indicate this is a combat interaction
                "combat_result": formatted_combat_result,  # Include formatted combat results with battle steps
                "enemy_hero": enemy_hero.id,  # Include the enemy hero ID
                "partial_movement": partial_movement,
                "original_destination": {"x": original_destination.x, "y": original_destination.y} if partial_movement else None,
                "path": [{"x": pos.x, "y": pos.y} for pos in full_path[:i+1]]  # Include the actual path followed
            }
        
        # Check for interactions at the new position (artifacts, resources, etc.)
        try:
            print(f"DEBUG: Checking interactions at position ({hero.position.x}, {hero.position.y}) for hero {hero_id}")
            interaction_result = process_tile_interaction(hero, Position(x=hero.position.x, y=hero.position.y), game_state)
            print(f"DEBUG: Interaction result: {interaction_result}")
        except Exception as e:
            print(f"ERROR in interaction processing: {str(e)}")
            # Continue execution even if interaction processing fails
            interaction_result = {"interaction": "error", "error_message": str(e)}
        
        # Return information about the movement, including path information
        return {
            "success": True,
            "hero_id": hero_id,
            "new_position": {"x": hero.position.x, "y": hero.position.y},
            "movement_points_left": hero.stats.movement_points_left,
            "interaction": interaction_result,  # Include the interaction result in the response
            "partial_movement": partial_movement,
            "original_destination": {"x": original_destination.x, "y": original_destination.y} if partial_movement else None,
            "path": [{"x": pos.x, "y": pos.y} for pos in full_path[:i+1]]  # Include the actual path followed
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
    
    # Asegurar que battle_steps esté presente en el resultado
    if "battle_steps" not in combat_result:
        combat_result["battle_steps"] = []
    
    return combat_result

def is_hero_in_city(hero: Heroe, city: City, radius: int = 1) -> bool:
    """Devuelve True si el héroe está dentro del radio de la ciudad (incluyendo diagonales)."""
    dx = abs(hero.position.x - city.position.x)
    dy = abs(hero.position.y - city.position.y)
    return dx <= radius and dy <= radius

def process_recruitment(game_state: GameState, action: Dict[str, Any]) -> Dict[str, Any]:
    """Procesa el reclutamiento de unidades en un edificio de una ciudad"""
    details = action["details"]
    hero_id = details.get("hero_id") or details.get("heroId")
    city_id = details.get("city_id") or details.get("cityId")
    unit_type = details.get("unit_type") or details.get("unitType")
    count = details.get("count") or details.get("quantity", 0)
    building_id = details.get("building_id") or details.get("buildingId")

    # Determinar entidad actual (player o AI)
    current_entity = game_state.player if game_state.current_player == "player" else game_state.ai

    # Encontrar la ciudad
    city = next((c for c in current_entity.cities if c.id == city_id), None)
    if not city:
        raise ValueError("Ciudad no encontrada")

    # Encontrar el héroe en la entidad correcta
    hero = next((h for h in current_entity.heroes if h.id == hero_id), None)
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
    """Añade unidades reclutadas al ejército del héroe que interactúa con la ciudad."""
    # Buscar héroe en la ciudad o cerca
    hero = next((h for h in game_state.player.heroes if 
                 is_hero_in_city(h, city, radius=1)), None)
    
    if hero:
        # Buscar las estadísticas de la unidad en los edificios de la ciudad
        unit_stats = None
        for building in city.buildings:
            if hasattr(building, 'available_creatures'):
                for creature in building.available_creatures:
                    if creature.type == unit_type and hasattr(creature, 'stats'):
                        unit_stats = creature.stats
                        break
                if unit_stats:
                    break
        
        if not unit_stats:
            # Si no encontramos stats, creamos unas stats básicas
            unit_stats = Stats(
                attack=5,
                defense=5,
                speed=5,
                movement_points=5,
                movement_points_left=5.0
            )
        
        # Añadir a ejército del héroe
        unit = next((u for u in hero.army if u.type == unit_type), None)
        if unit:
            unit.count += amount
        else:
            # Crear nuevo ArmyUnit con las stats
            hero.army.append(ArmyUnit(
                type=unit_type, 
                count=amount,
                stats=unit_stats
            ))
    else:
        # Si no hay héroe, podrías implementar una guarnición de ciudad aquí
        pass  # Implementación opcional

def process_end_turn(game_state: GameState) -> Dict[str, Any]:
    """Procesa el final del turno"""
    current_player = game_state.current_player
    print(f"DEBUG: End turn processing. Current player: {current_player}")
    
    # Recolectar recursos de las minas para el jugador actual
    if current_player == "player":
        collect_resource_income(game_state.player, game_state.map, "player")
    else:
        collect_resource_income(game_state.ai, game_state.map, "ai")
    
    # Cambiar el jugador actual
    next_player = "ai" if current_player == "player" else "player"
    game_state.current_player = next_player
    print(f"DEBUG: Switching player turn from {current_player} to {next_player}")
    
    # Resetear fog of war (todo oculto de nuevo)
    map_width = game_state.map.size.width
    map_height = game_state.map.size.height
    game_state.map.fog_of_war = [True] * (map_width * map_height)
    
    # Recalcular visibilidad para el nuevo jugador actual
    if next_player == "player":
        for hero in game_state.player.heroes:
            vision_radius = getattr(hero.stats, 'vision_radius', HERO_VISION_RADIUS)
            update_fog_of_war(game_state, hero.position, vision_radius)
    else:
        for hero in game_state.ai.heroes:
            vision_radius = getattr(hero.stats, 'vision_radius', HERO_VISION_RADIUS)
            update_fog_of_war(game_state, hero.position, vision_radius)
    
    # Log hero movement points BEFORE restoration
    if next_player == "player":
        print(f"DEBUG: Player heroes movement points BEFORE restoration:")
        for hero in game_state.player.heroes:
            print(f"DEBUG: Hero {hero.id}: {hero.stats.movement_points_left}/{hero.stats.movement_points}")
    else:
        print(f"DEBUG: AI heroes movement points BEFORE restoration:")
        for hero in game_state.ai.heroes:
            print(f"DEBUG: Hero {hero.id}: {hero.stats.movement_points_left}/{hero.stats.movement_points}")
    
    # Restaurar puntos de movimiento para el PRÓXIMO jugador (que ahora es current_player después del cambio)
    if next_player == "player":
        for hero in game_state.player.heroes:
            hero.stats.movement_points_left = hero.stats.movement_points
            print(f"DEBUG: Restored player hero {hero.id} movement points to {hero.stats.movement_points_left}")
    else:
        for hero in game_state.ai.heroes:
            hero.stats.movement_points_left = hero.stats.movement_points
            print(f"DEBUG: Restored AI hero {hero.id} movement points to {hero.stats.movement_points_left}")
    
    # Si es un nuevo día
    if current_player == "ai":  # El turno de la IA es el último del día
        game_state.turn += 1
        print(f"DEBUG: Incrementing turn to {game_state.turn}")

        # Procesar crecimiento semanal si estamos en múltiplo de 7
        if game_state.turn % 7 == 0:
            process_weekly_growth_both(game_state)
            print(f"DEBUG: Processed weekly growth at turn {game_state.turn}")
    
    # Verificar condiciones de fin de juego después de procesar el turno
    game_status = check_game_over_conditions(game_state)
    if not hasattr(game_state, 'status'):
        game_state.status = 'ongoing'
    
    # Actualizar el estado de la partida si ha cambiado
    if game_status != 'ongoing':
        print(f"DEBUG: Game over condition detected: {game_status}")
        game_state.status = game_status
    
    return {
        "next_player": game_state.current_player,
        "turn": game_state.turn,
        "resources_collected": True,
        "game_status": game_status
    }

def check_game_over_conditions(game_state: GameState) -> str:
    """
    Verifica si la partida ha terminado y determina el resultado.
    
    Returns:
        str: 'ongoing', 'victory', 'defeat', o 'draw'
    """
    # Verificar condición de empate por número de turnos
    if game_state.turn > MAX_TURNS:
        return 'draw'
    
    # Verificar condición de derrota (sin héroes del jugador)
    player_defeated = (len(game_state.player.heroes) == 0)
    if player_defeated:
        return 'defeat'
    
    # Verificar condición de victoria (sin héroes de la IA)
    ai_defeated = (len(game_state.ai.heroes) == 0)
    if ai_defeated:
        return 'victory'
    
    # La partida continúa
    return 'ongoing'

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
    """Resuelve un combate entre dos héroes con pasos detallados para visualización"""
    # Sistema de combate por turnos basado en velocidad
    units = []
    for army, side in [(attacker.army, 'attacker'), (defender.army, 'defender')]:
        for unit in army:
            units.append({
                "unit": unit,
                "speed": unit.stats.speed if hasattr(unit, 'stats') and hasattr(unit.stats, 'speed') else 3,
                "side": side,
                "name": unit.type,
                "count": unit.count
            })
    
    # Ordenar unidades por velocidad
    units.sort(key=lambda x: x["speed"], reverse=True)
    
    damage_dealt = {"attacker": 0, "defender": 0}
    battle_steps = []
    
    # Agregar paso inicial describiendo el combate
    battle_steps.append({
        "description": f"¡Comienza el combate entre {attacker.name} y {defender.name}!",
        "damage": 0,
        "side": "none"
    })
    
    # Crear una copia de las tropas para no modificar las originales durante el combate
    remaining_troops = {
        "attacker": {unit["name"]: unit["count"] for unit in units if unit["side"] == "attacker"},
        "defender": {unit["name"]: unit["count"] for unit in units if unit["side"] == "defender"}
    }
    
    # Continuar el combate hasta que un lado no tenga tropas (con límite de seguridad)
    max_rounds = 30  # Límite para evitar bucles infinitos
    round_num = 0
    battle_ongoing = True
    
    while battle_ongoing and round_num < max_rounds:
        round_num += 1
        
        # Comprobar si algún bando ya no tiene tropas
        attacker_has_troops = sum(remaining_troops["attacker"].values()) > 0
        defender_has_troops = sum(remaining_troops["defender"].values()) > 0
        
        if not attacker_has_troops or not defender_has_troops:
            break
            
        # Agregar marcador de nueva ronda si no es la primera
        if round_num > 1:
            battle_steps.append({
                "description": f"Ronda {round_num} de combate",
                "damage": 0,
                "side": "none"
            })
        
        # Cada unidad ataca según su orden (basado en velocidad)
        for unit_info in units:
            # Saltarse unidades que ya no tienen tropas disponibles
            current_count = remaining_troops[unit_info["side"]].get(unit_info["name"], 0)
            if current_count <= 0:
                continue
                
            # Obtener stats de la unidad
            unit_stats = getattr(unit_info["unit"], 'stats', None)
            attack_value = getattr(unit_stats, 'attack', 5) if unit_stats else 5
            
            # Calcular daño básico (ataque * cantidad actual)
            base_damage = attack_value * current_count
            
            # Aplicar modificadores (simplificado)
            damage_multiplier = 1.0
            
            # Moral y suerte (simplificado)
            if random.random() < 0.2:  # 20% chance of morale bonus
                damage_multiplier *= 1.2
                battle_steps.append({
                    "description": f"¡Los {unit_info['name']} de {attacker.name if unit_info['side'] == 'attacker' else defender.name} atacan con alta moral!",
                    "type": "morale_bonus",
                    "unit": unit_info["name"],
                    "side": unit_info["side"]
                })
            
            if random.random() < 0.1:  # 10% chance of critical hit
                damage_multiplier *= 1.5
                battle_steps.append({
                    "description": f"¡Golpe crítico de los {unit_info['name']} de {attacker.name if unit_info['side'] == 'attacker' else defender.name}!",
                    "type": "critical_hit",
                    "unit": unit_info["name"],
                    "side": unit_info["side"]
                })
            
            # Calcular daño final
            final_damage = int(base_damage * damage_multiplier)
            
            # Target side is the opposite of the attacker
            target_side = "defender" if unit_info["side"] == "attacker" else "attacker"
            target_name = defender.name if unit_info["side"] == "attacker" else attacker.name
            
            # Encontrar la unidad objetivo más débil con tropas restantes
            target_units = [(name, count) for name, count in remaining_troops[target_side].items() if count > 0]
            if not target_units:  # No quedan objetivos
                break
                
            # Ordenar por defensa más baja (simulado - en un juego real tendríamos stats por tipo)
            target_unit_name = target_units[0][0]  # Por ahora simplemente tomamos el primero disponible
            
            # Registrar el paso de ataque
            battle_step = {
                "description": f"Los {unit_info['name']} de {attacker.name if unit_info['side'] == 'attacker' else defender.name} atacan a los {target_unit_name} de {target_name}.",
                "damage": final_damage,
                "attacker_unit": unit_info["name"],
                "defender_unit": target_unit_name,
                "side": unit_info["side"]
            }
            
            # Calcular bajas (simplificado)
            target_hp = 10  # HP base para todas las unidades
            casualties = min(max(1, int(final_damage / target_hp)), remaining_troops[target_side][target_unit_name])
            
            if casualties > 0:
                # IMPORTANTE: Actualizar las tropas restantes del objetivo
                remaining_troops[target_side][target_unit_name] -= casualties
                
                battle_step["casualties"] = {
                    "unit_type": target_unit_name,
                    "count": casualties,
                    "side": target_side
                }
                
                # Si se eliminan todas las tropas de este tipo, comprobar si el bando objetivo ya no tiene tropas
                if remaining_troops[target_side][target_unit_name] <= 0:
                    if sum(remaining_troops[target_side].values()) <= 0:
                        battle_ongoing = False
            
            battle_steps.append(battle_step)
            
            # Acumular el daño total
            damage_dealt[unit_info["side"]] += final_damage
            
            # Verificar si el defensor se ha quedado sin tropas después de este ataque
            if sum(remaining_troops[target_side].values()) <= 0:
                break
    
    # Determinar el ganador basado en tropas restantes
    attacker_troops_left = sum(remaining_troops["attacker"].values())
    defender_troops_left = sum(remaining_troops["defender"].values())
    
    if attacker_troops_left > 0 and defender_troops_left <= 0:
        winner = "player"  # El atacante (player) ganó
    elif defender_troops_left > 0 and attacker_troops_left <= 0:
        winner = "ai"      # El defensor (ai) ganó
    else:
        # En caso de que ambos tengan tropas (límite de rondas) o ninguno tenga (empate extraño),
        # decidir por daño total como fallback
        winner = "player" if damage_dealt["attacker"] > damage_dealt["defender"] else "ai"
    
    # Agregar paso final con el resultado
    battle_steps.append({
        "description": f"¡La batalla ha terminado! {attacker.name if winner == 'player' else defender.name} ha vencido.",
        "damage": 0,
        "side": "attacker" if winner == "player" else "defender",
        "attacker_troops_left": attacker_troops_left,
        "defender_troops_left": defender_troops_left
    })
    
    return {
        "winner": winner, 
        "damage_dealt": damage_dealt,
        "battle_steps": battle_steps,
        "attacker_troops_left": attacker_troops_left,
        "defender_troops_left": defender_troops_left
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

def process_resource_collection(game_state: GameState, action: dict) -> dict:
    """
    Procesa la acción de recolección de recursos de un tile del mapa
    """
    try:
        details = action["details"]
        hero_id = details.get("hero_id") or details.get("heroId")
        resource_type = details.get("resource_type") or details.get("resourceType")
        location = details.get("location")
        
        # Verificar si la información de ubicación es correcta
        if not location or not isinstance(location, dict) or "x" not in location or "y" not in location:
            raise ValueError("Ubicación de recurso inválida o no especificada")
            
        # Convertir coordenadas a enteros
        position_x = int(location["x"])
        position_y = int(location["y"])
        
        # Buscar héroe en la entidad correcta según el turno actual
        if game_state.current_player == "player":
            hero = next((h for h in game_state.player.heroes if h.id == hero_id), None)
            current_entity = game_state.player
        else:
            hero = next((h for h in game_state.ai.heroes if h.id == hero_id), None)
            current_entity = game_state.ai
            
        if not hero:
            raise ValueError(f"Héroe no encontrado con ID: {hero_id}")
            
        # Verificar que el héroe está en la posición correcta
        if hero.position.x != position_x or hero.position.y != position_y:
            raise ValueError(f"El héroe debe estar en la posición del recurso ({position_x}, {position_y})")
            
        # Buscar objeto de recurso en la posición
        resource_obj = None
        for obj in game_state.map.visible_objects:
            if hasattr(obj, "position") and obj.position.x == position_x and obj.position.y == position_y:
                # Verificar si es un recurso por tipo o resource_type
                if (hasattr(obj, "type") and obj.type in ["goldmine", "sawmill", "quarry"]) or \
                   (hasattr(obj, "resource_type") and obj.resource_type in ["gold", "wood", "stone"]):
                    resource_obj = obj
                    break
                    
        if not resource_obj:
            raise ValueError(f"No se encontró recurso en la posición ({position_x}, {position_y})")
            
        # Verificar si ya tiene dueño
        if hasattr(resource_obj, "owner") and resource_obj.owner:
            if resource_obj.owner == game_state.current_player:
                return {
                    "success": True,
                    "message": "Este recurso ya te pertenece",
                    "resource_type": getattr(resource_obj, "resource_type", "unknown"),
                    "position": {"x": position_x, "y": position_y}
                }
            else:
                # Si pertenece al enemigo, capturarlo
                previous_owner = resource_obj.owner
                resource_obj.owner = game_state.current_player
                
                return {
                    "success": True,
                    "message": f"Has capturado este recurso de {previous_owner}",
                    "resource_type": getattr(resource_obj, "resource_type", "unknown"),
                    "position": {"x": position_x, "y": position_y},
                    "previous_owner": previous_owner
                }
        
        # Asignar dueño al recurso
        resource_obj.owner = game_state.current_player
        
        # Respuesta para el frontend
        return {
            "success": True,
            "message": f"Has recolectado un recurso de tipo {getattr(resource_obj, 'resource_type', 'desconocido')}",
            "resource_type": getattr(resource_obj, "resource_type", "unknown"),
            "position": {"x": position_x, "y": position_y}
        }
    except Exception as e:
        print(f"ERROR in process_resource_collection: {str(e)}")
        return {
            "success": False,
            "error": f"Error recolectando recurso: {str(e)}"
        }

def transfer_troops_between_hero_and_castle(game_state: GameState, action: Dict[str, Any]) -> Dict[str, Any]:
    """
    Permite transferir tropas entre el héroe y el castillo central si el héroe está en el castillo.
    """
    try:
        details = action["details"]
        
        # Normalizar campos que pueden tener diferentes nombres
        hero_id = details.get("hero_id") or details.get("heroId")
        
        # Aceptar tanto cityId como castleId
        city_id = details.get("city_id") or details.get("cityId") or details.get("castleId")
        
        # Aceptar tanto unitType como troops
        unit_type = details.get("unit_type") or details.get("unitType") or details.get("troops")
        
        # Aceptar tanto count como quantity
        count = details.get("count") or details.get("quantity", 0)
        
        if not hero_id or not city_id or not unit_type:
            raise ValueError("Faltan campos requeridos para la transferencia (héroe, ciudad o tipo de unidad)")
        
        # Determinar la entidad correcta basado en el turno actual
        if game_state.current_player == "player":
            entity = game_state.player
        else:
            entity = game_state.ai
        
        # Encontrar ciudad y castillo
        city = next((c for c in entity.cities if c.id == city_id), None)
        if not city:
            raise ValueError("Ciudad no encontrada")
        castle = next((b for b in city.buildings if getattr(b, 'is_castle', False)), None)
        if not castle:
            raise ValueError("Castillo no encontrado en la ciudad")

        # Verificar que el héroe está en el castillo
        hero = next((h for h in entity.heroes if h.id == hero_id), None)
        if not hero or hero.position.x != castle.position.x or hero.position.y != castle.position.y:
            raise ValueError("El héroe debe estar en el castillo para transferir tropas")

        # Inicializar guarnición del castillo si no existe
        if not hasattr(castle, 'garrison'):
            castle.garrison = []  # lista de ArmyUnit

        # Procesar transferencias
        transfers = details.get("transfers", [])
        if not transfers:
            # Si no hay lista de transferencias, crear una con los datos directos
            transfers = [{
                "unitType": unit_type,
                "to_castle": details.get("to_castle", 0),
                "to_hero": details.get("to_hero", 0)
            }]

        for t in transfers:
            unit_type = t.get('unitType', unit_type)
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
    except Exception as e:
        print(f"ERROR in transfer_troops_between_hero_and_castle: {str(e)}")
        return {
            "success": False,
            "error": f"Error en transferencia: {str(e)}"
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
                "growth_per_week": 1,
                "stats": {"attack": 15, "defense": 12, "speed": 8, "movement_points": 10, "movement_points_left": 10},
                "unit_cost": {"gold": 2000}
            }
        ]
    }
    
    return creatures.get(building_type, [])