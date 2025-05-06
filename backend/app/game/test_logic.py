import unittest
from backend.app.db.schema import (
    GameState, Position, Entity, Heroe, Stats, ArmyUnit, City,
    Building, AvailableCreature, Resources, MapSize, GameMap
)
from backend.app.game.logic import (
    calculate_distance, calculate_movement_cost, has_enough_movement_points, has_enough_resources,
    deduct_resources, calculate_level, process_hero_movement,
    process_hero_attack, process_recruitment, process_end_turn,
    resolve_combat
)

class TestLogicFunctions(unittest.TestCase):
    def setUp(self):
        """Configurar objetos de prueba comunes"""
        # Crear héroe de prueba
        self.hero_stats = Stats(
            attack=5, defense=3, power=2, knowledge=2,
            movement_points=10, movement_points_left=10
        )
        self.hero = Heroe(
            id="hero1",
            name="Test Hero",
            position=Position(x=5, y=5),
            stats=self.hero_stats,
            army=[
                ArmyUnit(type="archer", count=10),
                ArmyUnit(type="swordsman", count=5)
            ],
            artifacts=[]
        )

        # Crear AvailableCreature de prueba (con stats y recruit_cost)
        self.available_archer = AvailableCreature(
            type="archer",
            count=20,
            growth_per_week=4,
            stats=Stats(attack=4, defense=2, power=1, knowledge=1, movement_points=5, movement_points_left=5),
            recruit_cost={"gold": 100, "wood": 0, "stone": 0}
        )
        self.available_swordsman = AvailableCreature(
            type="swordsman",
            count=10,
            growth_per_week=2,
            stats=Stats(attack=5, defense=3, power=1, knowledge=1, movement_points=5, movement_points_left=5),
            recruit_cost={"gold": 120, "wood": 0, "stone": 0}
        )

        # Crear edificios de prueba (con position, available_creatures, is_castle, can_recruit...)
        self.townhall = Building(
            id="townhall",
            name="Town Hall",
            position=Position(x=10, y=10),
            available_creatures=[self.available_archer, self.available_swordsman],
            is_castle=True,
            has_tavern=True,
            can_recruit=True
        )
        self.barracks = Building(
            id="barracks",
            name="Barracks",
            position=Position(x=10, y=10),
            available_creatures=[],
            is_castle=False,
            has_tavern=False,
            can_recruit=False
        )

        # Crear ciudad de prueba (buildings debe ser lista de Building, owner opcional)
        self.city = City(
            id="city1",
            name="Test City",
            position=Position(x=10, y=10),
            buildings=[self.townhall, self.barracks],
            owner=None
        )

        # Crear estado de juego de prueba
        self.game_state = GameState(
            turn=1,
            current_player="player",
            player=Entity(
                heroes=[self.hero],
                cities=[self.city],
                resources=Resources(gold=1000, wood=500, stone=300)
            ),
            ai=Entity(
                heroes=[
                    Heroe(
                        id="ai_hero1",
                        name="AI Hero",
                        position=Position(x=15, y=15),
                        stats=Stats(
                            attack=4, defense=4, power=3, knowledge=3,
                            movement_points=10, movement_points_left=10
                        ),
                        army=[
                            ArmyUnit(type="wolf", count=8),
                            ArmyUnit(type="archer", count=6)
                        ],
                        artifacts=[]
                    )
                ],
                cities=[],
                resources=Resources(gold=1000, wood=500, stone=300)
            ),
            map=GameMap(
                size=MapSize(width=100, height=100),
                tiles=None,
                fog_of_war=None,
                explored=None,
                visible_objects=None
            )
        )

    def test_calculate_distance(self):
        """Prueba el cálculo de distancia no entera entre dos posiciones"""
        pos1 = Position(x=0, y=0)
        pos2 = Position(x=4, y=4)
        distance = calculate_distance(pos1, pos2)
        self.assertAlmostEqual(distance, 5.65685, places=5)  # sqrt(32) ≈ 5.65685

    def test_has_enough_movement_points(self):
        """Prueba la verificación de puntos de movimiento con movimiento diagonal"""
        start = Position(x=0, y=0)
        end = Position(x=4, y=4)  # Distancia ≈ 5.65685
        
        # Caso con suficientes puntos
        self.hero.stats.movement_points_left = 6
        self.assertTrue(has_enough_movement_points(self.hero, start, end))
        
        # Caso con puntos exactos (redondeando)
        self.hero.stats.movement_points_left = 5.66
        self.assertTrue(has_enough_movement_points(self.hero, start, end))
        
        # Caso con puntos insuficientes
        self.hero.stats.movement_points_left = 5
        self.assertFalse(has_enough_movement_points(self.hero, start, end))

    def test_has_enough_resources(self):
        """Prueba la verificación de recursos suficientes"""
        cost = {"gold": 500, "wood": 200}
        self.assertTrue(has_enough_resources(self.game_state.player, cost))
        
        # Probar con recursos insuficientes
        cost = {"gold": 2000}
        self.assertFalse(has_enough_resources(self.game_state.player, cost))

    def test_deduct_resources(self):
        """Prueba la deducción de recursos"""
        initial_gold = self.game_state.player.resources.gold
        cost = {"gold": 300}
        deduct_resources(self.game_state.player, cost)
        self.assertEqual(self.game_state.player.resources.gold, initial_gold - 300)

    def test_calculate_level(self):
        """Prueba el cálculo de nivel basado en experiencia"""
        self.assertEqual(calculate_level(50), 1)   # Primer nivel
        self.assertEqual(calculate_level(150), 2)  # Segundo nivel
        self.assertEqual(calculate_level(1000), 5) # Quinto nivel

    def test_process_hero_movement(self):
        """Prueba el procesamiento de movimiento de héroe"""
        # Caso 1: Movimiento simple (1 unidad horizontal)
        action = {
            "hero_id": "hero1",
            "target_position": {"x": 6, "y": 5}
        }
        initial_points = self.hero.stats.movement_points_left
        movement_cost = calculate_movement_cost(self.hero.position, Position(x=6, y=5), self.game_state.map)
        
        result = process_hero_movement(self.game_state, action)
        
        self.assertEqual(self.hero.position.x, 6)
        self.assertEqual(self.hero.position.y, 5)
        self.assertEqual(self.hero.stats.movement_points_left, initial_points - movement_cost)

        # Caso 2: Movimiento diagonal (coste no entero)
        self.hero.position = Position(x=5, y=5)  # Reset position
        self.hero.stats.movement_points_left = 10  # Reset movement points
        
        action = {
            "hero_id": "hero1",
            "target_position": {"x": 8, "y": 8}
        }
        movement_cost = calculate_movement_cost(self.hero.position, Position(x=8, y=8), self.game_state.map)
        
        result = process_hero_movement(self.game_state, action)
        
        self.assertEqual(self.hero.position.x, 8)
        self.assertEqual(self.hero.position.y, 8)
        self.assertAlmostEqual(self.hero.stats.movement_points_left, 10 - movement_cost, places=5)

        # Caso 3: Movimiento inválido por puntos insuficientes
        self.hero.stats.movement_points_left = 2
        action = {
            "hero_id": "hero1",
            "target_position": {"x": 15, "y": 15}
        }
        with self.assertRaises(ValueError) as context:
            process_hero_movement(self.game_state, action)
        self.assertEqual(str(context.exception), "Puntos de movimiento insuficientes")

        # Caso 4: Héroe no existente
        with self.assertRaises(ValueError) as context:
            process_hero_movement(self.game_state, {
                "hero_id": "nonexistent", 
                "target_position": {"x": 1, "y": 1}
            })
        self.assertEqual(str(context.exception), "Héroe no encontrado")

    def test_process_recruitment(self):
        """Prueba el reclutamiento de unidades"""
        action = {
            "city_id": "city1",
            "unit_type": "archer",
            "amount": 5
        }
        initial_gold = self.game_state.player.resources.gold
        # Buscar cualquier building que pueda reclutar archer
        building = next((b for b in self.city.buildings if b.can_recruit and any(c.type == "archer" for c in b.available_creatures)), None)
        available_archer = next((c for c in building.available_creatures if c.type == "archer"), None)
        initial_count = available_archer.count
        
        result = process_recruitment(self.game_state, action)
        
        self.assertEqual(result["recruited"], 5)
        self.assertEqual(result["type"], "archer")
        self.assertEqual(available_archer.count, initial_count - 5)
        self.assertEqual(self.game_state.player.resources.gold, initial_gold - 500)  # 100 gold per unit

    def test_process_hero_attack(self):
        """Prueba el combate entre héroes"""
        action = {
            "attacker_id": "hero1",
            "defender_id": "ai_hero1"
        }
        result = process_hero_attack(self.game_state, action)
        
        self.assertIn("winner", result)
        self.assertIn("damage_dealt", result)
        self.assertTrue(isinstance(result["damage_dealt"], dict))

    def test_process_end_turn(self):
        """Prueba el procesamiento de fin de turno"""
        # Configurar turno inicial y crecimiento
        self.game_state.turn = 6  # El próximo será el 7
        self.game_state.current_player = "ai"  # Para que cambie de semana
        # Buscar el primer building con criaturas disponibles
        building = next((b for b in self.city.buildings if b.available_creatures), None)
        initial_creature_count = building.available_creatures[0].count
        growth_rate = building.available_creatures[0].growth_per_week
        
        # Ejecutar fin de turno
        result = process_end_turn(self.game_state)
        
        # Verificar crecimiento semanal
        self.assertEqual(
            building.available_creatures[0].count,
            initial_creature_count + growth_rate,
            "El crecimiento semanal no se aplicó correctamente"
        )
        
        # Verificar cambio de turno
        self.assertEqual(self.game_state.turn, 7)
        self.assertEqual(self.game_state.current_player, "player")

    def test_resolve_combat(self):
        """Prueba la resolución de combate"""
        attacker = self.hero
        defender = self.game_state.ai.heroes[0]
        
        result = resolve_combat(attacker, defender)
        
        self.assertIn("winner", result)
        self.assertIn("damage_dealt", result)
        self.assertIn("attacker", result["damage_dealt"])
        self.assertIn("defender", result["damage_dealt"])

    def test_exact_movement_points(self):
        """Movimiento con puntos exactos"""
        self.hero.stats.movement_points_left = 5
        start = Position(x=0, y=0)
        end = Position(x=3, y=4)  # distancia 5
        self.hero.position = start
        action = {"hero_id": "hero1", "target_position": {"x": 3, "y": 4}}
        self.game_state.player.heroes[0] = self.hero
        process_hero_movement(self.game_state, action)
        self.assertEqual(self.hero.stats.movement_points_left, 0)
        self.assertEqual(self.hero.position.x, 3)
        self.assertEqual(self.hero.position.y, 4)

    def test_fractional_movement(self):
        """Movimiento con puntos fraccionarios (distancia flotante)"""
        self.hero.stats.movement_points_left = 2
        start = Position(x=0, y=0)
        end = Position(x=1, y=1)  # distancia sqrt(2) ≈ 1.41
        self.hero.position = start
        action = {"hero_id": "hero1", "target_position": {"x": 1, "y": 1}}
        self.game_state.player.heroes[0] = self.hero
        process_hero_movement(self.game_state, action)
        self.assertTrue(self.hero.stats.movement_points_left < 2)
        self.assertEqual(self.hero.position.x, 1)
        self.assertEqual(self.hero.position.y, 1)

    def test_recruitment_with_exact_resources(self):
        """Reclutamiento con recursos exactos"""
        self.game_state.player.resources.gold = 500
        action = {"city_id": "city1", "unit_type": "archer", "amount": 5}
        building = next((b for b in self.city.buildings if b.can_recruit and any(c.type == "archer" for c in b.available_creatures)), None)
        available_archer = next((c for c in building.available_creatures if c.type == "archer"), None)
        available_archer.count = 10
        process_recruitment(self.game_state, action)
        self.assertEqual(self.game_state.player.resources.gold, 0)
        self.assertEqual(available_archer.count, 5)

    def test_recruitment_no_units_available(self):
        """Reclutamiento sin unidades disponibles"""
        building = next((b for b in self.city.buildings if b.can_recruit and any(c.type == "archer" for c in b.available_creatures)), None)
        available_archer = next((c for c in building.available_creatures if c.type == "archer"), None)
        available_archer.count = 0
        action = {"city_id": "city1", "unit_type": "archer", "amount": 1}
        with self.assertRaises(ValueError):
            process_recruitment(self.game_state, action)

    def test_recruitment_insufficient_resources(self):
        """Reclutamiento con recursos insuficientes"""
        self.game_state.player.resources.gold = 100
        action = {"city_id": "city1", "unit_type": "archer", "amount": 2}
        with self.assertRaises(ValueError):
            process_recruitment(self.game_state, action)

    def test_attack_with_empty_armies(self):
        """Ataque entre héroes con ejércitos vacíos"""
        self.hero.army = []
        self.game_state.ai.heroes[0].army = []
        action = {"attacker_id": "hero1", "defender_id": "ai_hero1"}
        result = process_hero_attack(self.game_state, action)
        self.assertIn(result["winner"], ["player", "ai"])
        self.assertEqual(result["damage_dealt"], {"attacker": 0, "defender": 0})

    def test_end_turn_no_heroes_or_cities(self):
        """Fin de turno sin héroes ni ciudades"""
        self.game_state.player.heroes = []
        self.game_state.player.cities = []
        result = process_end_turn(self.game_state)
        self.assertEqual(result["next_player"], "ai")

    def test_calculate_level_negative_and_high(self):
        """Cálculo de nivel con experiencia negativa y muy alta"""
        self.assertEqual(calculate_level(-100), 1)
        self.assertTrue(calculate_level(100000) > 1)

    def test_deduct_resources_to_zero(self):
        """Deducción de recursos dejando en cero"""
        self.game_state.player.resources.gold = 100
        deduct_resources(self.game_state.player, {"gold": 100})
        self.assertEqual(self.game_state.player.resources.gold, 0)

    def test_has_enough_resources_all_zero(self):
        """Verificación de recursos con todos en cero"""
        self.game_state.player.resources = Resources(gold=0, wood=0, ore=0)
        self.assertFalse(has_enough_resources(self.game_state.player, {"gold": 1}))
        self.assertTrue(has_enough_resources(self.game_state.player, {"gold": 0}))

if __name__ == '__main__':
    unittest.main()