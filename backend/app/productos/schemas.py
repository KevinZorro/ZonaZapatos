"""Productos schemas."""
from typing import List, Optional
from pydantic import BaseModel, Field


class MediaResumen(BaseModel):
    id: int
    cloudinary_url: str
    tipo: str
    formato: Optional[str] = None

    model_config = {"from_attributes": True}


class CategoriaResumen(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None

    model_config = {"from_attributes": True}


class ProductoBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=255)
    descripcion: Optional[str] = None
    precio: float = Field(..., gt=0)
    talla: Optional[str] = None
    color: Optional[str] = None
    stock: int = Field(default=0, ge=0)
    estado: str = Field(default="activo")
    dias_garantia: int = Field(default=90, ge=30, le=1095)


class ProductoCreate(ProductoBase):
    empresa_id: Optional[int] = None


class ProductoUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=255)
    descripcion: Optional[str] = None
    precio: Optional[float] = Field(None, gt=0)
    talla: Optional[str] = None
    color: Optional[str] = None
    stock: Optional[int] = Field(None, ge=0)
    estado: Optional[str] = None
    dias_garantia: Optional[int] = Field(None, ge=30, le=1095)


from datetime import datetime

class ProductoOut(ProductoBase):
    id: int
    creado_en: datetime
    actualizado_en: datetime
    empresa_id: int
    empresa_nombre: Optional[str] = None
    media: List[MediaResumen] = []
    categorias: List[CategoriaResumen] = []
    modelo_3d_url: Optional[str] = None
    promedio_resenas: Optional[float] = None
    total_resenas: Optional[int] = None

    model_config = {"from_attributes": True}


class ProductoResumen(BaseModel):
    id: int
    nombre: str
    precio: float
    talla: Optional[str] = None
    color: Optional[str] = None
    stock: int
    estado: str
    dias_garantia: int
    media: List[MediaResumen] = []

    model_config = {"from_attributes": True}


class ProductoListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[ProductoOut]


class ResenaOut(BaseModel):
    id: int
    calificacion: int
    comentario: Optional[str] = None
    respondida_en: Optional[str] = None
    pedido_id: int
    cliente_id: Optional[int] = None
    cliente: Optional[dict] = None

    model_config = {"from_attributes": True}


class ResenasSummary(BaseModel):
    promedio: float
    total: int
    distribucion: dict
    resenas: List[ResenaOut]

    model_config = {"from_attributes": True}


OPCIONES_GARANTIA = [
    {"value": 30, "label": "1 mes (30 días)"},
    {"value": 60, "label": "2 meses (60 días)"},
    {"value": 90, "label": "3 meses (90 días)"},
    {"value": 180, "label": "6 meses (180 días)"},
    {"value": 365, "label": "1 año (365 días) - Garantía legal mínima"},
    {"value": 1095, "label": "3 años (1095 días) - Máximo"},
]