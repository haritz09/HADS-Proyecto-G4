from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from bson import ObjectId
from datetime import datetime

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

# Esquemas para Usuarios
class UserBase(BaseModel):
    username: str
    email: str
    password_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None

class UserCreate(UserBase):
    pass

class UserRead(UserBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")

    class Config:
        allow_population_by_field_name = True
        json_encoders = {ObjectId: str, datetime: lambda x: x.isoformat()}

# Esquemas para el estado del juego
class MapSize(BaseModel):
    width: int
    height: int

class Resources(BaseModel):
    # Añade aquí los recursos específicos que necesites
    pass

class Entity(BaseModel):
    heroes: List[Any] = []
    cities: List[Any] = []
    resources: Resources = Resources()

class GameMap(BaseModel):
    size: MapSize
    tiles: List[Any] = []
    fog_of_war: List[Any] = []

class GameState(BaseModel):
    turn: int
    player: Entity
    ai: Entity
    map: GameMap
    current_player: str

# Esquemas para Partidas
class GameBase(BaseModel):
    user_id: PyObjectId
    name: str
    scenario_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_saved: datetime = Field(default_factory=datetime.utcnow)
    is_autosave: bool = False
    cheats_used: List[str] = []
    game_state: GameState

class GameCreate(GameBase):
    pass

class GameRead(GameBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")

    class Config:
        allow_population_by_field_name = True
        json_encoders = {ObjectId: str, datetime: lambda x: x.isoformat()}

# Esquemas para Escenarios
class ScenarioBase(BaseModel):
    name: str
    description: str
    difficulty: str
    map_size: MapSize
    initial_state: Dict[str, Any]

class ScenarioCreate(ScenarioBase):
    pass

class ScenarioRead(ScenarioBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")

    class Config:
        allow_population_by_field_name = True
        json_encoders = {ObjectId: str}