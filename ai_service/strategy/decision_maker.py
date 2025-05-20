"""
Analizador y generador de decisiones

Implementar:
- Lógica para analizar el estado del juego
- Algoritmos para evaluar opciones estratégicas
- Generación de decisiones basadas en la respuesta del modelo
- Validación de que las decisiones respetan las reglas del juego
"""

def create_strategic_summary(game_state):
    """
    Crea un resumen estratégico del estado del juego para enviar a la IA,
    reduciendo drásticamente el tamaño del payload para evitar errores 413.
    
    Se enfoca SOLO en información estratégicamente relevante, omitiendo
    datos detallados del mapa y estructuras no esenciales.
    
    Args:
        game_state: El estado completo del juego con todos sus detalles
        
    Returns:
        dict: Un resumen compacto con información estratégica relevante
    """
    # Verificación básica del game_state
    if not game_state or not isinstance(game_state, dict):
        return {}
    
    # Información básica del juego (PRIORIDAD MÁXIMA)
    summary = {
        "turn": game_state.get("turn"),
        "current_player": game_state.get("current_player"),
    }
    
    # --- INFORMACIÓN DE LA IA (ALTA PRIORIDAD) ---
    ai_data = game_state.get("ai", {})
    
    # Procesar recursos estratégicos para calcular distancias y objetivos
    map_data = game_state.get("map", {})
    resource_mines = [obj for obj in map_data.get("visible_objects", [])
          if (obj.get("type") in ["goldmine", "sawmill", "quarry"] or 
              "resource_type" in obj and obj.get("resource_type") in ["gold", "wood", "stone"])]
    
    artifacts = [obj for obj in map_data.get("visible_objects", [])
          if obj.get("type") == "artifact" or "subtype" in obj]
    
    # Calcular héroes con información de movimiento mejorada
    ai_heroes = []
    for hero in ai_data.get("heroes", []):
        # Obtener datos básicos del héroe
        hero_id = hero.get("id")
        position = hero.get("position", {})
        movement_points_left = hero.get("stats", {}).get("movement_points_left", 0)
        
        # Calcular posiciones alcanzables (simplificado por distancia euclidiana)
        reachable_positions = []
        reachable_mines = []
        
        # Solo calcular si tenemos posición y puntos de movimiento
        if position and movement_points_left > 0:
            # Para cada mina de recursos, verificar si está dentro del rango de movimiento
            for mine in resource_mines:
                mine_position = mine.get("position", {})
                if mine_position:
                    distance = calculate_distance(position, mine_position)
                    
                    mine_info = {
                        "id": mine.get("id"),
                        "type": mine.get("type", "unknown"),
                        "resource_type": mine.get("resource_type"),
                        "position": mine_position,
                        "distance": round(distance, 2),
                        "reachable": distance <= movement_points_left,
                        "owner": mine.get("owner"),
                        "resource_per_turn": mine.get("resource_per_turn")
                    }
                    
                    reachable_mines.append(mine_info)
                    
                    # Si es alcanzable, añadir a posiciones alcanzables
                    if distance <= movement_points_left:
                        reachable_positions.append(mine_position)
        
        # Crear objeto héroe con información de movimiento
        ai_heroes.append({
            "id": hero_id,
            "name": hero.get("name"),
            "position": position,
            "stats": {
                "attack": hero.get("stats", {}).get("attack"),
                "defense": hero.get("stats", {}).get("defense"),
                "movement_points": hero.get("stats", {}).get("movement_points"),
                "movement_points_left": movement_points_left
            },
            # Añadir información de movimiento
            "movement": {
                "max_distance": movement_points_left,
                "reachable_positions": reachable_positions
            },
            # Información de recursos alcanzables
            "reachable_mines": reachable_mines,
            # Ejército resumido por tipo y cantidad
            "army": summarize_army_units(hero.get("army", []))
        })
        
    summary["ai"] = {
        # Recursos completos (son datos pequeños pero críticos)
        "resources": ai_data.get("resources", {}),
        
        # Héroes con información mejorada
        "heroes": ai_heroes,
        
        # Ciudades: solo datos críticos y edificios que permiten reclutar
        "cities": [{
            "id": city.get("id"),
            "name": city.get("name"),
            "position": city.get("position"),
            "owner": city.get("owner"),
            # SOLO edificios construidos que permiten reclutar
            "recruitment_buildings": [{
                "id": building.get("id"),
                "type": building.get("building_type")
            } for building in city.get("buildings", [])
              if building.get("built", False) and building.get("can_recruit", False)]
        } for city in ai_data.get("cities", [])]
    }
    
    # --- INFORMACIÓN DEL JUGADOR (MEDIA PRIORIDAD) ---
    # Solo lo mínimo necesario para tomar decisiones estratégicas
    player_data = game_state.get("player", {})
    summary["player"] = {
        # Héroes visibles: solo posición y fuerza aproximada
        "heroes": [{
            "id": hero.get("id"),
            "position": hero.get("position"),
            # Estimación muy básica de fuerza militar
            "estimated_strength": estimate_army_strength(hero.get("army", []))
        } for hero in player_data.get("heroes", [])],
        
        # Ciudades: solo ubicación y propiedad
        "cities": [{
            "id": city.get("id"),
            "position": city.get("position"),
            "owner": city.get("owner")
        } for city in player_data.get("cities", [])]
    }
    
    # --- ELEMENTOS CRÍTICOS DEL MAPA (MEDIA-ALTA PRIORIDAD) ---
    map_data = game_state.get("map", {})
    
    # Tamaño de mapa (dato pequeño pero útil)
    summary["map_size"] = map_data.get("size", {"width": 100, "height": 100})
    
    # Objetos estratégicos clave - Se usa la misma información calculada anteriormente
    summary["strategic_objects"] = {
        # Minas de recursos - Críticas para economía
        "resource_mines": resource_mines,
        
        # Artefactos en el mapa - Objetivos de alto valor
        "artifacts": artifacts
    }
    
    # --- REGLAS Y MECÁNICAS DE JUEGO EXPLÍCITAS ---
    # Información clave para ayudar a la IA a entender restricciones
    summary["game_rules"] = {
        "movement": {
            "calculation_method": "Distancia euclidiana entre puntos (sqrt((x2-x1)^2 + (y2-y1)^2))",
            "note": "El héroe solo puede moverse a posiciones cuya distancia sea menor o igual a sus puntos de movimiento restantes"
        },
        "action_dependencies": {
            "collectResource": "El héroe DEBE estar exactamente en la misma posición que el recurso para recolectarlo",
            "transfer": "El héroe DEBE estar en la misma posición que el castillo/ciudad para transferir tropas",
            "recruitUnits": "El héroe DEBE estar en o adyacente a una ciudad con un edificio de reclutamiento"
        },
        "partial_movement": {
            "description": "Si el héroe no tiene suficientes puntos de movimiento para llegar al destino deseado, se moverá lo más cerca posible",
            "warning": "Si planeas recolectar un recurso después de moverte, asegúrate de que puedas llegar exactamente a la posición del recurso",
            "recommendation": "Considera dividir viajes largos en varias etapas: mueve -> finaliza turno -> mueve -> recolecta"
        },
        "turn_sequence": "Las acciones se ejecutan secuencialmente. Si una acción falla (como intentar moverse demasiado lejos), las acciones posteriores aún se intentarán."
    }
    
    # --- DATOS EXPLÍCITAMENTE OMITIDOS ---
    # No se incluye ninguno de estos elementos de alto volumen:
    # - Mapa detallado de tiles (miles de elementos)
    # - Arrays fog_of_war y explored
    # - Edificios no construidos
    # - Estadísticas detalladas de criaturas disponibles
    # - Historial de movimientos
    # - Detalles completos de artefactos ya recogidos
    
    return summary

def summarize_army_units(army):
    """Resume el ejército por tipo y cantidad total."""
    unit_counts = {}
    for unit in army:
        unit_type = unit.get("type", "unknown")
        count = unit.get("count", 0)
        unit_counts[unit_type] = unit_counts.get(unit_type, 0) + count
    
    return unit_counts

def estimate_army_strength(army):
    """Estima la fuerza militar general sin detalles específicos."""
    total_strength = 0
    for unit in army:
        count = unit.get("count", 0)
        
        # Cálculo simplificado de fuerza basado solo en cantidad
        # Podría refinarse con un multiplicador según el tipo
        unit_strength = count * get_unit_power_estimation(unit.get("type", "unknown"))
        total_strength += unit_strength
    
    # Categoría de fuerza en lugar de número exacto
    if total_strength == 0:
        return "none"
    elif total_strength < 50:
        return "weak"
    elif total_strength < 150:
        return "medium" 
    elif total_strength < 300:
        return "strong"
    else:
        return "very_strong"

def get_unit_power_estimation(unit_type):
    """Estima el poder relativo de cada tipo de unidad para cálculos de fuerza."""
    power_levels = {
        "Milicia": 1,
        "Arquero": 1.5,
        "Caballero": 3,
        "Mago": 4,
        "Dragón": 10,
        "Esqueleto": 1,
        "Zombie": 1.2,
        # Valores por defecto para otros tipos
        "unknown": 1
    }
    return power_levels.get(unit_type, 1)

def calculate_distance(pos1, pos2):
    """Calcula la distancia euclidiana entre dos posiciones."""
    try:
        x1 = float(pos1.get("x", 0))
        y1 = float(pos1.get("y", 0))
        x2 = float(pos2.get("x", 0))
        y2 = float(pos2.get("y", 0))
        
        return ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5
    except (TypeError, ValueError, AttributeError):
        return float('inf')  # Retorna infinito si hay problemas de cálculo
