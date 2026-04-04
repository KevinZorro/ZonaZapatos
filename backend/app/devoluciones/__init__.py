"""Devoluciones module — models, schemas, and router for returns management."""
from app.devoluciones.models import Devolucion, EvidenciaDevolucion, EstadoDevolucionEnum, TipoArchivoEnum
from app.devoluciones.schemas import (
    DevolucionCreate,
    DevolucionEstadoUpdate,
    DevolucionListResponse,
    DevolucionOut,
    DevolucionUpdate,
)
from app.devoluciones.router import router

__all__ = [
    "Devolucion",
    "EvidenciaDevolucion",
    "EstadoDevolucionEnum",
    "TipoArchivoEnum",
    "DevolucionCreate",
    "DevolucionEstadoUpdate",
    "DevolucionListResponse",
    "DevolucionOut",
    "DevolucionUpdate",
    "router",
]