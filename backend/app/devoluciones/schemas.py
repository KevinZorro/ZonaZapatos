"""Devoluciones schemas."""
import enum
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class EstadoDevolucionEnum(str, enum.Enum):
    """Enum para estados de devolución."""
    solicitada = "solicitada"
    en_revision = "en_revision"
    aprobada = "aprobada"
    rechazada = "rechazada"


class DevolucionCreate(BaseModel):
    """Schema para crear una nueva devolución."""
    pedido_id: int = Field(..., description="ID del pedido a devolver")
    motivo: str = Field(..., min_length=1, max_length=255, 
                        description="Motivo principal de la devolución")
    comentario: Optional[str] = Field(None, description="Descripción detallada de la devolución")


class DevolucionUpdate(BaseModel):
    """Schema para actualizar una devolución."""
    motivo: Optional[str] = Field(None, min_length=1, max_length=255)
    comentario: Optional[str] = Field(None)


class DevolucionEstadoUpdate(BaseModel):
    """Schema para actualizar el estado de una devolución."""
    estado: str = Field(..., description="Nuevo estado de la devolución")


class EvidenciaDevolucionOut(BaseModel):
    """Schema para evidencia de devolución."""
    id: int
    cloudinary_url: str
    cloudinary_public_id: str
    tipo_archivo: str
    devolucion_id: int

    model_config = {"from_attributes": True}


class DevolucionOut(BaseModel):
    """Schema completo de salida para devolución."""
    id: int
    motivo: str
    comentario: Optional[str] = None
    estado: str
    fecha_solicitud: datetime
    pedido_id: int
    evidencias: list[EvidenciaDevolucionOut] = []

    model_config = {"from_attributes": True}


class DevolucionListResponse(BaseModel):
    """Schema para respuesta de lista de devoluciones."""
    total: int
    page: int
    page_size: int
    items: list[DevolucionOut]