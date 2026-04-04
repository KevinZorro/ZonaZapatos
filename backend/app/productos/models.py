"""Productos module — Producto, Categoria, ProductoCategoria, MediaArchivo ORM models."""
import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
)
from sqlalchemy.orm import relationship

from app.core.database import Base

# ── Many-to-many join table ─────────────────────────────────────────────────
producto_categoria = Table(
    "producto_categoria",
    Base.metadata,
    Column("producto_id", Integer, ForeignKey("productos.id", ondelete="CASCADE")),
    Column("categoria_id", Integer, ForeignKey("categorias.id", ondelete="CASCADE")),
)


class EstadoProductoEnum(str, enum.Enum):
    activo = "activo"
    inactivo = "inactivo"
    agotado = "agotado"


class TipoMediaEnum(str, enum.Enum):
    imagen = "imagen"
    modelo_3d = "modelo_3d"
    video = "video"


class Categoria(Base):
    __tablename__ = "categorias"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)
    descripcion = Column(Text, nullable=True)

    productos = relationship(
        "Producto", secondary=producto_categoria, back_populates="categorias"
    )


class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(255), nullable=False)
    descripcion = Column(Text, nullable=True)
    precio = Column(Float, nullable=False)
    estado = Column(
        Enum(EstadoProductoEnum), default=EstadoProductoEnum.activo, nullable=False
    )
    talla = Column(String(10), nullable=True)
    color = Column(String(50), nullable=True)
    stock = Column(Integer, default=0, nullable=False)
    creado_en = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    actualizado_en = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    empresa_id = Column(
        Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False
    )

    empresa = relationship("Empresa", back_populates="productos")
    categorias = relationship(
        "Categoria", secondary=producto_categoria, back_populates="productos"
    )
    media = relationship(
        "MediaArchivo", back_populates="producto", cascade="all, delete-orphan"
    )
    items_pedido = relationship("ItemPedido", back_populates="producto")


class MediaArchivo(Base):
    __tablename__ = "media_archivos"

    id = Column(Integer, primary_key=True, index=True)
    cloudinary_url = Column(String(500), nullable=False)
    cloudinary_public_id = Column(String(255), nullable=False)
    tipo = Column(Enum(TipoMediaEnum), nullable=False)
    formato = Column(String(20), nullable=True)
    producto_id = Column(
        Integer, ForeignKey("productos.id", ondelete="CASCADE"), nullable=False
    )

    producto = relationship("Producto", back_populates="media")
