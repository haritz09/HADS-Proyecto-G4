from datetime import datetime, UTC
from typing import Optional, List, Dict, Any, Union
from bson import ObjectId
from pydantic import BaseModel, Field, ConfigDict, BeforeValidator
from typing_extensions import Annotated

def handle_object_id(v: Any) -> Any:
    if v is None:
        raise ValueError("ObjectId field cannot be None")
    if isinstance(v, ObjectId):
        return str(v)
    if isinstance(v, str):
        try:
            if len(v) == 24 and all(c in '0123456789abcdefABCDEF' for c in v):
                return str(ObjectId(v))
            raise ValueError(f"Invalid ObjectId string format: {v}")
        except Exception as e:
            raise ValueError(f"Invalid ObjectId string: {v}")
    raise TypeError(f"Expected ObjectId or string, got {type(v).__name__}")

# Tipo personalizado para ObjectId
MongoId = Annotated[str, BeforeValidator(handle_object_id)]

class UserBase(BaseModel):
    username: str
    email: str
    password_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    last_login: Optional[datetime] = None

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

class UserRead(UserBase):
    id: MongoId = Field(default_factory=lambda: str(ObjectId()), alias="_id")

class MapSize(BaseModel):
    width: int
    height: int

class Resources(BaseModel):
    gold: int = 0
    wood: int = 0
    stone: int = 0

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

class City(BaseModel):
    id: str
    name: str
    position: Position
    buildings: List["Building"] = []
    owner: Optional[str] = None

class AvailableCreature(BaseModel):
    type: str  # Guerrero, Arquero, Caballero, Mago, Dragon
    count: int
    growth_per_week: int
    stats: Stats
    recruit_cost: Dict[str, int]  # Coste en recursos para reclutar uno

class Building(BaseModel):
    id: str
    name: str
    position: Position
    available_creatures: List[AvailableCreature] = []
    is_castle: bool = False
    has_tavern: bool = False
    can_recruit: bool = False

class CastleBuilding(Building):
    is_castle: bool = True
    has_tavern: bool = True
    can_recruit: bool = True
    # Aquí se puede añadir lógica/método para reclutar unidades si se requiere

class Entity(BaseModel):
    heroes: List[Heroe] = []
    resources: Resources = Resources()
    cities: List[City] = []

class MapTile(BaseModel):
    terrain: str
    passable: bool = True
    object_id: Optional[str] = None  # id de Building
    object_type: Optional[str] = None  # 'building', etc.

class GameMap(BaseModel):
    size: MapSize
    tiles: Optional[List[MapTile]] = None
    fog_of_war: Optional[List[bool]] = None
    explored: Optional[List[Any]] = None
    visible_objects: Optional[List[Any]] = None
    

class GameState(BaseModel):
    turn: int
    player: Entity
    ai: Entity
    map: GameMap
    current_player: str

    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

class GameBase(BaseModel):
    user_id: MongoId
    name: str
    scenario_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    last_saved: datetime = Field(default_factory=lambda: datetime.now(UTC))
    is_autosave: bool = False
    cheats_used: List[str] = []
    game_state: GameState

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True
    )

class GameRead(GameBase):
    id: MongoId = Field(default_factory=lambda: str(ObjectId()), alias="_id")

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

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