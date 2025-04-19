from backend.app.db.crud import (
    create_user, get_user, update_user, delete_user,
    create_game, get_game, update_game, delete_game,
    create_scenario, get_scenario, update_scenario, delete_scenario
)
from backend.app.db.mongodb import connect_to_mongo, disconnect_from_mongo
from datetime import datetime

if __name__ == "__main__":
    # Conexión a la base de datos
    try:
        connect_to_mongo()
        print("Conexión exitosa a la base de datos.")
    except Exception as e:
        print(f"Error al conectar a la base de datos: {e}")
        exit(1)

    try:
        # Pruebas CRUD para Usuarios
        print("\n--- Pruebas CRUD para Usuarios ---")
        user_data = {
            "username": "john_doe",
            "email": "john.doe@example.com",
            "password_hash": "hashed_password_here",
            "created_at": datetime.utcnow(),
            "last_login": None
        }
        
        # Crear usuario
        user_id = create_user(user_data)
        print(f"Usuario creado con ID: {user_id}")

        # Obtener usuario
        user = get_user(user_id)
        print(f"Usuario obtenido: {user}")

        # Actualizar usuario
        update_result = update_user(user_id, {"username": "john_updated"})
        print(f"Usuario actualizado: {update_result}")

        # Pruebas CRUD para Escenarios
        print("\n--- Pruebas CRUD para Escenarios ---")
        scenario_data = {
            "name": "Valle del Dragón",
            "description": "Un valle místico rodeado de montañas donde habitan dragones ancestrales",
            "difficulty": "hard",
            "map_size": {
                "width": 200,
                "height": 200
            },
            "initial_state": {
                "resources": {
                    "gold": 1000,
                    "wood": 500,
                    "stone": 300,
                    "crystal": 100
                },
                "starting_units": {
                    "heroes": [
                        {
                            "type": "knight",
                            "level": 3,
                            "position": {"x": 10, "y": 10}
                        }
                    ],
                    "troops": [
                        {
                            "type": "archer",
                            "quantity": 20,
                            "position": {"x": 11, "y": 10}
                        }
                    ]
                },
                "objectives": [
                    "Encuentra el nido del dragón",
                    "Derrota al dragón ancestral",
                    "Conquista 3 ciudades"
                ]
            }
        }

        # Crear escenario
        scenario_id = create_scenario(scenario_data)
        print(f"Escenario creado con ID: {scenario_id}")

        # Obtener escenario
        scenario = get_scenario(scenario_id)
        print(f"Escenario obtenido: {scenario}")

        # Actualizar escenario
        update_result = update_scenario(scenario_id, {"difficulty": "extreme"})
        print(f"Escenario actualizado: {update_result}")

        # Pruebas CRUD para Partidas
        print("\n--- Pruebas CRUD para Partidas ---")
        game_data = {
            "user_id": user_id,
            "name": "Mi partida épica",
            "scenario_id": scenario_id,  # Usando el escenario que acabamos de crear
            "created_at": datetime.utcnow(),
            "last_saved": datetime.utcnow(),
            "is_autosave": False,
            "cheats_used": [],
            "game_state": {
                "turn": 1,
                "player": {
                    "heroes": [
                        {
                            "type": "knight",
                            "level": 3,
                            "position": {"x": 10, "y": 10},
                            "experience": 0,
                            "inventory": []
                        }
                    ],
                    "cities": [
                        {
                            "name": "Capital",
                            "position": {"x": 15, "y": 15},
                            "level": 1,
                            "buildings": ["town_hall", "barracks"]
                        }
                    ],
                    "resources": {
                        "gold": 1000,
                        "wood": 500,
                        "stone": 300,
                        "crystal": 100
                    }
                },
                "ai": {
                    "heroes": [],
                    "cities": [],
                    "resources": {
                        "gold": 1000,
                        "wood": 500,
                        "stone": 300,
                        "crystal": 100
                    }
                },
                "map": {
                    "size": {"width": 200, "height": 200},
                    "tiles": [],
                    "fog_of_war": []
                },
                "current_player": "player1"
            }
        }
        
        # Crear partida
        game_id = create_game(game_data)
        print(f"Partida creada con ID: {game_id}")

        # Obtener partida
        game = get_game(game_id)
        print(f"Partida obtenida: {game}")

        # Actualizar partida
        update_result = update_game(game_id, {
            "last_saved": datetime.utcnow(),
            "cheats_used": ["gold_cheat"]
        })
        print(f"Partida actualizada: {update_result}")

        print("\nPruebas completadas exitosamente.")

    except Exception as e:
        print(f"Error durante las pruebas: {e}")
    
    finally:
        disconnect_from_mongo()
        print("\nDesconexión de la base de datos completada.")