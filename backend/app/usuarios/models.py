"""Usuarios module — User, Empresa, Cliente, Administrador ORM models."""
import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class RolEnum(str, enum.Enum):
    admin = "admin"
    empresa = "empresa"
    cliente = "cliente"


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    correo = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    rol = Column(Enum(RolEnum), nullable=False)
    cuenta_confirmada = Column(Boolean, default=False, nullable=False)
    creado_en = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    telefono = Column(String(20), nullable=True)

    # Polymorphic children
    empresa = relationship("Empresa", back_populates="usuario", uselist=False)
    cliente = relationship("Cliente", back_populates="usuario", uselist=False)
    administrador = relationship(
        "Administrador", back_populates="usuario", uselist=False
    )


class Administrador(Base):
    __tablename__ = "administradores"

    id = Column(Integer, primary_key=True)
    usuario_id = Column(
        Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), unique=True
    )
    usuario = relationship("Usuario", back_populates="administrador")


class Empresa(Base):
    __tablename__ = "empresas"

    id = Column(Integer, primary_key=True)
    usuario_id = Column(
        Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), unique=True
    )
    nombre = Column(String(255), nullable=False)
    nit = Column(String(20), unique=True, nullable=False)
    direccion = Column(String(255), nullable=True)
    ciudad = Column(String(100), nullable=True)
    logo_url = Column(String(500), nullable=True)
    whatsapp = Column(String(20), nullable=True)

    usuario = relationship("Usuario", back_populates="empresa")
    productos = relationship("Producto", back_populates="empresa")
    dashboards = relationship("DashboardVentas", back_populates="empresa")
    analisis = relationship("AnalisisDevolucion", back_populates="empresa")
    predicciones = relationship("PrediccionVentas", back_populates="empresa")


class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True)
    usuario_id = Column(
        Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), unique=True
    )
    nombre = Column(String(255), nullable=False)
    telefono = Column(String(20), nullable=True)
    direccion = Column(String(255), nullable=True)

    usuario = relationship("Usuario", back_populates="cliente")
    pedidos = relationship("Pedido", back_populates="cliente")
