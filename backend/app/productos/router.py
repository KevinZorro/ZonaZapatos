"""Productos router."""
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload, selectinload

from app.core.config import settings
from app.core.cloudinary_client import delete_file, is_cloudinary_configured, upload_file
from app.core.database import get_db
from app.core.security import get_current_user, require_rol
from app.productos.models import Categoria, EstadoProductoEnum, MediaArchivo, Producto, TipoMediaEnum
from app.productos.schemas import (
    ProductoCreate,
    ProductoListResponse,
    ProductoOut,
    ProductoUpdate,
    ProductoResumen,
    ResenaOut,
    ResenasSummary,
    OPCIONES_GARANTIA,
)
from app.usuarios.models import Empresa

router = APIRouter(tags=["productos"])


# ── Helpers ───────────────────────────────────────────────────────────────────
def _get_empresa(user_id: int, db: Session) -> Empresa:
    empresa = db.query(Empresa).filter(Empresa.usuario_id == user_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    return empresa


def _get_producto_empresa(producto_id: int, empresa_id: int, db: Session) -> Producto:
    producto = _producto_query_with_loaders(db).filter(
        Producto.id == producto_id,
        Producto.empresa_id == empresa_id,
    ).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto


def _fetch_resenas_stats(producto_ids: list[int], db: Session) -> dict[int, tuple[float, int]]:
    """Devuelve {producto_id: (promedio, total)} en UNA sola query agrupada."""
    if not producto_ids:
        return {}
    from app.encuestas.models import EncuestaSatisfaccion

    rows = (
        db.query(
            EncuestaSatisfaccion.producto_id,
            func.avg(EncuestaSatisfaccion.calificacion).label("promedio"),
            func.count(EncuestaSatisfaccion.id).label("total"),
        )
        .filter(
            EncuestaSatisfaccion.producto_id.in_(producto_ids),
            EncuestaSatisfaccion.respondida.is_(True),
        )
        .group_by(EncuestaSatisfaccion.producto_id)
        .all()
    )
    return {r.producto_id: (round(float(r.promedio), 1), int(r.total)) for r in rows}


def _serialize_producto(
    producto: Producto,
    db: Session = None,
    resenas_map: dict[int, tuple[float, int]] | None = None,
) -> ProductoOut:
    data = ProductoOut.model_validate(producto, from_attributes=True)
    data.empresa_nombre = producto.empresa.nombre if producto.empresa else None
    modelo_3d = next((media for media in producto.media if media.tipo == "modelo_3d"), None)
    data.modelo_3d_url = (
        modelo_3d.cloudinary_url
        if modelo_3d
        else settings.demo_model_3d_url
    )

    # Reseñas: si nos pasaron el map ya lo usamos (caso lista); si no, query individual (caso detalle)
    if resenas_map is not None:
        promedio, total = resenas_map.get(producto.id, (0, 0))
        data.promedio_resenas = promedio
        data.total_resenas = total
    elif db is not None:
        stats = _fetch_resenas_stats([producto.id], db)
        promedio, total = stats.get(producto.id, (0, 0))
        data.promedio_resenas = promedio
        data.total_resenas = total

    return data


def _producto_query_with_loaders(db: Session):
    """Query base con eager loading de las relaciones que la serialización necesita."""
    return (
        db.query(Producto)
        .options(
            selectinload(Producto.media),
            selectinload(Producto.categorias),
            joinedload(Producto.empresa),
        )
    )


def _ensure_cloudinary() -> None:
    if not is_cloudinary_configured():
        raise HTTPException(
            status_code=503,
            detail="Cloudinary no esta configurado para subir archivos de producto",
        )


def _get_media_kind(file: UploadFile) -> tuple[TipoMediaEnum, str | None]:
    extension = Path(file.filename or "").suffix.lower()
    content_type = file.content_type or ""

    if content_type.startswith("image/"):
        return TipoMediaEnum.imagen, extension.lstrip(".") or None

    if extension in {".glb", ".gltf"} or content_type in {
        "model/gltf-binary",
        "model/gltf+json",
        "application/octet-stream",
    }:
        return TipoMediaEnum.modelo_3d, extension.lstrip(".") or None

    raise HTTPException(
        status_code=400,
        detail=f"Archivo no soportado: {file.filename or 'sin_nombre'}",
    )

@router.get("/categorias")
def list_categorias(response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = "public, max-age=300"
    return db.query(Categoria).all()


@router.get("/opciones-garantia")
def get_opciones_garantia():
    """Opciones predefinidas de días de garantía para el selector en el frontend."""
    return OPCIONES_GARANTIA


@router.get("/empresas-publicas")
def list_empresas_publicas(response: Response, db: Session = Depends(get_db)):
    """Listado ligero (id + nombre) de empresas con al menos un producto.

    Reemplaza el truco antiguo del frontend de pedir /productos?page_size=100
    solo para extraer empresas únicas (que disparaba ~300 queries por N+1).
    """
    rows = (
        db.query(Empresa.id, Empresa.nombre)
        .join(Producto, Producto.empresa_id == Empresa.id)
        .distinct()
        .order_by(Empresa.nombre)
        .all()
    )
    response.headers["Cache-Control"] = "public, max-age=300"
    return [{"id": r.id, "nombre": r.nombre} for r in rows]
    
# ── Public catalog ────────────────────────────────────────────────────────────
@router.get("/productos", response_model=ProductoListResponse)
def list_productos(
    response: Response,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str = Query(None),
    estado: str = Query(None),
    empresa_id: int = Query(None),
    categoria_id: int = Query(None),
    precio_min: float = Query(None),
    precio_max: float = Query(None),
    talla: str = Query(None),
    db: Session = Depends(get_db),
):
    query = _producto_query_with_loaders(db)
    if q:
        query = query.filter(Producto.nombre.ilike(f"%{q}%"))
    if estado:
        try:
            query = query.filter(Producto.estado == EstadoProductoEnum(estado))
        except ValueError:
            pass
    if empresa_id:
        query = query.filter(Producto.empresa_id == empresa_id)
    if categoria_id:
        query = query.filter(Producto.categorias.any(Categoria.id == categoria_id))
    if precio_min is not None:
        query = query.filter(Producto.precio >= precio_min)
    if precio_max is not None:
        query = query.filter(Producto.precio <= precio_max)
    if talla:
        query = query.filter(Producto.talla.ilike(f"%{talla}%"))

    # total NO debe arrastrar los joinedload/selectinload → contamos sobre query simple
    total = query.with_entities(func.count(Producto.id)).order_by(None).scalar()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    # Reseñas en una sola query agrupada
    resenas_map = _fetch_resenas_stats([p.id for p in items], db)

    # Cache corto para el catálogo público
    response.headers["Cache-Control"] = "public, max-age=30, stale-while-revalidate=60"

    return ProductoListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[_serialize_producto(p, db, resenas_map=resenas_map) for p in items],
    )


@router.get("/productos/{producto_id}", response_model=ProductoOut)
def get_producto(
    producto_id: int,
    db: Session = Depends(get_db),
):
    producto = _producto_query_with_loaders(db).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return _serialize_producto(producto, db)


@router.get("/productos/{producto_id}/resenas", response_model=ResenasSummary)
def get_producto_resenas(
    producto_id: int,
    db: Session = Depends(get_db),
):
    """Obtiene las reseñas (encuestas respondidas) de un producto."""
    from app.encuestas.models import EncuestaSatisfaccion
    from app.pedidos.models import Pedido
    from app.usuarios.models import Cliente
    from sqlalchemy.orm import joinedload

    # Verificar que el producto existe
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    # Obtener encuestas respondidas para este producto con info del cliente
    encuestas = (
        db.query(EncuestaSatisfaccion)
        .options(
            joinedload(EncuestaSatisfaccion.pedido)
            .joinedload(Pedido.cliente)
            .joinedload(Cliente.usuario)
        )
        .filter(
            EncuestaSatisfaccion.producto_id == producto_id,
            EncuestaSatisfaccion.respondida == True,
        )
        .order_by(EncuestaSatisfaccion.respondida_en.desc())
        .all()
    )

    if not encuestas:
        return ResenasSummary(
            promedio=0.0,
            total=0,
            distribucion={1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
            resenas=[],
        )

    # Calcular estadísticas — castear a int/float para evitar warnings de Decimal
    calificaciones = [int(e.calificacion) for e in encuestas]
    promedio = sum(calificaciones) / len(calificaciones)

    distribucion = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for c in calificaciones:
        if c in distribucion:
            distribucion[c] += 1

    resenas = []
    for e in encuestas:
        cliente_data = None
        if e.pedido and e.pedido.cliente:
            cliente = e.pedido.cliente
            avatar_url = None
            if cliente.usuario:
                avatar_url = cliente.usuario.foto_url
            cliente_data = {
                "id": cliente.id,
                "nombre": cliente.nombre,
                "avatar_url": avatar_url,
                "inicial": cliente.nombre[0].upper() if cliente.nombre else "?"
            }

        resenas.append(
            ResenaOut(
                id=e.id,
                calificacion=int(e.calificacion),
                comentario=e.comentario,
                respondida_en=e.respondida_en.isoformat() if e.respondida_en else None,
                pedido_id=e.pedido_id,
                cliente_id=cliente.id if cliente else None,
                cliente=cliente_data,
            )
        )

    return ResenasSummary(
        promedio=round(float(promedio), 1),
        total=len(encuestas),
        distribucion=distribucion,
        resenas=resenas,
    )


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
    query = _producto_query_with_loaders(db).filter(Producto.empresa_id == empresa.id)
    if q:
        query = query.filter(Producto.nombre.ilike(f"%{q}%"))
    if estado:
        try:
            query = query.filter(Producto.estado == EstadoProductoEnum(estado))
        except ValueError:
            pass
    total = query.with_entities(func.count(Producto.id)).order_by(None).scalar()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    resenas_map = _fetch_resenas_stats([p.id for p in items], db)
    return ProductoListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[_serialize_producto(p, db, resenas_map=resenas_map) for p in items],
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
        dias_garantia=body.dias_garantia,
        empresa_id=empresa.id,
        categorias=categorias,
    )
    db.add(producto)
    db.commit()
    db.refresh(producto)
    return _serialize_producto(producto, db)


@router.post(
    "/empresa/productos/{producto_id}/media",
    response_model=ProductoOut,
)
def upload_producto_media(
    producto_id: int,
    files: list[UploadFile] = File(...),
    payload: dict = Depends(require_rol("empresa")),
    db: Session = Depends(get_db),
):
    if not files:
        raise HTTPException(status_code=400, detail="Debes seleccionar al menos un archivo")

    _ensure_cloudinary()

    empresa = _get_empresa(int(payload["sub"]), db)
    producto = _get_producto_empresa(producto_id, empresa.id, db)

    MAX_SIZE = 10 * 1024 * 1024  # 10 MB
    for file in files:
        # Leer contenido para verificar tamaño antes de subir
        contents = file.file.read()
        if len(contents) > MAX_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f'El archivo "{file.filename}" supera el límite de 10 MB ({len(contents) // (1024*1024)} MB). Usa una imagen más pequeña.'
            )
        file.file.seek(0)  # Resetear cursor para que Cloudinary pueda leerlo
        tipo, formato = _get_media_kind(file)
        result = upload_file(file.file, folder=f"productos/{empresa.id}/{producto.id}")
        producto.media.append(
            MediaArchivo(
                cloudinary_url=result["cloudinary_url"],
                cloudinary_public_id=result["cloudinary_public_id"],
                tipo=tipo,
                formato=formato,
            )
        )

    db.commit()
    db.refresh(producto)
    return _serialize_producto(producto, db)


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
    if body.dias_garantia is not None:
        producto.dias_garantia = body.dias_garantia
    if body.categoria_ids is not None:
        producto.categorias = db.query(Categoria).filter(
            Categoria.id.in_(body.categoria_ids)
        ).all()

    db.commit()
    db.refresh(producto)
    return _serialize_producto(producto, db)


@router.delete(
    "/empresa/productos/{producto_id}/media/{media_id}",
    response_model=ProductoOut,
)
def delete_producto_media(
    producto_id: int,
    media_id: int,
    payload: dict = Depends(require_rol("empresa")),
    db: Session = Depends(get_db),
):
    empresa = _get_empresa(int(payload["sub"]), db)
    producto = _get_producto_empresa(producto_id, empresa.id, db)
    media = next((item for item in producto.media if item.id == media_id), None)

    if not media:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    if media.cloudinary_public_id:
        try:
            delete_file(media.cloudinary_public_id)
        except Exception:
            pass

    db.delete(media)
    db.commit()
    db.refresh(producto)
    return _serialize_producto(producto, db)


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

    for media in producto.media:
        if media.cloudinary_public_id:
            try:
                delete_file(media.cloudinary_public_id)
            except Exception:
                pass

    db.delete(producto)
    db.commit()
