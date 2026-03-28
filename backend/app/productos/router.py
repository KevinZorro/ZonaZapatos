"""Productos router — stub endpoints ready for Phase 2 & 3."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_rol
from app.productos.models import Producto
from app.productos.schemas import ProductoCreate, ProductoListResponse, ProductoOut, ProductoUpdate

router = APIRouter(tags=["productos"])


# ── Public catalog (Phase 2) ─────────────────────────────────────────────────
@router.get("/productos", response_model=ProductoListResponse)
def list_productos(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Paginated public catalog."""
    offset = (page - 1) * page_size
    total = db.query(Producto).count()
    items = db.query(Producto).offset(offset).limit(page_size).all()
    return ProductoListResponse(total=total, page=page, page_size=page_size, items=items)


@router.get("/productos/{producto_id}", response_model=ProductoOut)
def get_producto(producto_id: int, db: Session = Depends(get_db)):
    """Get a single product detail."""
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto


# ── Empresa management (Phase 3) ─────────────────────────────────────────────
@router.post(
    "/empresa/productos",
    response_model=ProductoOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_rol("empresa"))],
)
def create_producto(body: ProductoCreate, db: Session = Depends(get_db)):
    """Create a product. (Phase 3 implementation)"""
    raise HTTPException(status_code=501, detail="Implementación pendiente — Fase 3")


@router.put(
    "/empresa/productos/{producto_id}",
    response_model=ProductoOut,
    dependencies=[Depends(require_rol("empresa"))],
)
def update_producto(
    producto_id: int, body: ProductoUpdate, db: Session = Depends(get_db)
):
    """Update a product. (Phase 3 implementation)"""
    raise HTTPException(status_code=501, detail="Implementación pendiente — Fase 3")


@router.delete(
    "/empresa/productos/{producto_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_rol("empresa"))],
)
def delete_producto(producto_id: int, db: Session = Depends(get_db)):
    """Delete a product. (Phase 3 implementation)"""
    raise HTTPException(status_code=501, detail="Implementación pendiente — Fase 3")
