import unittest
from fastapi.testclient import TestClient
from backend.main import app
from datetime import datetime, UTC
from backend.app.api.api_v1.endpoints.auth import get_password_hash
from backend.app.db.crud import create_scenario, get_scenario, get_all_scenarios

class TestGamesEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        # Credenciales de prueba
        cls.test_username = "test_user"
        cls.test_password = "test_password"
        cls.test_email = "test@example.com"
        cls.access_token = None
        cls.user_id = None
        
        # Registrar usuario de prueba
        user_data = {
            "username": cls.test_username,
            "email": cls.test_email,
            "password": cls.test_password
        }
        response = cls.client.post("/api/auth/register", json=user_data)
        if response.status_code == 201:
            cls.user_id = response.json()["_id"]
            print(f"User created with ID: {cls.user_id}")
        else:
            print(f"Error creating user: {response.json()}")
        
        # Login para obtener token
        form_data = {
            "username": cls.test_username,
            "password": cls.test_password
        }
        response = cls.client.post("/api/auth/login", data=form_data)
        if response.status_code == 200:
            cls.access_token = response.json()["access_token"]
            cls.headers = {"Authorization": f"Bearer {cls.access_token}"}
            print("Login successful")
        else:
            print(f"Login failed: {response.json()}")

    def build_scenario_data(self):
        """Crear datos para un escenario básico según el schema ScenarioBase"""
        return {
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

    def test_create_scenario(self):
        """Prueba la creación de un escenario básico en la base de datos"""
        self.assertIsNotNone(self.user_id, "User ID debe estar definido")
        self.assertIsNotNone(self.access_token, "Token de acceso debe estar definido")
        
        # Crear el escenario
        scenario_data = self.build_scenario_data()
        response = self.client.post("/api/scenarios/", 
                                  headers=self.headers,
                                  json=scenario_data)
        
        # Verificar respuesta
        self.assertEqual(response.status_code, 201, f"Error al crear escenario: {response.text}")
        scenario = response.json()
        self.assertIn("_id", scenario, "El escenario creado debe tener un ID")
        scenario_id = scenario["_id"]
        print(f"Escenario creado con ID: {scenario_id}")
        
        # Verificar que el escenario se puede obtener
        response = self.client.get(f"/api/scenarios/{scenario_id}")
        self.assertEqual(response.status_code, 200)
        loaded_scenario = response.json()
        self.assertEqual(loaded_scenario["name"], scenario_data["name"])
        self.assertEqual(loaded_scenario["difficulty"], scenario_data["difficulty"])
        
        # Verificar que el escenario aparece en la lista de todos los escenarios
        response = self.client.get("/api/scenarios/")
        self.assertEqual(response.status_code, 200)
        scenarios = response.json()
        scenario_ids = [s["_id"] for s in scenarios]
        self.assertIn(scenario_id, scenario_ids, "El escenario debe estar en la lista de escenarios")

# Código anterior comentado:
"""
    def build_game_data(self):
        # Datos realistas según el nuevo schema.py con el user_id del usuario autenticado
        return {
            "user_id": self.user_id,
            "name": "Partida de integración",
            "scenario_id": "scenario1",
            "created_at": datetime.now(UTC).isoformat(),
            "last_saved": datetime.now(UTC).isoformat(),
            "is_autosave": False,
            "cheats_used": [],
            "game_state": {
                "turn": 1,
                "current_player": "player",
                "player": {
                    "heroes": [
                        {
                            "id": "hero1",
                            "name": "Test Hero",
                            "position": {"x": 5, "y": 5},
                            "stats": {
                                "attack": 5, "defense": 3, "power": 2, "knowledge": 2,
                                "movement_points": 10, "movement_points_left": 10
                            },
                            "army": [
                                {"type": "Guerrero", "count": 10},
                                {"type": "Arquero", "count": 5}
                            ],
                            "artifacts": []
                        }
                    ],
                    "cities": [
                        {
                            "id": "city1",
                            "name": "Test City",
                            "position": {"x": 10, "y": 10},
                            "buildings": [
                                {
                                    "id": "castle1",
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
                                            "stats": {"attack": 4, "defense": 3, "power": 1, "knowledge": 1, "movement_points": 5, "movement_points_left": 5},
                                            "recruit_cost": {"gold": 50, "wood": 0, "stone": 0}
                                        },
                                        {
                                            "type": "Arquero",
                                            "count": 15,
                                            "growth_per_week": 4,
                                            "stats": {"attack": 5, "defense": 2, "power": 2, "knowledge": 1, "movement_points": 5, "movement_points_left": 5},
                                            "recruit_cost": {"gold": 70, "wood": 0, "stone": 0}
                                        },
                                        {
                                            "type": "Caballero",
                                            "count": 8,
                                            "growth_per_week": 2,
                                            "stats": {"attack": 7, "defense": 5, "power": 2, "knowledge": 2, "movement_points": 6, "movement_points_left": 6},
                                            "recruit_cost": {"gold": 120, "wood": 1, "stone": 1}
                                        },
                                        {
                                            "type": "Mago",
                                            "count": 5,
                                            "growth_per_week": 1,
                                            "stats": {"attack": 6, "defense": 3, "power": 6, "knowledge": 5, "movement_points": 5, "movement_points_left": 5},
                                            "recruit_cost": {"gold": 200, "wood": 0, "stone": 0, "gems": 1}
                                        },
                                        {
                                            "type": "Dragon",
                                            "count": 1,
                                            "growth_per_week": 0,
                                            "stats": {"attack": 12, "defense": 10, "power": 8, "knowledge": 4, "movement_points": 8, "movement_points_left": 8},
                                            "recruit_cost": {"gold": 1000, "wood": 5, "stone": 5, "gems": 5}
                                        }
                                    ]
                                }
                            ],
                            "owner": self.user_id
                        }
                    ],
                    "resources": {"gold": 1000, "wood": 500, "stone": 300, "gems": 5}
                },
                "ai": {
                    "heroes": [],
                    "cities": [],
                    "resources": {"gold": 1000, "wood": 500, "stone": 300, "gems": 5}
                },
                "map": {
                    "size": {"width": 20, "height": 20},
                    "tiles": [],
                    "fog_of_war": [],
                    "explored": [],
                    "visible_objects": []
                }
            }
        }

    # def test_auth_flow(self):
    #     ...

    # def test_full_game_flow(self):
    #     ...

    # def test_get_all_scenarios(self):
    #     ...

    def test_ai_endpoint(self):
        """Prueba el endpoint para la acción de IA en una partida"""
        # ...existing code...
"""

# Función que se puede invocar desde otros archivos
def run_scenario_creation_test():
    print("\n=== EJECUTANDO PRUEBA DE CREACIÓN DE ESCENARIO ===")
    test_instance = TestGamesEndpoints('test_create_scenario')
    result = unittest.TextTestRunner().run(test_instance)
    print("=== PRUEBA DE ESCENARIO FINALIZADA ===")
    return result.wasSuccessful()

if __name__ == "__main__":
    # Ejecutando directamente este archivo
    print("Ejecutando prueba de creación de escenario...")
    
    # Configurar la prueba para que se ejecute sola sin depender de otros tests
    if not hasattr(TestGamesEndpoints, 'headers'):
        print("Preparando instancia de prueba...")
        suite = unittest.TestSuite()
        suite.addTest(TestGamesEndpoints('setUpClass'))
        suite.addTest(TestGamesEndpoints('test_create_scenario'))
        unittest.TextTestRunner().run(suite)
    else:
        # Si ya está configurado, ejecutar solo la prueba del escenario
        test_instance = TestGamesEndpoints('test_create_scenario')
        unittest.TextTestRunner().run(test_instance)
    
    print("Prueba de escenario completada")
