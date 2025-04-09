from pymongo import MongoClient
from bson.objectid import ObjectId
from app.core.config import settings

# Conexión a la base de datos
client = MongoClient(settings.MONGO_URI)
db = client[settings.MONGO_DB_NAME]

# Colecciones
users_collection = db["users"]
games_collection = db["games"]
scenarios_collection = db["scenarios"]

# CRUD para Usuarios
def create_user(user_data):
    """Crea un nuevo usuario."""
    result = users_collection.insert_one(user_data)
    return str(result.inserted_id)

def get_user(user_id):
    """Obtiene un usuario por su ID."""
    return users_collection.find_one({"_id": ObjectId(user_id)})

def update_user(user_id, update_data):
    """Actualiza un usuario por su ID."""
    result = users_collection.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
    return result.modified_count > 0

def delete_user(user_id):
    """Elimina un usuario por su ID."""
    result = users_collection.delete_one({"_id": ObjectId(user_id)})
    return result.deleted_count > 0

# CRUD para Partidas
def create_game(game_data):
    """Crea una nueva partida."""
    result = games_collection.insert_one(game_data)
    return str(result.inserted_id)

def get_game(game_id):
    """Obtiene una partida por su ID."""
    return games_collection.find_one({"_id": ObjectId(game_id)})

def update_game(game_id, update_data):
    """Actualiza una partida por su ID."""
    result = games_collection.update_one({"_id": ObjectId(game_id)}, {"$set": update_data})
    return result.modified_count > 0

def delete_game(game_id):
    """Elimina una partida por su ID."""
    result = games_collection.delete_one({"_id": ObjectId(game_id)})
    return result.deleted_count > 0

# CRUD para Escenarios
def create_scenario(scenario_data):
    """Crea un nuevo escenario."""
    result = scenarios_collection.insert_one(scenario_data)
    return str(result.inserted_id)

def get_scenario(scenario_id):
    """Obtiene un escenario por su ID."""
    return scenarios_collection.find_one({"_id": ObjectId(scenario_id)})

def update_scenario(scenario_id, update_data):
    """Actualiza un escenario por su ID."""
    result = scenarios_collection.update_one({"_id": ObjectId(scenario_id)}, {"$set": update_data})
    return result.modified_count > 0

def delete_scenario(scenario_id):
    """Elimina un escenario por su ID."""
    result = scenarios_collection.delete_one({"_id": ObjectId(scenario_id)})
    return result.deleted_count > 0