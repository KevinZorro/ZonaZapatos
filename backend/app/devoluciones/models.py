"""Devoluciones module — Devolucion, EvidenciaDevolucion ORM models."""
import enum
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class EstadoDevolucionEnum(str, enum.Enum):
    solicitada = "solicitada"
    en_revision = "en_revision"
    aprobada = "aprobada"
    rechazada = "rechazada"


class TipoArchivoEnum(str, enum.Enum):
    imagen = "imagen"
    video = "video"


class Devolucion(Base):
    __tablename__ = "devoluciones"

    id = Column(Integer, primary_key=True, index=True)
    motivo = Column(String(255), nullable=False)
    comentario = Column(Text, nullable=True)
    respuesta_empresa = Column(Text, nullable=True)  # Respuesta de la empresa al aprobar/rechazar
    estado = Column(
        Enum(EstadoDevolucionEnum),
        default=EstadoDevolucionEnum.solicitada,
        nullable=False,
    )
    fecha_solicitud = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    pedido_id = Column(
        Integer, ForeignKey("pedidos.id", ondelete="CASCADE"), unique=True, nullable=False
    )

    pedido = relationship("Pedido", back_populates="devolucion")
    evidencias = relationship(
        "EvidenciaDevolucion", back_populates="devolucion", cascade="all, delete-orphan"
    )
    items = relationship(
        "ItemDevolucion", back_populates="devolucion", cascade="all, delete-orphan"
    )


class EvidenciaDevolucion(Base):
    __tablename__ = "evidencias_devolucion"

    id = Column(Integer, primary_key=True, index=True)
    cloudinary_url = Column(String(500), nullable=False)
    cloudinary_public_id = Column(String(255), nullable=False)
    tipo_archivo = Column(Enum(TipoArchivoEnum), nullable=False)
    devolucion_id = Column(
        Integer, ForeignKey("devoluciones.id", ondelete="CASCADE"), nullable=False
    )

    devolucion = relationship("Devolucion", back_populates="evidencias")


class ItemDevolucion(Base):
    """Items específicos de un pedido que se devuelven (cada producto con su motivo)."""
    __tablename__ = "devolucion_items"

    id = Column(Integer, primary_key=True, index=True)
    devolucion_id = Column(
        Integer, ForeignKey("devoluciones.id", ondelete="CASCADE"), nullable=False
    )
    item_pedido_id = Column(
        Integer, ForeignKey("items_pedido.id"), nullable=True
    )
    producto_id = Column(
        Integer, ForeignKey("productos.id"), nullable=False
    )

    # Snapshot inmutable del producto (copia de los datos al momento de la compra)
    producto_nombre = Column(String(255), nullable=False)
    producto_sku = Column(String(100), nullable=True)
    producto_imagen_url = Column(String(500), nullable=True)

    cantidad = Column(Integer, nullable=False, default=1)
    motivo = Column(String(255), nullable=False)  # Motivo específico para este item
    comentario = Column(Text, nullable=True)  # Comentario específico para este item

    devolucion = relationship("Devolucion", back_populates="items")
    producto = relationship("Producto")
    item_pedido = relationship("ItemPedido")
