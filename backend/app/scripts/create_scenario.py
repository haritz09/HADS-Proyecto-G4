import sys
from backend.app.db.crud import create_scenario
from datetime import datetime

def main():
    # Puedes personalizar estos datos según lo que quieras crear
    scenario_data = {
        "name": "Valle del Dragón",
        "description": "Un valle místico rodeado de montañas donde habitan dragones ancestrales.",
        "difficulty": "hard",
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

    scenario_id = create_scenario(scenario_data)
    print(f"Escenario creado con ID: {scenario_id}")

if __name__ == "__main__":
    main()
