from backend.app.game.logic import process_end_turn, process_hero_attack, process_hero_movement, process_recruitment, transfer_troops_between_hero_and_castle, process_build_structure
from backend.app.game.cheats import process_cheat
from fastapi import APIRouter, HTTPException, status, Query, Depends, Body
from typing import List, Optional
from backend.app.db.schema import GameRead, GameState
from backend.app.api.api_v1.endpoints.auth import get_current_user
from backend.app.db.crud import (
    list_saved_games,
    create_game,
    get_game,
    update_game,
    get_db_client
)
from bson import ObjectId
from datetime import datetime, UTC
import logging

# Configure logging
logger = logging.getLogger(__name__)

from ai_service.client.groq_client import GroqClient

router = APIRouter()

def ensure_buildings_have_building_type(game_state):
    """Ensure all buildings have a building_type field to avoid validation errors."""
    if not game_state:
        return game_state
        
    # Handle both object and dictionary versions
    is_dict = isinstance(game_state, dict)
    
    # Helper function to get attribute from either dict or object
    def get_attr(obj, attr):
        if is_dict:
            return obj.get(attr)
        return getattr(obj, attr, None) if hasattr(obj, attr) else None
    
    # Helper function to set attribute on either dict or object
    def set_attr(obj, attr, value):
        if is_dict:
            obj[attr] = value
        else:
            setattr(obj, attr, value)
    
    # Process player cities
    player = get_attr(game_state, 'player')
    if player:
        cities = get_attr(player, 'cities')
        if cities:
            for city in cities:
                buildings = get_attr(city, 'buildings')
                if buildings:
                    for building in buildings:
                        # Check if building_type is missing
                        building_type = get_attr(building, 'building_type')
                        if not building_type:
                            # Try to infer from id
                            building_id = get_attr(building, 'id')
                            if building_id:
                                # Use building ID to determine type
                                id_to_type = {
                                    'castle': 'castle',
                                    'barracks': 'barracks',
                                    'archery': 'archery',
                                    'knights_tower': 'knights_tower',
                                    'mage_tower': 'mage_tower',
                                    'dragons_lair': 'dragons_lair'
                                }
                                
                                # Check if any key matches the id
                                for key, value in id_to_type.items():
                                    if key in building_id:
                                        set_attr(building, 'building_type', value)
                                        print(f"Set building_type={value} for building with id={building_id}")
                                        break
                                
                                # If still no match, use the id itself
                                if not get_attr(building, 'building_type'):
                                    set_attr(building, 'building_type', building_id)
                                    print(f"Fallback: Set building_type={building_id} (from id)")
                            else:
                                # Use building name as fallback
                                building_name = get_attr(building, 'name')
                                if building_name:
                                    name_to_type = {
                                        'Castillo': 'castle',
                                        'Cuartel': 'barracks',
                                        'Campo de Tiro': 'archery', 
                                        'Torre de Caballeros': 'knights_tower',
                                        'Torre de Magos': 'mage_tower',
                                        'Guarida de Dragones': 'dragons_lair'
                                    }
                                    if building_name in name_to_type:
                                        set_attr(building, 'building_type', name_to_type[building_name])
                                        print(f"Set building_type from name: {name_to_type[building_name]}")
                                    else:
                                        # Default fallback
                                        set_attr(building, 'building_type', 'unknown')
                                        print(f"Set default building_type='unknown'")
                                else:
                                    # Last resort
                                    set_attr(building, 'building_type', 'unknown')
                                    print(f"Set default building_type='unknown' (no id or name)")
    
    # Process AI cities (same logic)
    ai = get_attr(game_state, 'ai')
    if ai:
        cities = get_attr(ai, 'cities')
        if cities:
            for city in cities:
                buildings = get_attr(city, 'buildings')
                if buildings:
                    for building in buildings:
                        # Same logic as above
                        building_type = get_attr(building, 'building_type')
                        if not building_type:
                            building_id = get_attr(building, 'id')
                            if building_id:
                                id_to_type = {
                                    'castle': 'castle',
                                    'barracks': 'barracks',
                                    'archery': 'archery',
                                    'knights_tower': 'knights_tower',
                                    'mage_tower': 'mage_tower',
                                    'dragons_lair': 'dragons_lair'
                                }
                                for key, value in id_to_type.items():
                                    if key in building_id:
                                        set_attr(building, 'building_type', value)
                                        break
                                if not get_attr(building, 'building_type'):
                                    set_attr(building, 'building_type', building_id)
                            else:
                                building_name = get_attr(building, 'name')
                                if building_name:
                                    name_to_type = {
                                        'Castillo': 'castle',
                                        'Cuartel': 'barracks',
                                        'Campo de Tiro': 'archery', 
                                        'Torre de Caballeros': 'knights_tower',
                                        'Torre de Magos': 'mage_tower',
                                        'Guarida de Dragones': 'dragons_lair'
                                    }
                                    if building_name in name_to_type:
                                        set_attr(building, 'building_type', name_to_type[building_name])
                                    else:
                                        set_attr(building, 'building_type', 'unknown')
                                else:
                                    set_attr(building, 'building_type', 'unknown')
                        
    return game_state

def sanitize_game_data(game_data):
    """Sanitiza los datos del juego para evitar errores de validación."""
    if not game_data or not isinstance(game_data, dict):
        return game_data
        
    # Sanitizar growth_per_week en todas las ciudades
    if "game_state" in game_data:
        for side in ["player", "ai"]:
            if side in game_data["game_state"]:
                entity = game_data["game_state"][side]
                if "cities" in entity and isinstance(entity["cities"], list):
                    for city in entity["cities"]:
                        if "buildings" in city and isinstance(city["buildings"], list):
                            for building in city["buildings"]:
                                if "available_creatures" in building and isinstance(building["available_creatures"], list):
                                    for creature in building["available_creatures"]:
                                        if "growth_per_week" in creature:
                                            # Convertir growth_per_week a entero
                                            try:
                                                creature["growth_per_week"] = int(creature["growth_per_week"])
                                            except (ValueError, TypeError):
                                                creature["growth_per_week"] = 1  # Valor predeterminado seguro
    
    return game_data

@router.get("/", response_model=List[GameRead])
async def listar_partidas_guardadas(
    current_user: dict = Depends(get_current_user)
):
    """Listar partidas guardadas del usuario actual."""
    try:
        user_id = str(current_user["_id"])
        games = list_saved_games(user_id)
        
        # Asegurar que los datos cumplen con el esquema
        for game in games:
            if 'game_state' in game:
                # Añadir campo speed donde falte
                for hero in game['game_state'].get('player', {}).get('heroes', []):
                    if 'stats' in hero:
                        hero['stats']['speed'] = hero['stats'].get('movement_points', 5)  # Valor por defecto
                
                # Hacer lo mismo para las unidades en armies y available_creatures
                for hero in game['game_state'].get('player', {}).get('heroes', []):
                    for unit in hero.get('army', []):
                        if not unit.get('stats'):
                            unit['stats'] = {
                                'attack': 1,
                                'defense': 1,
                                'speed': 1,
                                'power': 1,
                                'knowledge': 1,
                                'movement_points': 5,
                                'movement_points_left': 5
                            }
                
                for city in game['game_state'].get('player', {}).get('cities', []):
                    for building in city.get('buildings', []):
                        for creature in building.get('available_creatures', []):
                            if 'stats' in creature:
                                creature['stats']['speed'] = creature['stats'].get('movement_points', 5)

        return games
            
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error al listar partidas: {str(e)}"
        )

@router.post("/", response_model=GameRead, status_code=201)
async def crear_nueva_partida(
    game_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Crear una nueva partida."""
    if str(game_data.get("user_id")) != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="No autorizado para crear partida para otro usuario")
    
    # Asegurar que el mapa sea 100x100
    map_size = 100
    total_tiles = map_size * map_size
    
    # Actualizar el tamaño del mapa en game_state
    if "game_state" in game_data and "map" in game_data["game_state"]:
        game_data["game_state"]["map"]["size"] = {"width": map_size, "height": map_size}
        game_data["game_state"]["map"]["tiles"] = [
            {"terrain": "grass", "passable": True, "object_id": None, "object_type": None}
            for _ in range(total_tiles)
        ]
        game_data["game_state"]["map"]["fog_of_war"] = [False] * total_tiles
        game_data["game_state"]["map"]["explored"] = [True] * total_tiles
        
        # Mark tiles containing resource mines
        if "visible_objects" in game_data["game_state"]["map"]:
            for obj in game_data["game_state"]["map"]["visible_objects"]:
                if "position" in obj and "type" in obj:
                    # Check if it's a resource mine by type or properties
                    is_mine = (obj["type"] in ["goldmine", "sawmill", "quarry"] or 
                              ("resource_type" in obj and obj["resource_type"] in ["gold", "wood", "stone"]))
                    
                    if is_mine and "position" in obj:
                        x = obj["position"]["x"]
                        y = obj["position"]["y"]
                        idx = y * map_size + x
                        
                        if 0 <= idx < len(game_data["game_state"]["map"]["tiles"]):
                            # Mark the tile with the object type and ID
                            game_data["game_state"]["map"]["tiles"][idx]["object_type"] = obj["type"]
                            game_data["game_state"]["map"]["tiles"][idx]["object_id"] = obj["id"]
                            
                            # Print for debugging
                            print(f"Marked mine ({obj['type']}) at position ({x}, {y})")
    
    game_data["created_at"] = datetime.now(UTC)
    game_data["last_saved"] = datetime.now(UTC)
    
    # CRITICAL: Fix for city buildings missing building_type
    if "game_state" in game_data and "player" in game_data["game_state"] and "cities" in game_data["game_state"]["player"]:
        cities = game_data["game_state"]["player"]["cities"]
        
        # Debug information
        print(f"Processing {len(cities)} cities in game creation")
        
        # Process each city
        for i, city in enumerate(cities):
            if "buildings" in city:
                buildings = city["buildings"]
                print(f"City {i}: {city.get('id', 'unknown')}, Found {len(buildings)} buildings")
                
                # Process each building
                for j, building in enumerate(buildings):
                    building_id = building.get("id", "unknown")
                    
                    # DIRECT FIX: Add building_type if missing
                    if "building_type" not in building:
                        # Try to determine building_type from ID
                        id_parts = building_id.split("_")
                        if len(id_parts) > 0:
                            # Use first part of ID as type
                            if id_parts[0] in ["castle", "barracks", "archery", "knights_tower", "mage_tower", "dragons_lair"]:
                                building["building_type"] = id_parts[0]
                            else:
                                # Use entire ID as building_type
                                building["building_type"] = building_id
                        else:
                            # Default building_type
                            building["building_type"] = building_id
                        
                        print(f"Added building_type={building['building_type']} to building id={building_id}")
    
    # Then apply our general function to catch any missed buildings
    if "game_state" in game_data:
        game_data["game_state"] = ensure_buildings_have_building_type(game_data["game_state"])
    
    return create_game(game_data)

@router.get("/{game_id}", response_model=GameRead)
async def cargar_partida_guardada(
    game_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Cargar una partida guardada por su ID."""
    game = get_game_internal(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Partida no encontrada")
    
    # Verificar que el usuario es dueño de la partida
    if str(game["user_id"]) != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="No autorizado para cargar esta partida")
    
    return game

def get_game_internal(game_id: str):
    """Encapsulates the logic for getting a game, for reuse in other endpoints."""
    game = get_game(game_id)
    if not game:
        return None
    
    # Sanitizar los datos del juego antes de devolverlos
    sanitized_game = sanitize_game_data(game)
    
    return sanitized_game

@router.post("/{game_id}/action")
async def process_action(
    game_id: str,
    action: dict,
    current_user: dict = Depends(get_current_user)
):
    """Procesa una acción del jugador en su turno."""
    
    # 1. Obtener el estado actual del juego
    game = get_game(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Partida no encontrada")
    
    # Verificar que el usuario es dueño de la partida
    if str(game["user_id"]) != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="No autorizado para esta acción")
    
    # 2. Validar que es el turno del jugador
    try:
        game_state = GameState(**game["game_state"])
        if game_state.current_player != "player":
            raise HTTPException(status_code=400, detail="No es el turno del jugador")

        # Print debug info to help diagnose structure issues
        print(f"Acción recibida: {action}")
        
        action_type = action.get("type")
        if not action_type:
            raise HTTPException(status_code=400, detail="El tipo de acción es requerido")
            
        # 3. Validar y procesar la acción según su tipo
        try:
            result = None
            if action_type == "moveHero":
                result = process_hero_movement(game_state, action)
                # Verificar que la posición del héroe coincide con la posición objetivo
                hero = next((h for h in game_state.player.heroes if h.id == action["details"]["hero_id"]), None)
                if hero:
                    target_x = action["details"].get("x")
                    target_y = action["details"].get("y")
                    if target_x is not None and target_y is not None:
                        hero.position.x = target_x
                        hero.position.y = target_y
                        logger.info(f"GAMES_API: Hero position synced to ({target_x},{target_y})")
                    
                # Solo cerrar el menú si el héroe realmente se alejó del castillo
                if hero and (hero.position.x != 48 or hero.position.y != 48):
                    result["close_construction_menu"] = True
            elif action_type == "combat":
                result = process_hero_attack(game_state, action)
            elif action_type == "recruitUnits":
                result = process_recruitment(game_state, action)
            elif action_type == "buildStructure":
                result = process_build_structure(game_state, action)
                
                # Añadir log específico para buildStructure
                if result and result.get("success"):
                    logger.info(f"Building successful! Type: {action['details']['structureType']}, City: {action['details']['cityId']}")
                    # Asegurar que el owner está asignado correctamente
                    if "built" in result:
                        logger.info(f"Building {result['built']} set with owner: {game_state.current_player}")
                        
            elif action_type == "transfer": # Transerir tropas entre heroe-castillo
                result = transfer_troops_between_hero_and_castle(game_state, action)
            elif action_type == "endTurn":
                result = process_end_turn(game_state)
            else:
                raise HTTPException(status_code=400, detail=f"Tipo de acción no válido: {action_type}")
            
            # 4. Guardar el nuevo estado
            # Asegurarnos de hacer un model_dump() completo del game_state
            game_state_dump = game_state.model_dump()
            game["game_state"] = game_state_dump
            
            # Log para movimiento de héroe - verificar coordenadas antes de guardar en BD
            if action_type == "moveHero" and "hero_id" in action.get("details", {}):
                hero_id = action["details"]["hero_id"]
                hero = next((h for h in game_state.player.heroes if h.id == hero_id), None)
                if hero:
                    logger.info(f"GAMES_API: [DATABASE_UPDATE] Saving hero {hero_id} position to database. Position=({hero.position.x},{hero.position.y})")
                    
                    # Verificar que la posición se ha serializado correctamente en el dump
                    serialized_heroes = game["game_state"]["player"]["heroes"]
                    serialized_hero = next((h for h in serialized_heroes if h["id"] == hero_id), None)
                    if serialized_hero and (serialized_hero["position"]["x"] != hero.position.x or 
                                           serialized_hero["position"]["y"] != hero.position.y):
                        # Corregir posición manualmente si hay discrepancia
                        serialized_hero["position"]["x"] = hero.position.x
                        serialized_hero["position"]["y"] = hero.position.y
                
            # Guardar en la base de datos
            logger.info(f"GAMES_API: Calling update_game() to persist game state in database for game_id={game_id}")
            updated_game = update_game(game_id, game)
            
            # Confirmar que se guardó correctamente
            if action_type == "moveHero" and updated_game and "game_state" in updated_game:
                try:
                    hero_id = action["details"]["hero_id"]
                    saved_heroes = updated_game["game_state"]["player"]["heroes"]
                    saved_hero = next((h for h in saved_heroes if h["id"] == hero_id), None)
                    if saved_hero:
                        logger.info(f"GAMES_API: [DATABASE_VERIFY] Hero position in database after save: heroId={hero_id}, savedPosition=({saved_hero['position']['x']},{saved_hero['position']['y']})")
                except Exception as e:
                    logger.error(f"GAMES_API: Error verificando posición guardada: {str(e)}")
            
            return {
                "status": "success",
                "result": result,
                "game_state": game_state
            }
            
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            print(f"Error inesperado procesando acción: {str(e)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")
            
    except Exception as e:
        print(f"Error procesando game_state: {str(e)}")
        import traceback
        traceback.print_exc() 
        raise HTTPException(status_code=500, detail=f"Error del servidor: {str(e)}")

@router.post("/{game_id}/cheat")
async def aplicar_cheat(
    game_id: str,
    cheat: dict = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Aplica un cheat al estado de la partida.
    El body debe incluir el cheat_code y los parámetros necesarios.
    """
    game = get_game(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Partida no encontrada")
    if str(game["user_id"]) != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="No autorizado para modificar esta partida")

    game_state = GameState(**game["game_state"])

    try:
        response = process_cheat(game_state, cheat)
        # Guardar el nuevo estado
        game["game_state"] = game_state.model_dump()
        update_game(game_id, game)
        return response
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    


@router.post("/{game_id}/ai")
async def communicate_with_ai(
    game_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Comunica el estado actual de la partida a la IA y devuelve la respuesta de la IA.
    """
    game = get_game(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Partida no encontrada")
    if str(game["user_id"]) != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="No autorizado para esta partida")
    game_state = game.get("game_state")
    if not game_state:
        raise HTTPException(status_code=400, detail="La partida no tiene estado de juego válido")
    # Obtener instancia singleton de GroqClient
    groq_client = GroqClient()
    try:
        ai_response = groq_client.send_message(game_state)
        # Se asume que la respuesta relevante está en ai_response.choices[0].message.content
        return {"ai_response": ai_response.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error comunicando con la IA: {str(e)}")