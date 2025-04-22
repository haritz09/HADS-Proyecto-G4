from typing import Optional, Dict, Any
from bson import ObjectId
from pymongo import MongoClient
from backend.app.core.config import settings
from backend.app.db.schema import UserBase, UserRead, GameBase, GameRead, ScenarioBase, ScenarioRead

# Configuración de MongoDB
client = MongoClient(settings.MONGO_URI)
db = client[settings.MONGO_DB_NAME]

# CRUD Operaciones para Usuarios
def create_user(user_data: Dict[str, Any]) -> str:
    result = db.users.insert_one(user_data)
    return str(result.inserted_id)

def get_user(user_id: str) -> Optional[Dict[str, Any]]:
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if user:
        user["_id"] = str(user["_id"])
    return user

# Buscar usuario por username
def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    user = db.users.find_one({"username": username})
    if user:
        user["_id"] = str(user["_id"])
    return user

# Buscar usuario por email
def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    user = db.users.find_one({"email": email})
    if user:
        user["_id"] = str(user["_id"])
    return user

def update_user(user_id: str, update_data: Dict[str, Any]) -> bool:
    result = db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    return result.modified_count > 0

def delete_user(user_id: str) -> bool:
    result = db.users.delete_one({"_id": ObjectId(user_id)})
    return result.deleted_count > 0

# CRUD Operaciones para Partidas
def create_game(game_data: Dict[str, Any]) -> str:
    if "user_id" in game_data and isinstance(game_data["user_id"], str):
        game_data["user_id"] = ObjectId(game_data["user_id"])
    result = db.games.insert_one(game_data)
    return str(result.inserted_id)

def get_game(game_id: str) -> Optional[Dict[str, Any]]:
    game = db.games.find_one({"_id": ObjectId(game_id)})
    if game:
        game["_id"] = str(game["_id"])
        if "user_id" in game:
            game["user_id"] = str(game["user_id"])
    return game

def update_game(game_id: str, update_data: Dict[str, Any]) -> bool:
    if "user_id" in update_data and isinstance(update_data["user_id"], str):
        update_data["user_id"] = ObjectId(update_data["user_id"])
    result = db.games.update_one(
        {"_id": ObjectId(game_id)},
        {"$set": update_data}
    )
    return result.modified_count > 0

def delete_game(game_id: str) -> bool:
    result = db.games.delete_one({"_id": ObjectId(game_id)})
    return result.deleted_count > 0

# CRUD Operaciones para Escenarios
def create_scenario(scenario_data: Dict[str, Any]) -> str:
    result = db.scenarios.insert_one(scenario_data)
    return str(result.inserted_id)

def get_scenario(scenario_id: str) -> Optional[Dict[str, Any]]:
    scenario = db.scenarios.find_one({"_id": ObjectId(scenario_id)})
    if scenario:
        scenario["_id"] = str(scenario["_id"])
    return scenario

def update_scenario(scenario_id: str, update_data: Dict[str, Any]) -> bool:
    result = db.scenarios.update_one(
        {"_id": ObjectId(scenario_id)},
        {"$set": update_data}
    )
    return result.modified_count > 0

def delete_scenario(scenario_id: str) -> bool:
    result = db.scenarios.delete_one({"_id": ObjectId(scenario_id)})
    return result.deleted_count > 0