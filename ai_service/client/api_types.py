"""
Tipos e interfaces para la comunicación con la API de GroQ

Definir:
- Dataclasses/Pydantic models para las solicitudes a la API
- Dataclasses/Pydantic models para las respuestas de la API
- Enums para los errores y códigos de estado
- Configuración de los endpoints
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Any
from enum import Enum
