"""Devoluciones schemas."""
from datetime import datetime
from typing import List
from pydantic import BaseModel


class ItemDevolucionCreate(BaseModel):
    """Item de devolución que el cliente selecciona."""
    item_pedido_id: int  # ID del ItemPedido
    cantidad: int
    motivo: str
    comentario: str | None = None


class DevolucionCreate(BaseModel):
    pedido_id: int
    items: List[ItemDevolucionCreate]  # Productos específicos a devolver
    comentario_general: str | None = None  # Comentario opcional para toda la devolución


class DevolucionOut(BaseModel):
    id: int
    motivo: str
    comentario: str | None = None
    estado: str
    pedido_id: int

    model_config = {"from_attributes": True}


class DevolucionEstadoUpdate(BaseModel):
    estado: str
    respuesta_empresa: str | None = None  # Comentario opcional de la empresa


# Schemas para vista del cliente con detalles del producto

class ItemDevolucionOut(BaseModel):
    """Item de devolución retornado al cliente (producto específico)."""
    id: int
    producto_nombre: str
    producto_sku: str | None = None
    producto_imagen_url: str | None = None
    cantidad: int
    motivo: str
    comentario: str | None = None

    model_config = {"from_attributes": True}


class DevolucionClienteOut(BaseModel):
    """Devolución con detalles completos para el cliente - solo los productos devueltos."""
    id: int
    estado: str
    fecha_solicitud: datetime
    comentario_general: str | None = None
    respuesta_empresa: str | None = None  # Respuesta de la empresa al aprobar/rechazar
    pedido_id: int
    items: List[ItemDevolucionOut]  # Solo los productos que se devuelven

    model_config = {"from_attributes": True}


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
    respuesta_empresa: str | None = None  # Respuesta de la empresa al aprobar/rechazar
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
