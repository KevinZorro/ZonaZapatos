"""Pedidos module — Pedido, ItemPedido ORM models."""
import enum
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class EstadoPedidoEnum(str, enum.Enum):
    pendiente = "pendiente"
    confirmado = "confirmado"
    enviado = "enviado"
    entregado = "entregado"
    cancelado = "cancelado"


class CanalContactoEnum(str, enum.Enum):
    whatsapp = "whatsapp"
    web = "web"
    telefono = "telefono"


class Pedido(Base):
    __tablename__ = "pedidos"

    id = Column(Integer, primary_key=True, index=True)
    estado = Column(
        Enum(EstadoPedidoEnum),
        default=EstadoPedidoEnum.pendiente,
        nullable=False,
    )
    fecha_pedido = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    fecha_entrega = Column(DateTime(timezone=True), nullable=True)
    total = Column(Float, nullable=False)
    canal_contacto = Column(
        Enum(CanalContactoEnum),
        default=CanalContactoEnum.web,
        nullable=False,
    )
    cliente_id = Column(
        Integer, ForeignKey("clientes.id", ondelete="CASCADE"), nullable=False
    )

    cliente = relationship("Cliente", back_populates="pedidos")
    items = relationship(
        "ItemPedido", back_populates="pedido", cascade="all, delete-orphan"
    )
    devolucion = relationship("Devolucion", back_populates="pedido", uselist=False)
    encuesta = relationship(
        "EncuestaSatisfaccion", back_populates="pedido", uselist=False
    )


class ItemPedido(Base):
    __tablename__ = "items_pedido"

    id = Column(Integer, primary_key=True, index=True)
    cantidad = Column(Integer, nullable=False)
    precio_unitario = Column(Float, nullable=False)
    pedido_id = Column(
        Integer, ForeignKey("pedidos.id", ondelete="CASCADE"), nullable=False
    )
    producto_id = Column(
        Integer, ForeignKey("productos.id", ondelete="SET NULL"), nullable=True
    )

    pedido = relationship("Pedido", back_populates="items")
    producto = relationship("Producto", back_populates="items_pedido")
