"""
Módulo para mostrar figuras (héroes, edificios, elementos especiales) en el mapa del juego.
"""
from backend.app.db.schema import Position, GameMap, Heroe, Building
from typing import List, Dict, Any

def render_hero_on_map(hero: Heroe, game_map: GameMap) -> None:
    """Coloca la figura del héroe en la posición actual en el mapa (modifica el objeto game_map.tiles)."""
    idx = hero.position.y * game_map.size.width + hero.position.x
    if game_map.tiles and 0 <= idx < len(game_map.tiles):
        tile = game_map.tiles[idx]
        tile.object_type = 'hero'
        tile.object_id = hero.id

def clear_hero_from_map(hero: Heroe, game_map: GameMap) -> None:
    """Elimina la figura del héroe de su posición anterior en el mapa."""
    for tile in game_map.tiles or []:
        if getattr(tile, 'object_type', None) == 'hero' and getattr(tile, 'object_id', None) == hero.id:
            tile.object_type = None
            tile.object_id = None

def render_building_on_map(building: Building, game_map: GameMap) -> None:
    idx = building.position.y * game_map.size.width + building.position.x
    if game_map.tiles and 0 <= idx < len(game_map.tiles):
        tile = game_map.tiles[idx]
        tile.object_type = 'building'
        tile.object_id = building.id

def render_special_on_map(position: Position, special_type: str, game_map: GameMap) -> None:
    idx = position.y * game_map.size.width + position.x
    if game_map.tiles and 0 <= idx < len(game_map.tiles):
        tile = game_map.tiles[idx]
        tile.object_type = special_type
        tile.object_id = None
