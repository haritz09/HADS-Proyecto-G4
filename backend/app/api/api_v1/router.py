from fastapi import APIRouter
from .endpoints import auth, games, heroes, scenarios

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(games.router, prefix="/games", tags=["games"])
#api_router.include_router(heroes.router, prefix="/heroes", tags=["heroes"])
api_router.include_router(scenarios.router, prefix="/scenarios", tags=["scenarios"])

