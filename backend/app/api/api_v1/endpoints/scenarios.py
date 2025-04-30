from fastapi import APIRouter, HTTPException, status
from typing import List
from backend.app.db.schema import ScenarioRead
from backend.app.db.crud import get_all_scenarios, get_scenario

router = APIRouter()

@router.get("/", response_model=List[ScenarioRead])
def list_scenarios():
    """Listar todos los escenarios disponibles."""
    return get_all_scenarios()