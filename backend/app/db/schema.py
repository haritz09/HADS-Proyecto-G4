from datetime import datetime
from typing import Optional, List, Dict, Any
from bson import ObjectId
from pydantic import BaseModel, Field, ConfigDict, BeforeValidator
from typing_extensions import Annotated

# Función para convertir ObjectId a str y viceversa
def handle_object_id(v: Any) -> Any:
    if isinstance(v, str):
        return ObjectId(v)
    if isinstance(v, ObjectId):
        return str(v)
    return v

# Tipo personalizado para ObjectId
MongoId = Annotated[str, BeforeValidator(handle_object_id)]

class UserBase(BaseModel):
    username: str
    email: str
    password_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True
    )

class UserRead(UserBase):
    id: MongoId = Field(default_factory=lambda: str(ObjectId()), alias="_id")

class MapSize(BaseModel):
    width: int
    height: int

class Resources(BaseModel):
    pass

class Position(BaseModel):
    x: int
    y: int

class Stats(BaseModel):
    attack: int
    defense: int
    power: int
    knowledge: int
    movement_points: int
    movement_points_left: int

class ArmyUnit(BaseModel):
    type: str
    count: int

class Artifact(BaseModel):
    id: str
    name: str
    slot: str

class Heroe(BaseModel):
    id: str
    name: str
    position: Position
    stats: Stats
    army: List[ArmyUnit]
    artifacts: List[Artifact]

class Building(BaseModel):
    id: str
    level: int

class AvailableCreature(BaseModel):
    type: str
    count: int
    growth_per_week: int

class City(BaseModel):
    id: str
    name: str
    position: Position
    buildings: List[Building]
    available_creatures: List[AvailableCreature]

class Entity(BaseModel):
    heroes: List[Heroe] = []
    cities: List[City] = []
    resources: Resources = Resources()

class GameMap(BaseModel):
    size: MapSize
    tiles: Optional[List[Any]] = None
    fog_of_war: Optional[List[Any]] = None
    explored: Optional[List[Any]] = None
    visible_objects: Optional[List[Any]] = None

class GameState(BaseModel):
    turn: int
    player: Entity
    ai: Entity
    map: GameMap
    current_player: str

    model_config = ConfigDict(
        arbitrary_types_allowed=True
    )

class GameBase(BaseModel):
    user_id: MongoId
    name: str
    scenario_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_saved: datetime = Field(default_factory=datetime.utcnow)
    is_autosave: bool = False
    cheats_used: List[str] = []
    game_state: GameState

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True
    )

class GameRead(GameBase):
    id: MongoId = Field(default_factory=lambda: str(ObjectId()), alias="_id")

class ScenarioBase(BaseModel):
    name: str
    description: str
    difficulty: str
    map_size: MapSize
    initial_state: Dict[str, Any]

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True
    )

class ScenarioRead(ScenarioBase):
    id: MongoId = Field(default_factory=lambda: str(ObjectId()), alias="_id")