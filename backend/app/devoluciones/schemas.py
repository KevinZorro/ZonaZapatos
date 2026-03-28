"""Devoluciones schemas."""
from pydantic import BaseModel


class DevolucionCreate(BaseModel):
    pedido_id: int
    motivo: str
    comentario: str | None = None


class DevolucionOut(BaseModel):
    id: int
    motivo: str
    comentario: str | None = None
    estado: str
    pedido_id: int

    model_config = {"from_attributes": True}


class DevolucionEstadoUpdate(BaseModel):
    estado: str
