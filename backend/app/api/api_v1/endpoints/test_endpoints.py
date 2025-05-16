import requests

BASE_URL = "http://localhost:8000/api/auth"

# Datos de prueba
username = "testuser123"
email = "testuser123@example.com"
password = "testpassword123"

print("1. Registrando usuario...")
resp = requests.post(f"{BASE_URL}/register", json={
    "username": username,
    "email": email,
    "password": password
})
print("Status:", resp.status_code)
print("Response:", resp.json())

print("\n2. Login...")
resp = requests.post(f"{BASE_URL}/login", data={
    "username": username,
    "password": password
})
print("Status:", resp.status_code)
print("Response:", resp.json())
token = resp.json().get("access_token")

headers = {"Authorization": f"Bearer {token}"}

print("\n3. Obtener perfil...")
resp = requests.get(f"{BASE_URL}/profile", headers=headers)
print("Status:", resp.status_code)
print("Response:", resp.json())

print("\n4. Actualizar email...")
new_email = "testuser123_updated@example.com"
resp = requests.put(f"{BASE_URL}/profile", json={"email": new_email}, headers=headers)
print("Status:", resp.status_code)
print("Response:", resp.json())

# Opcional: restaurar email original
def cleanup():
    requests.put(f"{BASE_URL}/profile", json={"email": email}, headers=headers)

# cleanup()  # Descomenta si quieres restaurar el email original

# Función para crear un escenario directamente en este archivo
def test_create_scenario(auth_token):
    print("\n5. Prueba de creación de escenario...")
    scenario_url = "http://localhost:8000/api/scenarios/"
    scenario_headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Datos del escenario
    scenario_data = {
        "name": "Valle del Dragón",
        "description": "Un escenario de prueba con un valle místico",
        "difficulty": "medium",
        "map_size": {
            "width": 40,
            "height": 40
        },
        "initial_state": {
            "resources": {
                "player": {
                    "gold": 2000,
                    "wood": 800,
                    "stone": 500
                },
                "ai": {
                    "gold": 1500,
                    "wood": 600,
                    "stone": 400
                }
            },
            "heroes": {
                "player": [
                    {
                        "id": "hero_player_1",
                        "name": "Héroe Jugador",
                        "position": {"x": 5, "y": 5},
                        "stats": {
                            "attack": 5,
                            "defense": 3,
                            "power": 2,
                            "knowledge": 2,
                            "movement_points": 10,
                            "movement_points_left": 10,
                            "speed": 3
                        },
                        "army": [
                            {"type": "Guerrero", "count": 10},
                            {"type": "Arquero", "count": 5}
                        ]
                    }
                ],
                "ai": [
                    {
                        "id": "hero_ai_1",
                        "name": "Héroe IA",
                        "position": {"x": 35, "y": 35},
                        "stats": {
                            "attack": 4,
                            "defense": 4,
                            "power": 3,
                            "knowledge": 3,
                            "movement_points": 10,
                            "movement_points_left": 10,
                            "speed": 3
                        },
                        "army": [
                            {"type": "Guerrero", "count": 8},
                            {"type": "Arquero", "count": 6}
                        ]
                    }
                ]
            },
            "cities": [
                {
                    "id": "city_player_1",
                    "name": "Ciudad del Jugador",
                    "position": {"x": 10, "y": 10},
                    "owner": "player",
                    "buildings": [
                        {
                            "id": "castle_player_1",
                            "name": "Castillo Central",
                            "position": {"x": 10, "y": 10},
                            "is_castle": True,
                            "has_tavern": True,
                            "can_recruit": True
                        }
                    ]
                },
                {
                    "id": "city_ai_1",
                    "name": "Ciudad de la IA",
                    "position": {"x": 30, "y": 30},
                    "owner": "ai",
                    "buildings": [
                        {
                            "id": "castle_ai_1",
                            "name": "Castillo Enemigo",
                            "position": {"x": 30, "y": 30},
                            "is_castle": True,
                            "has_tavern": True,
                            "can_recruit": True
                        }
                    ]
                }
            ],
            "terrain": {
                "mountains": [
                    {"x": 15, "y": 15},
                    {"x": 20, "y": 20}
                ],
                "water": [
                    {"x": 25, "y": 10},
                    {"x": 26, "y": 10},
                    {"x": 27, "y": 10}
                ],
                "forests": [
                    {"x": 8, "y": 15},
                    {"x": 9, "y": 15},
                    {"x": 10, "y": 15}
                ]
            },
            "resources": [
                {"type": "gold_mine", "position": {"x": 15, "y": 8}, "amount": 500},
                {"type": "wood_mill", "position": {"x": 25, "y": 25}, "amount": 300}
            ]
        }
    }
    
    # Crear el escenario
    resp = requests.post(scenario_url, headers=scenario_headers, json=scenario_data)
    print("Status:", resp.status_code)
    if resp.status_code == 201:
        scenario = resp.json()
        print("Escenario creado con ID:", scenario.get("_id"))
        
        # Verificar que podemos recuperar el escenario
        scenario_id = scenario.get("_id")
        resp = requests.get(f"{scenario_url}{scenario_id}", headers=scenario_headers)
        print("Recuperar escenario - Status:", resp.status_code)
        
        # Listar todos los escenarios
        resp = requests.get(scenario_url, headers=scenario_headers)
        print("Listar escenarios - Status:", resp.status_code)
        if resp.status_code == 200:
            scenarios = resp.json()
            print(f"Total de escenarios: {len(scenarios)}")
            return True
    else:
        print("Error al crear escenario:", resp.text)
    return False

# Función para crear una partida ficticia basada en un escenario
def test_create_game(auth_token, user_id, scenario_id):
    print("\n6. Prueba de creación de partida...")
    games_url = "http://localhost:8000/api/games/"
    games_headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Datos de la partida según el esquema GameBase
    game_data = {
        "user_id": user_id,
        "name": "Partida de prueba automatizada",
        "scenario_id": scenario_id,
        "is_autosave": False,
        "cheats_used": [],
        "game_state": {
            "turn": 1,
            "current_player": "player",
            "player": {
                "heroes": [
                    {
                        "id": "hero_player_1",
                        "name": "Héroe Jugador",
                        "position": {"x": 5, "y": 5},
                        "stats": {
                            "attack": 5,
                            "defense": 3,
                            "power": 2,
                            "knowledge": 2,
                            "movement_points": 10,
                            "movement_points_left": 10,
                            "speed": 3
                        },
                        "army": [
                            {"type": "Guerrero", "count": 10, "stats": {"attack": 5, "defense": 3, "speed": 3, "movement_points": 5, "movement_points_left": 5}},
                            {"type": "Arquero", "count": 5, "stats": {"attack": 4, "defense": 2, "speed": 4, "movement_points": 6, "movement_points_left": 6}}
                        ],
                        "artifacts": []
                    }
                ],
                "cities": [
                    {
                        "id": "city_player_1",
                        "name": "Ciudad del Jugador",
                        "position": {"x": 10, "y": 10},
                        "owner": "player",
                        "buildings": [
                            {
                                "id": "castle_player_1",
                                "name": "Castillo Central",
                                "position": {"x": 10, "y": 10},
                                "is_castle": True,
                                "has_tavern": True,
                                "can_recruit": True,
                                "available_creatures": [
                                    {
                                        "type": "Guerrero",
                                        "count": 20,
                                        "growth_per_week": 5,
                                        "stats": {"attack": 5, "defense": 3, "speed": 3, "movement_points": 5, "movement_points_left": 5},
                                        "recruit_cost": {"gold": 50, "wood": 0, "stone": 0}
                                    },
                                    {
                                        "type": "Arquero",
                                        "count": 15,
                                        "growth_per_week": 4,
                                        "stats": {"attack": 4, "defense": 2, "speed": 4, "movement_points": 6, "movement_points_left": 6},
                                        "recruit_cost": {"gold": 70, "wood": 0, "stone": 0}
                                    }
                                ]
                            }
                        ]
                    }
                ],
                "resources": {"gold": 1000, "wood": 500, "stone": 300}
            },
            "ai": {
                "heroes": [
                    {
                        "id": "hero_ai_1",
                        "name": "Héroe IA",
                        "position": {"x": 35, "y": 35},
                        "stats": {
                            "attack": 4,
                            "defense": 4,
                            "power": 3,
                            "knowledge": 3,
                            "movement_points": 10,
                            "movement_points_left": 10,
                            "speed": 3
                        },
                        "army": [
                            {"type": "Guerrero", "count": 8, "stats": {"attack": 5, "defense": 3, "speed": 3, "movement_points": 5, "movement_points_left": 5}},
                            {"type": "Arquero", "count": 6, "stats": {"attack": 4, "defense": 2, "speed": 4, "movement_points": 6, "movement_points_left": 6}}
                        ],
                        "artifacts": []
                    }
                ],
                "cities": [
                    {
                        "id": "city_ai_1",
                        "name": "Ciudad de la IA",
                        "position": {"x": 30, "y": 30},
                        "owner": "ai",
                        "buildings": [
                            {
                                "id": "castle_ai_1", 
                                "name": "Castillo Enemigo",
                                "position": {"x": 30, "y": 30},
                                "is_castle": True,
                                "has_tavern": True,
                                "can_recruit": True,
                                "available_creatures": []
                            }
                        ]
                    }
                ],
                "resources": {"gold": 1000, "wood": 500, "stone": 300}
            },
            "map": {
                "size": {"width": 40, "height": 40},
                "tiles": [],
                "fog_of_war": [],
                "explored": [],
                "visible_objects": []
            }
        }
    }
    
    # Crear la partida
    resp = requests.post(games_url, headers=games_headers, json=game_data)
    print("Status:", resp.status_code)
    if resp.status_code == 201:
        game = resp.json()
        print("Partida creada con ID:", game.get("_id"))
        
        # Verificar que podemos cargar la partida
        game_id = game.get("_id")
        resp = requests.get(f"{games_url}{game_id}", headers=games_headers)
        print("Cargar partida - Status:", resp.status_code)
        
        # Realizar una acción de prueba (finalizar turno)
        action_data = {
            "type": "endTurn"
        }
        resp = requests.post(f"{games_url}{game_id}/action", headers=games_headers, json=action_data)
        print("Acción (endTurn) - Status:", resp.status_code)
        
        if resp.status_code == 200:
            print("Acción procesada correctamente")
            return True
    else:
        print("Error al crear partida:", resp.text)
    return False

if __name__ == "__main__":
    # Obtener datos del usuario y token
    success_scenario = test_create_scenario(token)
    print(f"Resultado de prueba de escenario: {'Éxito' if success_scenario else 'Fallo'}")
    
    # Si el escenario se creó correctamente, probar con la creación de partida
    if success_scenario:
        # Obtener ID del escenario creado
        resp = requests.get("http://localhost:8000/api/scenarios/", headers={"Authorization": f"Bearer {token}"})
        if resp.status_code == 200 and len(resp.json()) > 0:
            scenario_id = resp.json()[0]["_id"]
            # Extraer el user_id del token (simplificado)
            resp_profile = requests.get(f"{BASE_URL}/profile", headers={"Authorization": f"Bearer {token}"})
            if resp_profile.status_code == 200:
                user_id = resp_profile.json()["_id"]
                success_game = test_create_game(token, user_id, scenario_id)
                print(f"Resultado de prueba de creación de partida: {'Éxito' if success_game else 'Fallo'}")
