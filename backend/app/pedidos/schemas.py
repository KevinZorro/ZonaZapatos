"""Pedidos schemas."""
from datetime import datetime
from pydantic import BaseModel

class MediaResumen(BaseModel):
    cloudinary_url: str
    tipo: str
    model_config = {"from_attributes": True}


class ProductoResumen(BaseModel):
    id: int
    nombre: str
    media: list[MediaResumen] = []
    model_config = {"from_attributes": True}

class ItemPedidoCreate(BaseModel):
    producto_id: int
    cantidad: int


class PedidoCreate(BaseModel):
    items: list[ItemPedidoCreate]
    canal_contacto: str = "web"


class ItemPedidoOut(BaseModel):
    id: int
    producto_id: int | None
    cantidad: int
    precio_unitario: float
    producto: ProductoResumen | None = None
    model_config = {"from_attributes": True}


class PedidoOut(BaseModel):
    id: int
    estado: str
    fecha_pedido: datetime
    fecha_entrega: datetime | None = None
    total: float
    canal_contacto: str
    items: list[ItemPedidoOut] = []

    model_config = {"from_attributes": True}
