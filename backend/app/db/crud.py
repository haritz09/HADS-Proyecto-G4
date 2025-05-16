from typing import Optional, Dict, Any, List
from bson import ObjectId
from pymongo import MongoClient
from backend.app.core.config import settings
from backend.app.db.schema import UserBase, UserRead, GameBase, GameRead, ScenarioBase, ScenarioRead
from datetime import datetime, UTC
from contextlib import contextmanager

@contextmanager
def get_db_client():
    client = None
    try:
        client = MongoClient(settings.MONGO_URI)
        db = client[settings.MONGO_DB_NAME]
        yield db
    finally:
        if client:
            client.close()

# CRUD Operaciones para Usuarios
def create_user(user_data: Dict[str, Any]) -> str:
    user_data.pop("_id", None)  # Eliminar _id si existe
    with get_db_client() as db:
        result = db.users.insert_one(user_data)
        return str(result.inserted_id)

def get_user(user_id: str) -> Optional[Dict[str, Any]]:
    with get_db_client() as db:
        user = db.users.find_one({"_id": ObjectId(user_id)})
        if user:
            user["_id"] = str(user["_id"])
        return user

# Buscar usuario por username
def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    with get_db_client() as db:
        user = db.users.find_one({"username": username})
        if user:
            user["_id"] = str(user["_id"])
        return user

# Buscar usuario por email
def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    with get_db_client() as db:
        user = db.users.find_one({"email": email})
        if user:
            user["_id"] = str(user["_id"])
        return user

def update_user(user_id: str, update_data: Dict[str, Any]) -> bool:
    update_data.pop("_id", None)  # Eliminar _id si existe
    with get_db_client() as db:
        result = db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        return result.modified_count > 0

def delete_user(user_id: str) -> bool:
    with get_db_client() as db:
        result = db.users.delete_one({"_id": ObjectId(user_id)})
        return result.deleted_count > 0

# CRUD Operaciones para Partidas
def create_game(game_data: Dict[str, Any]) -> Dict[str, Any]:
    game_data.pop("_id", None)  # Eliminar _id si existe
    with get_db_client() as db:
        if "user_id" in game_data and isinstance(game_data["user_id"], str):
            game_data["user_id"] = ObjectId(game_data["user_id"])
        result = db.games.insert_one(game_data)
        # Recuperar el juego recién creado y convertir ObjectId a str
        game = db.games.find_one({"_id": result.inserted_id})
        if game:
            game["_id"] = str(game["_id"])
            if "user_id" in game:
                game["user_id"] = str(game["user_id"])
        return game

def get_game(game_id: str) -> Optional[Dict[str, Any]]:
    with get_db_client() as db:
        game = db.games.find_one({"_id": ObjectId(game_id)})
        if game:
            game["_id"] = str(game["_id"])
            if "user_id" in game:
                game["user_id"] = str(game["user_id"])
        return game

def update_game(game_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    update_data.pop("_id", None)  # Eliminar _id si existe
    with get_db_client() as db:
        if "user_id" in update_data and isinstance(update_data["user_id"], str):
            update_data["user_id"] = ObjectId(update_data["user_id"])
        result = db.games.update_one(
            {"_id": ObjectId(game_id)},
            {"$set": update_data}
        )
        if result.modified_count > 0:
            game = db.games.find_one({"_id": ObjectId(game_id)})
            if game:
                game["_id"] = str(game["_id"])
                if "user_id" in game:
                    game["user_id"] = str(game["user_id"])
            return game
        return None

def delete_game(game_id: str) -> bool:
    with get_db_client() as db:
        result = db.games.delete_one({"_id": ObjectId(game_id)})
        return result.deleted_count > 0

def list_saved_games(user_id: str) -> List[dict]:
    try:
        with get_db_client() as db:
            print(f"DEBUG CRUD: Buscando partidas para user_id: {user_id}")
            
            # Asegurarnos de que el user_id es un ObjectId válido
            user_oid = ObjectId(user_id)
            
            # Realizar la búsqueda con el filtro correcto
            cursor = db.games.find({"user_id": user_oid})
            games = list(cursor)
            
            # Convertir ObjectId a str para cada documento
            for game in games:
                game["_id"] = str(game["_id"])
                game["user_id"] = str(game["user_id"])
                print(f"DEBUG CRUD: Encontrada partida: {game['_id']}")
            
            print(f"DEBUG CRUD: Total partidas encontradas: {len(games)}")
            return games
            
    except Exception as e:
        print(f"ERROR CRUD: {str(e)}")
        import traceback
        traceback.print_exc()
        return []

def save_game(game_id: str, game_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Guardar o actualizar el estado de una partida."""
    game_data.pop("_id", None)  # Eliminar _id si existe
    with get_db_client() as db:
        if "user_id" in game_data and isinstance(game_data["user_id"], str):
            game_data["user_id"] = ObjectId(game_data["user_id"])
        game_data["last_saved"] = datetime.now(UTC)
        result = db.games.update_one(
            {"_id": ObjectId(game_id)},
            {"$set": game_data}
        )
        if result.modified_count > 0:
            game = db.games.find_one({"_id": ObjectId(game_id)})
            if game:
                game["_id"] = str(game["_id"])
                if "user_id" in game:
                    game["user_id"] = str(game["user_id"])
            return game
        return None

# CRUD Operaciones para Escenarios
def create_scenario(scenario_data: Dict[str, Any]) -> str:
    scenario_data.pop("_id", None)  # Eliminar _id si existe
    with get_db_client() as db:
        result = db.scenarios.insert_one(scenario_data)
        return str(result.inserted_id)

def get_scenario(scenario_id: str) -> Optional[Dict[str, Any]]:
    with get_db_client() as db:
        scenario = db.scenarios.find_one({"_id": ObjectId(scenario_id)})
        if scenario:
            scenario["_id"] = str(scenario["_id"])
        return scenario

def update_scenario(scenario_id: str, update_data: Dict[str, Any]) -> bool:
    update_data.pop("_id", None)  # Eliminar _id si existe
    with get_db_client() as db:
        result = db.scenarios.update_one(
            {"_id": ObjectId(scenario_id)},
            {"$set": update_data}
        )
        return result.modified_count > 0

def delete_scenario(scenario_id: str) -> bool:
    with get_db_client() as db:
        result = db.scenarios.delete_one({"_id": ObjectId(scenario_id)})
        return result.deleted_count > 0

def get_all_scenarios() -> list[Dict[str, Any]]:
    """Listar todos los escenarios disponibles."""
    with get_db_client() as db:
        cursor = db.scenarios.find({})
        scenarios = []
        for scenario in cursor:
            scenario["_id"] = str(scenario["_id"])
            scenarios.append(scenario)
        return scenarios