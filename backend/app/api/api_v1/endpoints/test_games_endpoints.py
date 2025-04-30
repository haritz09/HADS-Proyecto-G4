import unittest
from fastapi.testclient import TestClient
from backend.main import app
from datetime import datetime, UTC
from backend.app.api.api_v1.endpoints.auth import get_password_hash

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

    def test_auth_flow(self):
        """Prueba el flujo completo de autenticación"""
        # 1. Verificar que el usuario existe
        response = self.client.get("/api/auth/profile", headers=self.headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["username"], self.test_username)
        
        # 2. Actualizar perfil
        new_email = "updated@example.com"
        response = self.client.put("/api/auth/profile", 
                                 headers=self.headers,
                                 json={"email": new_email})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["email"], new_email)
        
        # 3. Probar login con credenciales incorrectas
        response = self.client.post("/api/auth/login", 
                                  data={"username": self.test_username, 
                                       "password": "wrong_password"})
        self.assertEqual(response.status_code, 401)

    def test_full_game_flow(self):
        """Prueba el flujo completo del juego con usuario autenticado"""
        self.assertIsNotNone(self.user_id, "User ID should not be None")
        self.assertIsNotNone(self.access_token, "Access token should not be None")

        # 1. Crear partida
        game_data = self.build_game_data()
        response = self.client.post("/api/games/", 
                                  headers=self.headers,
                                  json=game_data)
        self.assertEqual(response.status_code, 201)
        game = response.json()
        self.assertIn("_id", game)
        game_id = game["_id"]

        # 2. Listar partidas guardadas
        response = self.client.get(f"/api/games/?user_id={self.user_id}",
                                 headers=self.headers)
        self.assertEqual(response.status_code, 200)
        games = response.json()
        self.assertTrue(any(g["_id"] == game_id for g in games))

        # 3. Cargar partida guardada
        response = self.client.get(f"/api/games/{game_id}",
                                 headers=self.headers)
        self.assertEqual(response.status_code, 200)
        loaded_game = response.json()
        self.assertEqual(loaded_game["_id"], game_id)

        # 4. Guardar partida actual (simular cambio de nombre)
        updated_data = dict(game)
        updated_data["name"] = "Partida actualizada"
        response = self.client.post(f"/api/games/{game_id}/save", 
                                  headers=self.headers,
                                  json=updated_data)
        self.assertIn(response.status_code, [200, 201, 204])

        # 5. Enviar acción de movimiento de héroe
        action = {
            "type": "MOVE_HERO",
            "hero_id": "hero1",
            "target_position": {"x": 6, "y": 5}
        }
        response = self.client.post(f"/api/games/{game_id}/action",
                                  headers=self.headers,
                                  json=action)
        self.assertIn(response.status_code, [200, 400])
        if response.status_code == 200:
            self.assertEqual(response.json()["status"], "success")

        # 6. Enviar acción de reclutamiento
        action = {
            "type": "RECRUIT_UNITS",
            "city_id": "city1",
            "unit_type": "archer",
            "amount": 5
        }
        response = self.client.post(f"/api/games/{game_id}/action",
                                  headers=self.headers,
                                  json=action)
        self.assertIn(response.status_code, [200, 400])
        if response.status_code == 200:
            self.assertEqual(response.json()["status"], "success")

          # 8. Acción inválida
        action = {"type": "INVALID_ACTION"}
        response = self.client.post(f"/api/games/{game_id}/action",
                                  headers=self.headers,
                                  json=action)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Tipo de acción no válido", response.text)

        # 7. Enviar acción de fin de turno
        action = {"type": "END_TURN"}
        response = self.client.post(f"/api/games/{game_id}/action",
                                  headers=self.headers,
                                  json=action)
        self.assertIn(response.status_code, [200, 400])
        if response.status_code == 200:
            self.assertEqual(response.json()["status"], "success")

      

if __name__ == "__main__":
    unittest.main()
