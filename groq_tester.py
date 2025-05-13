import os
from ai_service.client.groq_client import GroqClient
import json
import copy

def estimate_tokens(obj):
    """Roughly estimate the number of tokens in a JSON object."""
    json_str = json.dumps(obj)
    # Very rough estimation: ~1 token per 4 characters
    return len(json_str) // 4

def main():
    # Define the game state provided
    game_state = {
      "_id": {
        "$oid": "681b509dcad708339c63875f"
      },
      "user_id": {
        "$oid": "681b509ccad708339c638754"
      },
      "name": "Partida actualizada",
      "scenario_id": "scenario1",
      "created_at": "2025-05-07T12:22:53.734000",
      "last_saved": {
        "$date": "2025-05-07T12:22:53.888Z"
      },
      "is_autosave": False,
      "cheats_used": [],
      "game_state": {
        "turn": 1,
        "player": {
          "heroes": [
            {
              "id": "hero1",
              "name": "Test Hero",
              "position": {
                "x": 6,
                "y": 5
              },
              "stats": {
                "attack": 5,
                "defense": 3,
                "power": 2,
                "knowledge": 2,
                "movement_points": 10,
                "movement_points_left": 10
              },
              "army": [
                {
                  "type": "Guerrero",
                  "count": 10
                },
                {
                  "type": "Arquero",
                  "count": 5
                }
              ],
              "artifacts": []
            }
          ],
          "resources": {
            "gold": 1000,
            "wood": 500,
            "stone": 300
          },
          "cities": [
            {
              "id": "city1",
              "name": "Test City",
              "position": {
                "x": 10,
                "y": 10
              },
              "buildings": [
                {
                  "id": "castle1",
                  "name": "Castillo Central",
                  "position": {
                    "x": 10,
                    "y": 10
                  },
                  "available_creatures": [
                    {
                      "type": "Guerrero",
                      "count": 20,
                      "growth_per_week": 5,
                      "stats": {
                        "attack": 4,
                        "defense": 3,
                        "power": 1,
                        "knowledge": 1,
                        "movement_points": 5,
                        "movement_points_left": 5
                      },
                      "recruit_cost": {
                        "gold": 50,
                        "wood": 0,
                        "stone": 0
                      }
                    },
                    {
                      "type": "Arquero",
                      "count": 15,
                      "growth_per_week": 4,
                      "stats": {
                        "attack": 5,
                        "defense": 2,
                        "power": 2,
                        "knowledge": 1,
                        "movement_points": 5,
                        "movement_points_left": 5
                      },
                      "recruit_cost": {
                        "gold": 70,
                        "wood": 0,
                        "stone": 0
                      }
                    },
                    {
                      "type": "Caballero",
                      "count": 8,
                      "growth_per_week": 2,
                      "stats": {
                        "attack": 7,
                        "defense": 5,
                        "power": 2,
                        "knowledge": 2,
                        "movement_points": 6,
                        "movement_points_left": 6
                      },
                      "recruit_cost": {
                        "gold": 120,
                        "wood": 1,
                        "stone": 1
                      }
                    },
                    {
                      "type": "Mago",
                      "count": 5,
                      "growth_per_week": 1,
                      "stats": {
                        "attack": 6,
                        "defense": 3,
                        "power": 6,
                        "knowledge": 5,
                        "movement_points": 5,
                        "movement_points_left": 5
                      },
                      "recruit_cost": {
                        "gold": 200,
                        "wood": 0,
                        "stone": 0,
                        "gems": 1
                      }
                    },
                    {
                      "type": "Dragon",
                      "count": 1,
                      "growth_per_week": 0,
                      "stats": {
                        "attack": 12,
                        "defense": 10,
                        "power": 8,
                        "knowledge": 4,
                        "movement_points": 8,
                        "movement_points_left": 8
                      },
                      "recruit_cost": {
                        "gold": 1000,
                        "wood": 5,
                        "stone": 5,
                        "gems": 5
                      }
                    }
                  ],
                  "is_castle": True,
                  "has_tavern": True,
                  "can_recruit": True
                }
              ],
              "owner": "681b509ccad708339c638754"
            }
          ]
        },
        "ai": {
          "heroes": [],
          "resources": {
            "gold": 1000,
            "wood": 500,
            "stone": 300
          },
          "cities": []
        },
        "map": {
          "size": {
            "width": 20,
            "height": 20
          },
          "tiles": [],
          "fog_of_war": [],
          "explored": [],
          "visible_objects": []
        },
        "current_player": "ai"
      }
    }

    # Display menu options
    print("\n===== GROQ CLIENT TESTER =====")
    print("1. Test AI Communication (Send game state)")
    print("2. Test Token Limit Handling")
    choice = input("Select an option (1-2): ")

    try:
        # Create an instance of the GroqClient
        client = GroqClient()
        
        if choice == "1":
            # Option 1: Send a message to the AI and print the response
            print("\nSending game state to AI...")
            response = client.send_message(game_state)
            
            # Print the response
            print("\nRESPUESTA CLIENTE GROQ:")
            print(response.choices[0].message.content)
            
        elif choice == "2":
            # Option 2: Test token limit with controlled scaling
            print("\nTesting token limit handling with controlled scaling...")
            print("Current model:", client.default_model)
            
            # Start with original game state
            test_game_state = copy.deepcopy(game_state)
            estimated_tokens = estimate_tokens(test_game_state)
            print(f"Original game state estimated tokens: {estimated_tokens}")
            
            # Test with progressively larger payloads
            scale_factors = [5, 10, 20, 50, 100]
            
            for scale in scale_factors:
                try:
                    print(f"\nTesting with scale factor {scale}...")
                    
                    # Create a scaled game state
                    scaled_game_state = copy.deepcopy(game_state)
                    
                    # Duplicate heroes with controlled scaling
                    original_heroes = scaled_game_state["game_state"]["player"]["heroes"].copy()
                    for i in range(1, scale):
                        for hero in original_heroes:
                            new_hero = copy.deepcopy(hero)
                            new_hero["id"] = f"{hero['id']}_{i}"
                            new_hero["name"] = f"{hero['name']} Clone {i}"
                            new_hero["position"]["x"] += i
                            new_hero["position"]["y"] += i
                            scaled_game_state["game_state"]["player"]["heroes"].append(new_hero)
                    
                    # Duplicate cities with controlled scaling
                    original_cities = scaled_game_state["game_state"]["player"]["cities"].copy()
                    for i in range(1, min(scale, 10)):  # Limit city duplication
                        for city in original_cities:
                            new_city = copy.deepcopy(city)
                            new_city["id"] = f"{city['id']}_{i}"
                            new_city["name"] = f"{city['name']} Clone {i}"
                            new_city["position"]["x"] += i
                            new_city["position"]["y"] += i
                            scaled_game_state["game_state"]["player"]["cities"].append(new_city)
                    
                    # Add tiles with controlled size
                    tile_size = min(scale, 20)  # Limit tile grid size
                    scaled_game_state["game_state"]["map"]["tiles"] = [
                        {"x": x, "y": y, "type": "grass", "objects": [
                            {"id": f"obj_{x}_{y}", "type": "resource", "details": "Resource description. " * min(scale//5, 5)}
                        ]} 
                        for x in range(tile_size) for y in range(tile_size)
                    ]
                    
                    # Estimate token count
                    estimated_tokens = estimate_tokens(scaled_game_state)
                    print(f"Scale {scale}: Estimated tokens: {estimated_tokens}")
                    
                    if estimated_tokens > 90000:  # Safety threshold
                        print(f"Estimated token count too high ({estimated_tokens}). Skipping this scale.")
                        continue
                    
                    print(f"Sending payload with scale factor {scale}...")
                    response = client.send_message(scaled_game_state)
                    print(f"Success! Response received for scale {scale}")
                    
                except Exception as scale_error:
                    print(f"Error at scale {scale}: {str(scale_error)}")
                    
                    # If there's a token limit error, try with alternative model if available
                    if "413" in str(scale_error) or "too large" in str(scale_error).lower() or "token" in str(scale_error).lower():
                        try:
                            print("Attempting to switch to a model with higher token limits...")
                            # This assumes client has method to switch models
                            # Modify as needed based on your GroqClient implementation
                            if hasattr(client, 'switch_to_higher_capacity_model'):
                                client.switch_to_higher_capacity_model()
                                print(f"Switched to model: {client.default_model}")
                            else:
                                print("No method available to switch models automatically.")
                        except Exception as model_switch_error:
                            print(f"Error switching models: {str(model_switch_error)}")
            
            print("\nToken limit testing complete")
            
        else:
            print("\nInvalid option. Please select 1 or 2.")
            
    except Exception as e:
        print(f"\nError: {str(e)}")

if __name__ == "__main__":
    main()
