"""Encuestas schemas."""
from pydantic import BaseModel, Field


class EncuestaResponder(BaseModel):
    calificacion: int = Field(..., ge=1, le=5)
    comentario: str | None = None


class EncuestaOut(BaseModel):
    id: int
    calificacion: int | None = None
    comentario: str | None = None
    respondida: bool
    omitida: bool
    pedido_id: int

    model_config = {"from_attributes": True}
