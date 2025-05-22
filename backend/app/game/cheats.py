from backend.app.db.schema import GameState, Heroe, City
from typing import Dict, Any, Optional
import copy
from datetime import datetime

# --- Funciones de ayuda ---
def find_hero(game_state: GameState, hero_id: str) -> Optional[Heroe]:
    for hero in game_state.player.heroes:
        if hero.id == hero_id:
            return hero
    for hero in getattr(game_state.ai, 'heroes', []):
        if hero.id == hero_id:
            return hero
    return None

def find_city(game_state: GameState, city_id: str) -> Optional[City]:
    for city in game_state.player.cities:
        if city.id == city_id:
            return city
    for city in getattr(game_state.ai, 'cities', []):
        if city.id == city_id:
            return city
    return None

# --- Cheats principales ---
def cheat_subir_nivel(game_state: GameState, target: Dict[str, Any]) -> Dict[str, Any]:
    hero = find_hero(game_state, target.get('id'))
    if not hero:
        raise ValueError('Héroe no encontrado')
    before_level = hero.level
    before_stats = copy.deepcopy(hero.stats.dict())
    hero.level += 1
    # Ejemplo: +1 ataque y +1 poder por nivel
    hero.stats.attack += 1
    hero.stats.power += 1
    after_stats = hero.stats.dict()
    return {
        'success': True,
        'message': 'El héroe ha subido un nivel',
        'affected_entity': {
            'type': 'hero',
            'id': hero.id,
            'changes': {
                'level': {'before': before_level, 'after': hero.level},
                'stats': {'before': before_stats, 'after': after_stats}
            }
        }
    }

def cheat_construir_todos_edificios(game_state: GameState, target: Dict[str, Any]) -> Dict[str, Any]:
    city = find_city(game_state, target.get('id'))
    if not city:
        raise ValueError('Ciudad no encontrada')
    for building in city.buildings:
        building.built = True
    return {
        'success': True,
        'message': 'Todos los edificios han sido construidos',
        'affected_entity': {'type': 'city', 'id': city.id}
    }

def cheat_derrota_inmediata(game_state: GameState, target: Dict[str, Any]) -> Dict[str, Any]:
    # Cambiado de 'lost' a 'defeat' para que corresponda con lo que espera el frontend
    game_state.status = 'defeat'
    return {'success': True, 'message': 'Has perdido la partida', 'affected_entity': None}

def cheat_victoria_inmediata(game_state: GameState, target: Dict[str, Any]) -> Dict[str, Any]:
    game_state.status = 'victory'  # Changed from 'won' to 'victory'
    return {'success': True, 'message': '¡Has ganado la partida!', 'affected_entity': None}

def cheat_escuadron_arcangeles(game_state: GameState, target: Dict[str, Any]) -> Dict[str, Any]:
    hero = find_hero(game_state, target.get('id'))
    if not hero:
        raise ValueError('Héroe no encontrado')
    # Buscar si ya tiene arcángeles
    found = False
    for unit in hero.army:
        if unit.type == 'arcangel':
            unit.count += 35
            found = True
            break
    if not found:
        hero.army.append(type('ArmyUnit', (), {'type': 'arcangel', 'count': 35})())
    return {'success': True, 'message': 'El héroe ha recibido 35 arcángeles', 'affected_entity': {'type': 'hero', 'id': hero.id}}

def cheat_equipo_asedio(game_state: GameState, target: Dict[str, Any]) -> Dict[str, Any]:
    hero = find_hero(game_state, target.get('id'))
    if not hero:
        raise ValueError('Héroe no encontrado')
    hero.items = list(set(getattr(hero, 'items', []) + ['tienda', 'balista', 'municion']))
    return {'success': True, 'message': 'El héroe ha recibido equipo de asedio', 'affected_entity': {'type': 'hero', 'id': hero.id}}

def cheat_maxima_suerte(game_state: GameState, target: Dict[str, Any]) -> Dict[str, Any]:
    hero = find_hero(game_state, target.get('id'))
    if not hero:
        raise ValueError('Héroe no encontrado')
    hero.stats.luck = 3
    return {'success': True, 'message': 'El héroe tiene máxima suerte', 'affected_entity': {'type': 'hero', 'id': hero.id}}

def cheat_movimiento_infinito(game_state: GameState, target: Dict[str, Any]) -> Dict[str, Any]:
    hero = find_hero(game_state, target.get('id'))
    if not hero:
        raise ValueError('Héroe no encontrado')
    hero.stats.movement_points_left = 99999
    return {'success': True, 'message': 'El héroe tiene movimiento ilimitado', 'affected_entity': {'type': 'hero', 'id': hero.id}}

def cheat_maxima_moral(game_state: GameState, target: Dict[str, Any]) -> Dict[str, Any]:
    hero = find_hero(game_state, target.get('id'))
    if not hero:
        raise ValueError('Héroe no encontrado')
    hero.stats.morale = 3
    return {'success': True, 'message': 'El héroe tiene máxima moral', 'affected_entity': {'type': 'hero', 'id': hero.id}}

def cheat_revelar_tesoros(game_state: GameState, target: Dict[str, Any]) -> Dict[str, Any]:
    # Suponiendo que hay un campo en game_state.map para tesoros
    if hasattr(game_state, 'map'):
        for obj in getattr(game_state.map, 'objects', []):
            if getattr(obj, 'type', None) == 'treasure':
                obj.visible = True
    return {'success': True, 'message': 'Todos los tesoros han sido revelados', 'affected_entity': None}

def cheat_revelar_mapa(game_state: GameState, target: Dict[str, Any]) -> Dict[str, Any]:
    # Fog of war is implemented as a 1D array, not 2D
    if hasattr(game_state, 'map') and hasattr(game_state.map, 'fog_of_war'):
        # Set all fog of war values to False (revealing the entire map)
        game_state.map.fog_of_war = [False] * len(game_state.map.fog_of_war)
        
        # Also mark all tiles as explored
        if hasattr(game_state.map, 'explored'):
            game_state.map.explored = [True] * len(game_state.map.explored)
        
        # Add permanent reveal flag to prevent fog from being reset
        game_state.map.permanently_revealed = True
    
    return {'success': True, 'message': 'El mapa ha sido completamente revelado', 'affected_entity': None}

# --- Procesador principal ---
CHEAT_MAP = {
    'subir_nivel': cheat_subir_nivel,
    'construir_todos_edificios': cheat_construir_todos_edificios,
    'derrota_inmediata': cheat_derrota_inmediata,
    'victoria_inmediata': cheat_victoria_inmediata,
    'escuadron_arcangeles': cheat_escuadron_arcangeles,
    'equipo_asedio': cheat_equipo_asedio,
    'maxima_suerte': cheat_maxima_suerte,
    'movimiento_infinito': cheat_movimiento_infinito,
    'maxima_moral': cheat_maxima_moral,
    'revelar_tesoros': cheat_revelar_tesoros,
    'revelar_mapa': cheat_revelar_mapa
}

def process_cheat(game_state: GameState, cheat: Dict[str, Any]) -> Dict[str, Any]:
    code = cheat.get('cheat_code')
    target = cheat.get('target', {})
    if code not in CHEAT_MAP:
        raise ValueError('Tipo de cheat no válido')
    
    # Registrar el cheat utilizado si el estado del juego tiene el campo cheats_used
    if hasattr(game_state, 'cheats_used'):
        # Asegurarnos de que cheats_used es una lista
        if game_state.cheats_used is None:
            game_state.cheats_used = []
        
        # Añadir el cheat con información sobre el objetivo si es relevante
        cheat_info = {
            'code': code,
            'timestamp': datetime.now().isoformat(),
        }
        
        # Añadir información del objetivo si existe
        if target and 'id' in target:
            cheat_info['target_id'] = target['id']
            
        game_state.cheats_used.append(cheat_info)
        
    result = CHEAT_MAP[code](game_state, target)
    result['game_state'] = game_state
    return result
