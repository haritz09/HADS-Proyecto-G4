from fastapi import APIRouter, HTTPException, status, Depends, Body
from typing import List
from backend.app.db.schema import ScenarioRead, ScenarioBase
from backend.app.db.crud import get_all_scenarios, get_scenario, create_scenario
from backend.app.api.api_v1.endpoints.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=List[ScenarioRead])
def list_scenarios():
    """Listar todos los escenarios disponibles."""
    return get_all_scenarios()

@router.post("/", response_model=ScenarioRead, status_code=201)
def create_new_scenario(
    scenario_data: dict = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Crear un nuevo escenario."""
    # Validar datos básicos
    if "name" not in scenario_data or "description" not in scenario_data:
        raise HTTPException(status_code=400, detail="Nombre y descripción son obligatorios")
    
    if "map_size" not in scenario_data:
        raise HTTPException(status_code=400, detail="Tamaño del mapa es obligatorio")
    
    # Crear escenario en la base de datos
    scenario_id = create_scenario(scenario_data)
    
    # Obtener el escenario creado para devolverlo
    scenario = get_scenario(scenario_id)
    if not scenario:
        raise HTTPException(status_code=500, detail="Error al crear el escenario")
    
    return scenario

@router.get("/{scenario_id}", response_model=ScenarioRead)
def get_scenario_by_id(scenario_id: str):
    """Obtener un escenario por su ID."""
    scenario = get_scenario(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Escenario no encontrado")
    return scenario