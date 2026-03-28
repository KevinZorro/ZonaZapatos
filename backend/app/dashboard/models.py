"""Dashboard, Analisis, Prediccion — ORM models (stubs ready for Phase 6/7)."""
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base


class DashboardVentas(Base):
    __tablename__ = "dashboard_ventas"

    id = Column(Integer, primary_key=True, index=True)
    periodo = Column(String(50), nullable=False)  # e.g. "2025-01"
    generado_en = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    ranking_mas_vendidos = Column(JSONB, nullable=True)
    ranking_menos_vendidos = Column(JSONB, nullable=True)
    ingresos_totales = Column(Float, nullable=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"))

    empresa = relationship("Empresa", back_populates="dashboards")


class AnalisisDevolucion(Base):
    __tablename__ = "analisis_devolucion"

    id = Column(Integer, primary_key=True, index=True)
    periodo = Column(String(50), nullable=False)
    generado_en = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    motivos_agrupados = Column(JSONB, nullable=True)
    datos_suficientes = Column(Boolean, default=False, nullable=False)
    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"))

    empresa = relationship("Empresa", back_populates="analisis")


class PrediccionVentas(Base):
    __tablename__ = "prediccion_ventas"

    id = Column(Integer, primary_key=True, index=True)
    unidades_predichas = Column(Float, nullable=True)
    intervalo_inferior = Column(Float, nullable=True)
    intervalo_superior = Column(Float, nullable=True)
    confiabilidad = Column(Float, nullable=True)
    generada_en = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    periodo_predicho = Column(String(50), nullable=True)
    datos_suficientes = Column(Boolean, default=False, nullable=False)
    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"))

    empresa = relationship("Empresa", back_populates="predicciones")
