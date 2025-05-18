def initialize_city(position: dict, owner=None):
    """Inicializa una ciudad en la posición dada."""
    # Ensure position coordinates are integers
    position = {k: int(v) if isinstance(v, (int, float)) else v for k, v in position.items()}
    
    # Create a unique ID for the city based on position
    if position['x'] == 48 and position['y'] == 48:
        city_id = "central_city"  # Use consistent ID for central city
        # El castillo central debe tener owner="player"
        buildings = [
            initialize_building(position, "castle", is_castle=True, owner="player")
        ]
        city_owner = "player"
    else:
        city_id = f"city_{position['x']}_{position['y']}"
        buildings = [
            initialize_building(position, "castle", is_castle=True, owner=None)
        ]
        city_owner = None
    
    return {
        "id": city_id,
        "name": f"Ciudad en {position['x']}, {position['y']}",
        "position": position,
        "owner": city_owner,
        "buildings": buildings,
        "garrison": [],
        "availableUnits": []
    }

def initialize_building(position: dict, building_type: str, is_castle=False, owner=None):
    """Inicializa un edificio en la posición dada."""
    building_id = f"{building_type}_{position['x']}_{position['y']}"
    return {
        "id": building_id,
        "name": get_building_name(building_type),
        "position": position,
        "building_type": building_type,
        "is_castle": is_castle,
        "built": is_castle,  # Solo el castillo central empieza construido
        "owner": owner,      # <-- Aquí se respeta el owner pasado
        "can_recruit": is_castle,
        "has_tavern": False,
        "requirements": [],
        "available_creatures": get_initial_creatures(building_type) if is_castle else []
    }

def get_building_name(building_type: str) -> str:
    """Devuelve el nombre de un tipo de edificio."""
    names = {
        "castle": "Castillo",
        "barracks": "Cuartel",
        "archery": "Campo de Tiro",
        "knights_tower": "Torre de Caballeros",
        "mage_tower": "Torre de Magos", 
        "dragons_lair": "Guarida de Dragones"
    }
    return names.get(building_type, building_type.capitalize())

def get_initial_creatures(building_type: str) -> list:
    """Devuelve las criaturas iniciales para un tipo de edificio."""
    if building_type == "castle":
        return [
            {
                "type": "Milicia", 
                "count": 15,
                "growth_per_week": 5,
                "stats": {
                    "attack": 3,
                    "defense": 3, 
                    "speed": 3,
                    "movement_points": 5,
                    "movement_points_left": 5
                },
                "recruit_cost": {"gold": 50}
            }
        ]
    return []

def initialize_game_cities():
    """Initialize all cities with properly configured buildings."""
    cities = []
    
    # Central city with castle
    central_city = initialize_city({"x": 48, "y": 48}, owner=None)
    central_city["id"] = "central_city"  # Ensure consistent ID
    cities.append(central_city)
    
    # Barracks city
    barracks_city = initialize_city({"x": 50, "y": 50}, owner=None)
    barracks_city["id"] = "barracks_city"
    # Replace default castle with barracks building
    barracks_city["buildings"] = [
        {
            "id": "barracks",
            "name": "Cuartel",
            "position": {"x": 50, "y": 50},
            "building_type": "barracks",  # Make sure building_type is set
            "is_castle": False,
            "built": False,
            "owner": None,
            "can_recruit": False,
            "has_tavern": False,
            "requirements": [],
            "available_creatures": []
        }
    ]
    cities.append(barracks_city)
    
    # Add other cities with specific building types
    # Archery city
    archery_city = initialize_city({"x": 52, "y": 52}, owner=None)
    archery_city["id"] = "archery_city"
    archery_city["buildings"] = [
        {
            "id": "archery",
            "name": "Campo de Tiro",
            "position": {"x": 52, "y": 52},
            "building_type": "archery",  # Make sure building_type is set
            "is_castle": False,
            "built": False,
            "owner": None,
            "can_recruit": False,
            "has_tavern": False,
            "requirements": [],
            "available_creatures": []
        }
    ]
    cities.append(archery_city)
    
    # Repeat for other building types
    # Knights city
    knights_city = initialize_city({"x": 55, "y": 55}, owner=None)
    knights_city["id"] = "knights_city"
    knights_city["buildings"] = [
        {
            "id": "knights_tower",
            "name": "Torre de Caballeros",
            "position": {"x": 55, "y": 55},
            "building_type": "knights_tower",
            "is_castle": False,
            "built": False,
            "owner": None,
            "can_recruit": False,
            "has_tavern": False,
            "requirements": [],
            "available_creatures": []
        }
    ]
    cities.append(knights_city)
    
    # Mage city
    mage_city = initialize_city({"x": 70, "y": 58}, owner=None)
    mage_city["id"] = "mage_city"
    mage_city["buildings"] = [
        {
            "id": "mage_tower",
            "name": "Torre de Magos",
            "position": {"x": 70, "y": 58},
            "building_type": "mage_tower",
            "is_castle": False,
            "built": False,
            "owner": None,
            "can_recruit": False,
            "has_tavern": False,
            "requirements": [],
            "available_creatures": []
        }
    ]
    cities.append(mage_city)
    
    # Dragon city
    dragon_city = initialize_city({"x": 65, "y": 65}, owner=None)
    dragon_city["id"] = "dragon_city"
    dragon_city["buildings"] = [
        {
            "id": "dragons_lair",
            "name": "Guarida de Dragones",
            "position": {"x": 65, "y": 65},
            "building_type": "dragons_lair",
            "is_castle": False,
            "built": False,
            "owner": None,
            "can_recruit": False,
            "has_tavern": False,
            "requirements": [],
            "available_creatures": []
        }
    ]
    cities.append(dragon_city)
    
    return cities

def generate_resource_mines():
    """Generate resource mines to be placed on the map."""
    mines = [
        # Gold mines (with proper visible symbols)
        {
            "id": "goldmine_1",
            "type": "goldmine",
            "position": {"x": 15, "y": 15},
            "owner": None,
            "resource_type": "gold",
            "resource_per_turn": 500,
            "symbol": "💰"  # Explicit emoji will ensure it's visible
        },
        {
            "id": "goldmine_2",
            "type": "goldmine", 
            "position": {"x": 30, "y": 30},
            "owner": None,
            "resource_type": "gold",
            "resource_per_turn": 250,
            "symbol": "💰"
        },
        {
            "id": "goldmine_3",
            "type": "goldmine", 
            "position": {"x": 70, "y": 20},
            "owner": None,
            "resource_type": "gold",
            "resource_per_turn": 300,
            "symbol": "💰"
        },
        # Wood mines (sawmills)
        {
            "id": "sawmill_1",
            "type": "sawmill",
            "position": {"x": 25, "y": 10},
            "owner": None,
            "resource_type": "wood",
            "resource_per_turn": 100,
            "symbol": "🪵"
        },
        {
            "id": "sawmill_2",
            "type": "sawmill",
            "position": {"x": 40, "y": 40},
            "owner": None,
            "resource_type": "wood",
            "resource_per_turn": 75,
            "symbol": "🪵"
        },
        {
            "id": "sawmill_3",
            "type": "sawmill",
            "position": {"x": 12, "y": 60},
            "owner": None,
            "resource_type": "wood",
            "resource_per_turn": 120,
            "symbol": "🪵"
        },
        # Stone mines (quarries)
        {
            "id": "quarry_1",
            "type": "quarry",
            "position": {"x": 10, "y": 25},
            "owner": None,
            "resource_type": "stone",
            "resource_per_turn": 100,
            "symbol": "⛏️"
        },
        {
            "id": "quarry_2",
            "type": "quarry",
            "position": {"x": 60, "y": 60},
            "owner": None,
            "resource_type": "stone",
            "resource_per_turn": 50,
            "symbol": "⛏️"
        },
        {
            "id": "quarry_3",
            "type": "quarry",
            "position": {"x": 35, "y": 65},
            "owner": None,
            "resource_type": "stone",
            "resource_per_turn": 80,
            "symbol": "⛏️"
        }
    ]
    print(f"Generated {len(mines)} resource mines for game map")
    return mines

def initialize_game_state():
    """Inicializa el estado del juego."""
    # Inicializar héroes del jugador y la IA
    player_heroes = []
    ai_heroes = []
    
    # Use the new helper function to initialize cities properly
    player_cities = initialize_game_cities()
    
    ai_cities = []
    
    # Generate resource mines
    resource_mines = generate_resource_mines()
    
    # Create a basic map with dimensions
    map_size = 100
    
    return {
        "turn": 1,
        "current_player": "player",
        "player": {
            "heroes": player_heroes,
            "cities": player_cities,
            "resources": {"gold": 5000, "wood": 500, "stone": 300}
        },
        "ai": {
            "heroes": ai_heroes,
            "cities": ai_cities,
            "resources": {"gold": 5000, "wood": 200, "stone": 200}
        },
        "map": {
            "size": {"width": map_size, "height": map_size},
            "tiles": [],  # Will be populated later
            "fog_of_war": [],  # Will be populated later
            "explored": [],  # Will be populated later
            "visible_objects": resource_mines  # Place mines on the map
        }
    }