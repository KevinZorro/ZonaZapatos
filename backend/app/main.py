"""
Zapatos Backend — FastAPI Application Entry Point
TechSketch Labs / AGI — 2025
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import Base, engine

# ── Import routers ────────────────────────────────────────────────────────────
from app.auth.router import router as auth_router
from app.usuarios.router import router as usuarios_router
from app.productos.router import router as productos_router
from app.pedidos.router import router as pedidos_router
from app.encuestas.router import router as encuestas_router
from app.dashboard.router import router as dashboard_router

# ── Import all models so Alembic autogenerate picks them up ──────────────────
from app.usuarios.models import Usuario, Empresa, Cliente, Administrador  # noqa: F401
from app.productos.models import Producto, Categoria, MediaArchivo  # noqa: F401
from app.pedidos.models import Pedido, ItemPedido  # noqa: F401
from app.devoluciones.models import Devolucion, EvidenciaDevolucion  # noqa: F401
from app.encuestas.models import EncuestaSatisfaccion  # noqa: F401
from app.dashboard.models import (  # noqa: F401
    DashboardVentas,
    AnalisisDevolucion,
    PrediccionVentas,
)

# ── App factory ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Zapatos Artesanales Cúcuta — API",
    description="Backend for digitizing artisan shoe sales in Cúcuta, Colombia.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://192.168.101.3:5173",
    settings.frontend_url,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static files ──────────────────────────────────────────────────────────────
app.mount("/static", StaticFiles(directory="static"), name="static")

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(usuarios_router)
app.include_router(productos_router)
app.include_router(pedidos_router)
app.include_router(encuestas_router)
app.include_router(dashboard_router)


# ── Crear tablas al arrancar (desarrollo) ────────────────────────────────────
@app.on_event("startup")
def create_tables():
    Base.metadata.create_all(bind=engine)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/", tags=["health"])
async def root():
    return {"status": "ok", "message": "Zapatos Backend funcionando 🥿"}


@app.get("/health", tags=["health"])
async def health():
    return {"status": "healthy"}
