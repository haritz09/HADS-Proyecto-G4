from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.api_v1.router import api_router

app = FastAPI()

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Permitir frontend
    allow_credentials=True,
    allow_methods=["*"],  # Permitir todos los métodos HTTP
    allow_headers=["*"],  # Permitir todos los headers
    expose_headers=["*"]
)

app.include_router(api_router, prefix="/api")