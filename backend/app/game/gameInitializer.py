def initialize_city(position: dict, owner=None):
    """Inicializa una ciudad en la posición dada."""
    city_id = f"city_{position['x']}_{position['y']}"
    
    # Importante: inicializar con owner=None para que se pueda conquistar
    return {
        "id": city_id,
        "name": f"Ciudad en {position['x']}, {position['y']}",
        "position": position,
        "owner": owner,  # Debe ser None, "player" o "ai"
        "buildings": [
            initialize_building(position, "castle", is_castle=True, owner=owner)
        ],
        "garrison": [],
        "availableUnits": []
    }

def initialize_building(position: dict, building_type: str, is_castle=False, owner=None):
    """Inicializa un edificio en la posición dada."""
    building_id = f"{building_type}_{position['x']}_{position['y']}"
    
    # Importante: siempre inicializar buildings con owner=None si no se especifica
    return {
        "id": building_id,
        "name": get_building_name(building_type),
        "position": position,
        "building_type": building_type,
        "is_castle": is_castle,
        "built": is_castle,  # Solo el castillo está construido inicialmente
        "owner": owner,  # Debe ser None, "player" o "ai"
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

def initialize_game_state():
    """Inicializa el estado del juego."""
    # Inicializar héroes del jugador y la IA
    player_heroes = []
    ai_heroes = []
    
    # Inicializar ciudades del jugador y la IA
    player_cities = [
        initialize_city({"x": 48, "y": 48}, owner=None)  # Castillo central sin owner inicialmente
    ]
    
    ai_cities = []
    
    return {
        "turn": 1,
        "current_player": "player",
        "player": {
            "heroes": player_heroes,
            "cities": player_cities,
            "resources": {"gold": 5000, "wood": 200, "stone": 200}
        },
        "ai": {
            "heroes": ai_heroes,
            "cities": ai_cities,
            "resources": {"gold": 5000, "wood": 200, "stone": 200}
        },
    }