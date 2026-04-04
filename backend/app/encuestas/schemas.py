"""Encuestas schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class EncuestaCreate(BaseModel):
    """Schema para crear/crear una encuesta (usada por el sistema)."""
    pedido_id: int = Field(..., description="ID del pedido a encuestar")


class EncuestaResponder(BaseModel):
    """Schema para responder una encuesta."""
    calificacion: int = Field(
        ..., 
        ge=1, 
        le=5, 
        description="Calificación del 1 al 5, donde 1 es muy insatisfecho y 5 muy satisfecho"
    )
    comentario: Optional[str] = Field(
        None, 
        description="Comentario opcional sobre la experiencia"
    )


class EncuestaOmitir(BaseModel):
    """Schema para omitir una encuesta."""
    motivo: Optional[str] = Field(
        None, 
        description="Motivo opcional por el cual se omite la encuesta"
    )


class EncuestaOut(BaseModel):
    """Schema completo de salida para encuesta."""
    id: int
    calificacion: Optional[int] = None
    comentario: Optional[str] = None
    respondida: bool
    omitida: bool
    enviada_en: datetime
    respondida_en: Optional[datetime] = None
    pedido_id: int

    model_config = {"from_attributes": True}


class EncuestaDetalleOut(BaseModel):
    """Schema con detalles adicionales para administración."""
    id: int
    calificacion: Optional[int] = None
    comentario: Optional[str] = None
    respondida: bool
    omitida: bool
    enviada_en: datetime
    respondida_en: Optional[datetime] = None
    pedido_id: int
    pedido_estado: Optional[str] = None
    cliente_nombre: Optional[str] = None

    model_config = {"from_attributes": True}


class EncuestaListResponse(BaseModel):
    """Schema para respuesta de lista de encuestas."""
    total: int
    page: int
    page_size: int
    items: list[EncuestaOut]


class EncuestaEstadisticas(BaseModel):
    """Schema para estadísticas de encuestas."""
    total_encuestas: int
    respondidas: int
    omitidas: int
    calificacion_promedio: Optional[float] = None
    porcentaje_respuesta: float