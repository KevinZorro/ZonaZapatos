"""Productos schemas — Pydantic models for request/response."""
from pydantic import BaseModel


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
    categorias: list[CategoriaOut] = []
    media: list[MediaArchivoOut] = []

    model_config = {"from_attributes": True}


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
