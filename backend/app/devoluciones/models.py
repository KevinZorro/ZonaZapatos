"""Devoluciones module — Devolucion, EvidenciaDevolucion ORM models."""
import enum
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class EstadoDevolucionEnum(str, enum.Enum):
    """Estados posibles de una devolución."""
    solicitada = "solicitada"
    en_revision = "en_revision"
    aprobada = "aprobada"
    rechazada = "rechazada"


class TipoArchivoEnum(str, enum.Enum):
    """Tipos de archivo soportados para evidencias."""
    imagen = "imagen"
    video = "video"


class Devolucion(Base):
    """Modelo de devolución de pedidos."""
    __tablename__ = "devoluciones"

    id = Column(Integer, primary_key=True, index=True)
    motivo = Column(String(255), nullable=False)
    descripcion = Column(Text, nullable=True)  # Descripción detallada
    comentario = Column(Text, nullable=True)  # Alias para descripcion (compatibilidad)
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
    fecha_resolucion = Column(DateTime(timezone=True), nullable=True)
    pedido_id = Column(
        Integer, ForeignKey("pedidos.id", ondelete="CASCADE"), unique=True, nullable=False
    )

    pedido = relationship("Pedido", back_populates="devolucion")
    evidencias = relationship(
        "EvidenciaDevolucion", back_populates="devolucion", cascade="all, delete-orphan"
    )


class EvidenciaDevolucion(Base):
    """Modelo para evidencias (imágenes/videos) de una devolución."""
    __tablename__ = "evidencias_devolucion"

    id = Column(Integer, primary_key=True, index=True)
    cloudinary_url = Column(String(500), nullable=False)
    cloudinary_public_id = Column(String(255), nullable=False)
    tipo_archivo = Column(Enum(TipoArchivoEnum), nullable=False)
    devolucion_id = Column(
        Integer, ForeignKey("devoluciones.id", ondelete="CASCADE"), nullable=False
    )

    devolucion = relationship("Devolucion", back_populates="evidencias")