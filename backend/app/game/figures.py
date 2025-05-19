"""
Módulo para mostrar figuras (héroes, edificios, elementos especiales) en el mapa del juego.
"""
from backend.app.db.schema import Position, GameMap, Heroe, Building
from typing import List, Dict, Any
import pygame

class AnimatedSprite:
    def __init__(self, sprite_sheet_path, frame_width, frame_height, num_frames, animation_speed=0.1, repeat=True):
        """
        sprite_sheet_path: ruta al archivo de la imagen sprite sheet
        frame_width: ancho de cada frame
        frame_height: alto de cada frame
        num_frames: número de frames en la animación
        animation_speed: tiempo (en segundos) entre frames
        repeat: si la animación debe repetirse
        """
        self.sprite_sheet = pygame.image.load(sprite_sheet_path).convert_alpha()
        self.frame_width = frame_width
        self.frame_height = frame_height
        self.num_frames = num_frames
        self.frames = self._split_frames()
        self.current_frame = 0
        self.animation_speed = animation_speed
        self.repeat = repeat
        self.is_playing = True
        self.last_update = pygame.time.get_ticks()

    def _split_frames(self):
        frames = []
        for i in range(self.num_frames):
            rect = pygame.Rect(i * self.frame_width, 0, self.frame_width, self.frame_height)
            frame = self.sprite_sheet.subsurface(rect)
            frames.append(frame)
        return frames

    def update(self, is_moving=True):
        """
        Debe llamarse en cada ciclo del juego. Si is_moving es True, avanza la animación.
        Si is_moving es False, se queda en el primer frame (reposo).
        """
        if not self.is_playing or not is_moving:
            self.current_frame = 0
            return
        now = pygame.time.get_ticks()
        if now - self.last_update > self.animation_speed * 1000:
            self.last_update = now
            self.current_frame += 1
            if self.current_frame >= self.num_frames:
                if self.repeat:
                    self.current_frame = 0
                else:
                    self.current_frame = self.num_frames - 1
                    self.is_playing = False

    def draw(self, surface, x, y):
        """Dibuja el frame actual en la posición (x, y) sobre la surface dada."""
        surface.blit(self.frames[self.current_frame], (x, y))

    def play(self):
        self.is_playing = True

    def stop(self):
        self.is_playing = False
        self.current_frame = 0

    def set_repeat(self, repeat: bool):
        self.repeat = repeat

# Ejemplo de integración con process_movement (pseudocódigo):
#
# def game_loop():
#     ...
#     is_moving = process_movement(hero_position, direction, ...)
#     animated_sprite.update(is_moving)
#     animated_sprite.draw(screen, hero_position.x, hero_position.y)
#     ...

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

def render_artifact_on_map(artifact, game_map):
    """Coloca la figura del artefacto en la posición actual en el mapa (modifica el objeto game_map.tiles)."""
    if not hasattr(artifact, 'position') or not hasattr(game_map, 'tiles'):
        print(f"DEBUG: Cannot render artifact - missing position or tiles")
        return
    
    try:
        idx = artifact.position.y * game_map.size.width + artifact.position.x
        if 0 <= idx < len(game_map.tiles):
            tile = game_map.tiles[idx]
            tile.object_type = 'artifact'
            tile.object_id = getattr(artifact, 'id', f"artifact_{artifact.position.x}_{artifact.position.y}")
            print(f"DEBUG: Artifact rendered at ({artifact.position.x}, {artifact.position.y})")
    except Exception as e:
        print(f"ERROR in render_artifact_on_map: {str(e)}")

def clear_artifact_from_map(artifact, game_map):
    """Elimina la figura del artefacto de su posición en el mapa."""
    if not hasattr(artifact, 'position') or not hasattr(game_map, 'tiles'):
        print(f"DEBUG: Cannot clear artifact - missing position or tiles")
        return
    
    try:
        # Método 1: Buscar por posición (más confiable)
        idx = artifact.position.y * game_map.size.width + artifact.position.x
        if 0 <= idx < len(game_map.tiles):
            tile = game_map.tiles[idx]
            if tile.object_type == 'artifact' and (tile.object_id == getattr(artifact, 'id', None) or not tile.object_id):
                tile.object_type = None
                tile.object_id = None
                print(f"DEBUG: Cleared artifact at ({artifact.position.x}, {artifact.position.y})")
                return
                
        # Método 2: Buscar por ID (por si la posición cambió)
        artifact_id = getattr(artifact, 'id', None)
        if artifact_id:
            for tile in game_map.tiles:
                if getattr(tile, 'object_type', None) == 'artifact' and getattr(tile, 'object_id', None) == artifact_id:
                    tile.object_type = None
                    tile.object_id = None
                    print(f"DEBUG: Cleared artifact with ID {artifact_id} from map")
                    return
    except Exception as e:
        print(f"ERROR in clear_artifact_from_map: {str(e)}")
