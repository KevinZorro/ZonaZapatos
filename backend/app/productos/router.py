"""Productos router."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_rol
from app.productos.models import Producto, EstadoProductoEnum, Categoria
from app.productos.schemas import ProductoCreate, ProductoListResponse, ProductoOut, ProductoUpdate
from app.usuarios.models import Empresa

router = APIRouter(tags=["productos"])


# ── Helpers ───────────────────────────────────────────────────────────────────
def _get_empresa(user_id: int, db: Session) -> Empresa:
    empresa = db.query(Empresa).filter(Empresa.usuario_id == user_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    return empresa


def _get_producto_empresa(producto_id: int, empresa_id: int, db: Session) -> Producto:
    producto = db.query(Producto).filter(
        Producto.id == producto_id,
        Producto.empresa_id == empresa_id,
    ).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto


# ── Public catalog ────────────────────────────────────────────────────────────
@router.get("/productos", response_model=ProductoListResponse)
def list_productos(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str = Query(None),
    estado: str = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Producto)
    if q:
        query = query.filter(Producto.nombre.ilike(f"%{q}%"))
    if estado:
        try:
            query = query.filter(Producto.estado == EstadoProductoEnum(estado))
        except ValueError:
            pass
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return ProductoListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[ProductoOut.from_orm_with_empresa(p) for p in items],
    )


@router.get("/productos/{producto_id}", response_model=ProductoOut)
def get_producto(producto_id: int, db: Session = Depends(get_db)):
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return ProductoOut.from_orm_with_empresa(producto)


# ── Empresa — lista propia ────────────────────────────────────────────────────
@router.get(
    "/empresa/productos",
    response_model=ProductoListResponse,
    dependencies=[Depends(require_rol("empresa"))],
)
def list_mis_productos(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str = Query(None),
    estado: str = Query(None),
    payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    empresa = _get_empresa(int(payload["sub"]), db)
    query = db.query(Producto).filter(Producto.empresa_id == empresa.id)
    if q:
        query = query.filter(Producto.nombre.ilike(f"%{q}%"))
    if estado:
        try:
            query = query.filter(Producto.estado == EstadoProductoEnum(estado))
        except ValueError:
            pass
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return ProductoListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[ProductoOut.from_orm_with_empresa(p) for p in items],
    )


# ── Empresa — crear ───────────────────────────────────────────────────────────
@router.post(
    "/empresa/productos",
    response_model=ProductoOut,
    status_code=status.HTTP_201_CREATED,
)
def create_producto(
    body: ProductoCreate,
    payload: dict = Depends(require_rol("empresa")),
    db: Session = Depends(get_db),
):
    empresa = _get_empresa(int(payload["sub"]), db)

    categorias = []
    if body.categoria_ids:
        categorias = db.query(Categoria).filter(Categoria.id.in_(body.categoria_ids)).all()

    producto = Producto(
        nombre=body.nombre,
        descripcion=body.descripcion,
        precio=body.precio,
        talla=body.talla,
        color=body.color,
        stock=body.stock,
        empresa_id=empresa.id,
        categorias=categorias,
    )
    db.add(producto)
    db.commit()
    db.refresh(producto)
    return ProductoOut.from_orm_with_empresa(producto)


# ── Empresa — editar ──────────────────────────────────────────────────────────
@router.put(
    "/empresa/productos/{producto_id}",
    response_model=ProductoOut,
)
def update_producto(
    producto_id: int,
    body: ProductoUpdate,
    payload: dict = Depends(require_rol("empresa")),
    db: Session = Depends(get_db),
):
    empresa = _get_empresa(int(payload["sub"]), db)
    producto = _get_producto_empresa(producto_id, empresa.id, db)

    if body.nombre is not None:
        producto.nombre = body.nombre
    if body.descripcion is not None:
        producto.descripcion = body.descripcion
    if body.precio is not None:
        producto.precio = body.precio
    if body.talla is not None:
        producto.talla = body.talla
    if body.color is not None:
        producto.color = body.color
    if body.stock is not None:
        producto.stock = body.stock
    if body.estado is not None:
        try:
            producto.estado = EstadoProductoEnum(body.estado)
        except ValueError:
            raise HTTPException(status_code=400, detail="Estado inválido")
    if body.categoria_ids is not None:
        producto.categorias = db.query(Categoria).filter(
            Categoria.id.in_(body.categoria_ids)
        ).all()

    db.commit()
    db.refresh(producto)
    return ProductoOut.from_orm_with_empresa(producto)


# ── Empresa — eliminar ────────────────────────────────────────────────────────
@router.delete(
    "/empresa/productos/{producto_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_producto(
    producto_id: int,
    payload: dict = Depends(require_rol("empresa")),
    db: Session = Depends(get_db),
):
    empresa = _get_empresa(int(payload["sub"]), db)
    producto = _get_producto_empresa(producto_id, empresa.id, db)
    db.delete(producto)
    db.commit()
