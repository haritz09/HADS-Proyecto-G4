from backend.app.game.logic import process_end_turn, process_hero_attack, process_hero_movement, process_recruitment, transfer_troops_between_hero_and_castle
from backend.app.game.cheats import process_cheat
from fastapi import APIRouter, HTTPException, status, Query, Depends, Body
from typing import List
from backend.app.db.schema import GameRead, GameState
from backend.app.api.api_v1.endpoints.auth import get_current_user
from backend.app.db.crud import (
    list_saved_games,
    create_game,
    save_game,
    get_game,
    update_game
)
from bson import ObjectId
from datetime import datetime, UTC

from ai_service.client.groq_client import GroqClient

router = APIRouter()

@router.get("/", response_model=List[GameRead])
async def listar_partidas_guardadas(
    user_id: str = Query(...),
    current_user: dict = Depends(get_current_user)
):
    """Listar partidas guardadas del usuario actual."""
    # Verificar que el usuario solo accede a sus propias partidas
    if str(current_user["_id"]) != user_id:
        raise HTTPException(status_code=403, detail="No autorizado para ver estas partidas")
    return list_saved_games(user_id)

@router.post("/", response_model=GameRead, status_code=201)
async def crear_nueva_partida(
    game_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Crear una nueva partida."""
    # Asegurar que el user_id corresponde al usuario autenticado
    if str(game_data.get("user_id")) != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="No autorizado para crear partida para otro usuario")
    
    # Actualizar timestamps
    game_data["created_at"] = datetime.now(UTC)
    game_data["last_saved"] = datetime.now(UTC)
    
    return create_game(game_data)

@router.post("/{game_id}/save", response_model=GameRead)
async def guardar_partida_actual(
    game_id: str,
    game_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Guardar el estado actual de la partida."""
    game = get_game(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Partida no encontrada")
    
    # Verificar que el usuario es dueño de la partida
    if str(game["user_id"]) != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="No autorizado para guardar esta partida")
    
    return save_game(game_id, game_data)

@router.get("/{game_id}", response_model=GameRead)
async def cargar_partida_guardada(
    game_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Cargar una partida guardada por su ID."""
    game = get_game(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Partida no encontrada")
    
    # Verificar que el usuario es dueño de la partida
    if str(game["user_id"]) != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="No autorizado para cargar esta partida")
    
    return game

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
    game_state = GameState(**game["game_state"])
    if game_state.current_player != "player":
        raise HTTPException(status_code=400, detail="No es el turno del jugador")

    # 3. Validar y procesar la acción según su tipo
    try:
        if action["type"] == "moveHero":
            result = process_hero_movement(game_state, action)
        elif action["type"] == "combat":
            result = process_hero_attack(game_state, action)
        elif action["type"] == "recruitUnits":
            result = process_recruitment(game_state, action)
        elif action["type"] == "buildStructure":
            result = (game_state, action)
        elif action["type"] == "transfer": # Transerir tropas entre heroe-castillo
            result = transfer_troops_between_hero_and_castle(game_state, action)
        elif action["type"] == "endTurn":
            result = process_end_turn(game_state)
        else:
            raise HTTPException(status_code=400, detail="Tipo de acción no válido")
            
        # 4. Guardar el nuevo estado
        game["game_state"] = game_state.model_dump()
        update_game(game_id, game)
        
        return {
            "status": "success",
            "result": result,
            "game_state": game_state
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

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