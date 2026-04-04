"""Encuestas module — EncuestaSatisfaccion ORM model."""
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class EncuestaSatisfaccion(Base):
    """Modelo de encuesta de satisfacción post-entrega."""
    __tablename__ = "encuestas_satisfaccion"

    id = Column(Integer, primary_key=True, index=True)
    calificacion = Column(Integer, nullable=True)  # 1-5 estrellas
    comentario = Column(Text, nullable=True)  # Comentario del cliente
    respondida = Column(Boolean, default=False, nullable=False)  # Si fue respondida
    omitida = Column(Boolean, default=False, nullable=False)  # Si fue omitida
    motivo_omision = Column(String(255), nullable=True)  # Motivo de omisión
    enviada_en = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    respondida_en = Column(DateTime(timezone=True), nullable=True)  # Fecha de respuesta
    pedido_id = Column(
        Integer, ForeignKey("pedidos.id", ondelete="CASCADE"), unique=True, nullable=False
    )

    pedido = relationship("Pedido", back_populates="encuesta")