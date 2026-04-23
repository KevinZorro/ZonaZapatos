"""Devoluciones schemas."""
from datetime import datetime
from typing import List
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


# Schemas para vista de empresa (HU07 + RF11)

class EvidenciaOut(BaseModel):
    id: int
    cloudinary_url: str
    cloudinary_public_id: str
    tipo_archivo: str

    model_config = {"from_attributes": True}


class ClienteInfo(BaseModel):
    id: int
    nombre: str
    correo: str
    telefono: str | None = None

    model_config = {"from_attributes": True}


class ProductoSnapshot(BaseModel):
    nombre: str | None = None
    sku: str | None = None
    descripcion: str | None = None
    imagen_url: str | None = None
    cantidad: int
    precio_unitario: float

    model_config = {"from_attributes": True}


class PedidoInfo(BaseModel):
    id: int
    estado: str
    fecha_pedido: datetime
    total: float
    productos: List[ProductoSnapshot]

    model_config = {"from_attributes": True}


class DevolucionDetalleEmpresa(BaseModel):
    id: int
    motivo: str
    comentario: str | None = None
    estado: str
    fecha_solicitud: datetime
    pedido: PedidoInfo
    cliente: ClienteInfo
    evidencias: List[EvidenciaOut]

    model_config = {"from_attributes": True}


class DevolucionPendienteOut(BaseModel):
    id: int
    motivo: str
    estado: str
    fecha_solicitud: datetime
    pedido_id: int
    cliente_nombre: str
    cliente_correo: str
    total_productos: int

    model_config = {"from_attributes": True}
