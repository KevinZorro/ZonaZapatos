"""Encuestas module — EncuestaSatisfaccion ORM model."""
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base


class EncuestaSatisfaccion(Base):
    __tablename__ = "encuestas_satisfaccion"

    # Constraint único por combinación pedido + producto
    __table_args__ = (
        UniqueConstraint('pedido_id', 'producto_id', name='unique_pedido_producto'),
    )

    id = Column(Integer, primary_key=True, index=True)
    calificacion = Column(Integer, nullable=True)  # 1-5
    comentario = Column(Text, nullable=True)
    respondida = Column(Boolean, default=False, nullable=False)
    omitida = Column(Boolean, default=False, nullable=False)
    recordatorio_activo = Column(Boolean, default=False, nullable=False)
    enviada_en = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    respondida_en = Column(DateTime(timezone=True), nullable=True)
    pedido_id = Column(
        Integer, ForeignKey("pedidos.id", ondelete="CASCADE"), nullable=False
    )
    producto_id = Column(
        Integer, ForeignKey("productos.id", ondelete="SET NULL"), nullable=False
    )

    pedido = relationship("Pedido", back_populates="encuesta")
    producto = relationship("Producto", back_populates="encuestas")
