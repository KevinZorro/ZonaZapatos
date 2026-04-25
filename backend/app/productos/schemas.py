"""Productos schemas — Pydantic models for request/response."""
from datetime import datetime

from pydantic import BaseModel, field_serializer


class CategoriaOut(BaseModel):
    id: int
    nombre: str

    model_config = {"from_attributes": True}


class MediaArchivoOut(BaseModel):
    id: int
    cloudinary_url: str
    tipo: str
    formato: str | None = None

    model_config = {"from_attributes": True}


class ProductoOut(BaseModel):
    id: int
    nombre: str
    descripcion: str | None = None
    precio: float
    estado: str
    talla: str | None = None
    color: str | None = None
    stock: int
    empresa_id: int
    empresa_nombre: str | None = None
    empresa_whatsapp: str | None = None
    modelo_3d_url: str | None = None
    categorias: list[CategoriaOut] = []
    media: list[MediaArchivoOut] = []
    promedio_resenas: float = 0
    total_resenas: int = 0

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_empresa(cls, obj):
        data = cls.model_validate(obj)
        if obj.empresa:
            data.empresa_nombre = obj.empresa.nombre
            data.empresa_whatsapp = obj.empresa.whatsapp
        return data


class ProductoCreate(BaseModel):
    nombre: str
    descripcion: str | None = None
    precio: float
    talla: str | None = None
    color: str | None = None
    stock: int = 0
    categoria_ids: list[int] = []


class ProductoUpdate(BaseModel):
    nombre: str | None = None
    descripcion: str | None = None
    precio: float | None = None
    talla: str | None = None
    color: str | None = None
    stock: int | None = None
    estado: str | None = None
    categoria_ids: list[int] | None = None


class ProductoListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[ProductoOut]


class ClienteResenaOut(BaseModel):
    id: int
    nombre: str
    avatar_url: str | None = None
    inicial: str  # Primera letra del nombre para mostrar si no hay avatar

    model_config = {"from_attributes": True}


class ResenaOut(BaseModel):
    id: int
    calificacion: int
    comentario: str | None = None
    respondida_en: str | None = None
    pedido_id: int
    cliente: ClienteResenaOut | None = None

    model_config = {"from_attributes": True}


class ResenasSummary(BaseModel):
    promedio: float
    total: int
    distribucion: dict[int, int]  # {1: count, 2: count, ...}
    resenas: list[ResenaOut]
