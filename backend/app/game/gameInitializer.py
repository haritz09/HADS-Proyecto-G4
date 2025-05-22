import random
import math

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

def generate_initial_heroes():
    """Genera héroes iniciales para jugador y IA con ejército básico."""
    player_hero = {
        "id": "player_hero_1",
        "name": "Caballero Roland",
        "position": {"x": 21, "y": 20},  # Adyacente al castillo del jugador (20,20)
        "stats": {
            "attack": 4,
            "defense": 3,
            "speed": 3,
            "power": 2,
            "knowledge": 2,
            "movement_points": 20,
            "movement_points_left": 20
        },
        "army": [
            {"type": "Milicia", "count": 15, "stats": {"attack": 3, "defense": 2, "speed": 3, "movement_points": 5, "movement_points_left": 5}},
            {"type": "Arquero", "count": 8, "stats": {"attack": 4, "defense": 2, "speed": 4, "movement_points": 6, "movement_points_left": 6}}
        ],
        "artifacts": []
    }
    
    ai_hero = {
        "id": "ai_hero_1",
        "name": "Señor Oscuro Vokial",
        "position": {"x": 81, "y": 80},  # Adyacente al castillo de la IA (80,80)
        "stats": {
            "attack": 3,
            "defense": 4,
            "speed": 3,
            "power": 3,
            "knowledge": 2,
            "movement_points": 20,
            "movement_points_left": 20
        },
        "army": [
            {"type": "Esqueleto", "count": 12, "stats": {"attack": 2, "defense": 3, "speed": 2, "movement_points": 4, "movement_points_left": 4}},
            {"type": "Zombie", "count": 10, "stats": {"attack": 3, "defense": 3, "speed": 2, "movement_points": 3, "movement_points_left": 3}}
        ],
        "artifacts": []
    }
    
    return player_hero, ai_hero

def initialize_game_cities():
    """Initialize all cities with properly configured buildings."""
    cities = []
    
    # Central city with castle - Relocated to strategic position
    player_castle_pos = {"x": 20, "y": 20}  # Posición estratégica con buen acceso a recursos
    central_city = initialize_city(player_castle_pos, owner="player")
    central_city["id"] = "central_city"  # Ensure consistent ID
    cities.append(central_city)
    
    # Repositioned buildings in strategic locations
    
    # Barracks city - closer to player castle
    barracks_pos = {"x": 22, "y": 22}  # Cerca del castillo del jugador
    barracks_city = initialize_city(barracks_pos, owner=None)
    barracks_city["id"] = "barracks_city"
    barracks_city["buildings"] = [
        {
            "id": "barracks",
            "name": "Cuartel",
            "position": barracks_pos,
            "building_type": "barracks",
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
    
    # Archery city - Strategic position near forest
    archery_pos = {"x": 25, "y": 30}
    archery_city = initialize_city(archery_pos, owner=None)
    archery_city["id"] = "archery_city"
    archery_city["buildings"] = [
        {
            "id": "archery",
            "name": "Campo de Tiro",
            "position": archery_pos,
            "building_type": "archery",
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
    
    # Knights city - position near plains
    knights_pos = {"x": 35, "y": 25}
    knights_city = initialize_city(knights_pos, owner=None)
    knights_city["id"] = "knights_city"
    knights_city["buildings"] = [
        {
            "id": "knights_tower",
            "name": "Torre de Caballeros",
            "position": knights_pos,
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
    
    # Mage city - near magical ley lines
    mage_pos = {"x": 35, "y": 40}
    mage_city = initialize_city(mage_pos, owner=None)
    mage_city["id"] = "mage_city"
    mage_city["buildings"] = [
        {
            "id": "mage_tower",
            "name": "Torre de Magos",
            "position": mage_pos,
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
    
    # Dragon city - Isolated in mountains
    dragon_pos = {"x": 65, "y": 65}
    dragon_city = initialize_city(dragon_pos, owner=None)
    dragon_city["id"] = "dragon_city"
    dragon_city["buildings"] = [
        {
            "id": "dragons_lair",
            "name": "Guarida de Dragones",
            "position": dragon_pos,
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

def generate_random_artifacts(map_size=100, count=3):
    """Genera artefactos aleatorios en el mapa."""
    artifacts = []
    artifact_types = ["totemDeGuerra", "totemVelocidad", "totemReclutamiento"]
    artifact_names = ["Tótem de Guerra", "Tótem de Velocidad", "Tótem de Reclutamiento"]
    
    # Lista para evitar posicionar artefactos cerca de otros objetos
    used_positions = []
    
    # Obtener posiciones de ciudades y minas para evitarlas
    cities_pos = [
        {"x": 20, "y": 20},  # castillo jugador
        {"x": 22, "y": 22},  # barracks
        {"x": 25, "y": 30},  # archery
        {"x": 35, "y": 25},  # knights
        {"x": 40, "y": 40},  # mage
        {"x": 65, "y": 65},  # dragon
        {"x": 80, "y": 80},  # castillo IA
    ]
    
    # Añadir posiciones de minas (hardcoded para simplificar)
    mines_pos = [
        {"x": 15, "y": 15}, {"x": 30, "y": 30}, {"x": 70, "y": 20},  # goldmines
        {"x": 25, "y": 10}, {"x": 40, "y": 40}, {"x": 12, "y": 60},  # sawmills
        {"x": 10, "y": 25}, {"x": 60, "y": 60}, {"x": 35, "y": 65},  # quarries
    ]
    
    used_positions = cities_pos + mines_pos
    
    for i in range(count):
        # Intentar encontrar una posición válida (no cercana a objetos existentes)
        valid_position = False
        attempts = 0
        x, y = 0, 0
        
        while not valid_position and attempts < 50:
            # Generar posición aleatoria
            x = random.randint(10, map_size-10)
            y = random.randint(10, map_size-10)
            
            # Verificar distancia a posiciones usadas
            valid_position = True
            for pos in used_positions:
                distance = math.sqrt((x - pos["x"])**2 + (y - pos["y"])**2)
                if distance < 8:  # Mínimo 8 casillas de distancia
                    valid_position = False
                    break
            
            attempts += 1
        
        if valid_position:
            # Usar índice cíclico para distribuir tipos de artefactos
            type_index = i % len(artifact_types)
            
            artifact = {
                "id": f"artifact_{i+1}",
                "type": "artifact",
                "subtype": artifact_types[type_index],
                "name": artifact_names[type_index],
                "position": {"x": x, "y": y},
                "effect": get_artifact_effect(artifact_types[type_index])
            }
            
            artifacts.append(artifact)
            used_positions.append({"x": x, "y": y})
    
    print(f"Generated {len(artifacts)} random artifacts for game map")
    return artifacts

def get_artifact_effect(artifact_type):
    """Devuelve el efecto asociado a un tipo de artefacto."""
    effects = {
        "totemDeGuerra": {"army_buff": "+20% attack and defense"},
        "totemVelocidad": {"movement_buff": "+30% movement points"},
        "totemReclutamiento": {"recruitment_discount": "-30% unit cost"}
    }
    return effects.get(artifact_type, {})

def determine_terrain_type(x: int, y: int) -> str:
    """
    Determina el tipo de terreno para una posición específica usando un algoritmo
    de generación procedural basado en ruido.
    
    Args:
        x: Coordenada X de la posición
        y: Coordenada Y de la posición
    
    Returns:
        String con el tipo de terreno: 'grass', 'forest', 'mountain', 'water', 'desert', o 'snow'
    """
    # Usamos una función de ruido simple basada en seno para crear patrones naturales
    # Ajustamos las frecuencias para obtener diferentes escalas de variación
    noise1 = math.sin(x * 0.1) * math.cos(y * 0.1)
    noise2 = math.sin(x * 0.05 + y * 0.05) * math.cos(x * 0.03 - y * 0.03)
    noise3 = math.sin(x * 0.02 - y * 0.03) * math.sin(y * 0.01)
    
    # Combinamos los diferentes niveles de ruido
    combined_noise = (noise1 + noise2 + noise3) / 3
    
    # Normalizamos el ruido a un valor entre 0 y 1
    normalized_noise = (combined_noise + 1) / 2
    
    # Añadimos un poco de aleatoriedad para romper patrones muy evidentes
    random_factor = random.random() * 0.2
    final_value = normalized_noise * 0.8 + random_factor
    
    # Determinamos el tipo de terreno basado en el valor final
    if final_value < 0.55:
        # Planicie - el terreno más común
        terrain = 'grass'
        passable = True
    elif final_value < 0.70:
        # Bosques - común
        terrain = 'forest'
        passable = True
    elif final_value < 0.80:
        # Montañas - menos común, ralentiza el movimiento
        terrain = 'mountain'
        passable = True  # Pasable pero con mayor costo
    elif final_value < 0.9:
        # Agua - barrera natural
        terrain = 'water'
        passable = False  # Impassable para unidades normales
    elif final_value < 0.95:
        # Desierto - área diferente
        terrain = 'desert'
        passable = True
    else:
        # Nieve - raro, área especial
        terrain = 'snow'
        passable = True
    
    return terrain, passable

def generate_map_tiles(width: int, height: int) -> list:
    """
    Genera un array de MapTile para un mapa de las dimensiones especificadas.
    
    Args:
        width: Ancho del mapa
        height: Alto del mapa
    
    Returns:
        Array de MapTile representando el terreno del mapa
    """
    tiles = []
    
    # Generar tiles para cada posición en el mapa
    for y in range(height):
        for x in range(width):
            terrain, passable = determine_terrain_type(x, y)
            
            # Crear MapTile según la estructura definida
            tile = {
                "terrain": terrain,
                "passable": passable,
                "object_id": None,
                "object_type": None
            }
            
            tiles.append(tile)
    
    print(f"Generated map with {len(tiles)} tiles ({width}x{height})")
    return tiles

def initialize_game_state():
    """Inicializa el estado del juego."""
    # Generar héroes iniciales
    player_hero, ai_hero = generate_initial_heroes()
    
    # Inicializar ciudades estratégicamente
    player_cities = initialize_game_cities()
    
    # Castillo de IA en posición estratégica
    ai_castle = initialize_city({"x": 80, "y": 80}, owner="ai")
    ai_castle["id"] = "ai_castle"
    ai_cities = [ai_castle]
    
    # Generar minas de recursos
    resource_mines = generate_resource_mines()
    
    # Generar artefactos aleatorios
    artifacts = generate_random_artifacts()
    
    # Crear mapa con niebla de guerra
    map_size = 100
    total_tiles = map_size * map_size
    
    # Inicialmente todo oculto
    fog_of_war = [True] * total_tiles
    
    # Inicializar array de exploración (inicialmente nada está explorado)
    explored = [False] * total_tiles
    
    # Revelar área alrededor del héroe del jugador y su castillo
    player_pos = player_hero["position"]
    castle_pos = player_cities[0]["position"]  # Central castle
    reveal_radius = 5
    
    for y in range(map_size):
        for x in range(map_size):
            # Distancia al héroe y al castillo
            hero_dist = math.sqrt((x - player_pos["x"])**2 + (y - player_pos["y"])**2)
            castle_dist = math.sqrt((x - castle_pos["x"])**2 + (y - castle_pos["y"])**2)
            
            # Revelar si está cerca del héroe o del castillo
            if hero_dist <= reveal_radius or castle_dist <= reveal_radius:
                idx = y * map_size + x
                if 0 <= idx < total_tiles:  # Asegurar índice válido
                    fog_of_war[idx] = False
                    explored[idx] = True  # También marcar como explorado
    
    # Generar los tiles del mapa
    map_tiles = generate_map_tiles(map_size, map_size)
    
    # Crear estado de juego completo
    return {
        "turn": 1,
        "current_player": "player",
        "player": {
            "heroes": [player_hero],
            "cities": player_cities,
            "resources": {"gold": 2500, "wood": 10, "stone": 10}
        },
        "ai": {
            "heroes": [ai_hero],
            "cities": ai_cities,
            "resources": {"gold": 2500, "wood": 10, "stone": 10}
        },
        "map": {
            "size": {"width": map_size, "height": map_size},
            "tiles": map_tiles,  # Aquí incluimos los tiles generados
            "fog_of_war": fog_of_war,
            "explored": explored,  # Incluir el array explored inicializado
            "visible_objects": resource_mines + artifacts  # Combinar minas y artefactos
        }
    }