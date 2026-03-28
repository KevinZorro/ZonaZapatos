"""Encuestas module — EncuestaSatisfaccion ORM model."""
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class EncuestaSatisfaccion(Base):
    __tablename__ = "encuestas_satisfaccion"

    id = Column(Integer, primary_key=True, index=True)
    calificacion = Column(Integer, nullable=True)  # 1-5
    comentario = Column(Text, nullable=True)
    respondida = Column(Boolean, default=False, nullable=False)
    omitida = Column(Boolean, default=False, nullable=False)
    enviada_en = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    respondida_en = Column(DateTime(timezone=True), nullable=True)
    pedido_id = Column(
        Integer, ForeignKey("pedidos.id", ondelete="CASCADE"), unique=True, nullable=False
    )

    pedido = relationship("Pedido", back_populates="encuesta")
