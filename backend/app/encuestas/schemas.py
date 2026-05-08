"""Encuestas schemas."""
from datetime import datetime
from pydantic import BaseModel, Field


class EncuestaResponder(BaseModel):
    calificacion: int = Field(..., ge=1, le=5)
    comentario: str | None = None


class ProductoResumenEncuesta(BaseModel):
    id: int
    nombre: str
    model_config = {"from_attributes": True}


class EncuestaOut(BaseModel):
    id: int
    calificacion: int | None = None
    comentario: str | None = None
    respondida: bool
    omitida: bool
    recordatorio_activo: bool
    enviada_en: datetime | None = None
    respondida_en: datetime | None = None
    pedido_id: int
    producto_id: int | None = None
    producto: ProductoResumenEncuesta | None = None

    model_config = {"from_attributes": True}


class EncuestaPendienteOut(BaseModel):
    id: int
    pedido_id: int
    producto_id: int | None = None
    producto: ProductoResumenEncuesta | None = None
    recordatorio_activo: bool
    enviada_en: datetime | None = None

    model_config = {"from_attributes": True}
