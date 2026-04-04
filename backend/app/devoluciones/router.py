"""Devoluciones router — endpoints para gestión de devoluciones."""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_rol
from app.devoluciones.models import Devolucion, EstadoDevolucionEnum, EvidenciaDevolucion
from app.devoluciones.schemas import (
    DevolucionCreate,
    DevolucionEstadoUpdate,
    DevolucionListResponse,
    DevolucionOut,
    DevolucionUpdate,
)
from app.pedidos.models import Pedido, EstadoPedidoEnum
from app.usuarios.models import Cliente

router = APIRouter(prefix="/devoluciones", tags=["devoluciones"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_pedido_by_id(pedido_id: int, db: Session) -> Pedido:
    """Obtiene un pedido por su ID."""
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El pedido con ID {pedido_id} no existe"
        )
    return pedido


def _get_devolucion_by_id(devolucion_id: int, db: Session) -> Devolucion:
    """Obtiene una devolución por su ID."""
    devolucion = db.query(Devolucion).filter(Devolucion.id == devolucion_id).first()
    if not devolucion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"La devolución con ID {devolucion_id} no existe"
        )
    return devolucion


def _get_cliente_by_user_id(user_id: int, db: Session) -> Cliente:
    """Obtiene el cliente asociado a un usuario."""
    cliente = db.query(Cliente).filter(Cliente.usuario_id == user_id).first()
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró un cliente asociado a este usuario"
        )
    return cliente


def _validate_pedido_belongs_to_cliente(pedido: Pedido, cliente: Cliente) -> None:
    """Valida que un pedido pertenezca al cliente."""
    if pedido.cliente_id != cliente.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para gestionar devoluciones de este pedido"
        )


def _validate_pedido_elegible_para_devolucion(pedido: Pedido) -> None:
    """Valida que un pedido esté en estado elegible para devolución (entregado)."""
    if pedido.estado != EstadoPedidoEnum.entregado:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se pueden devolver pedidos en estado 'entregado'. "
                   "El pedido debe haber sido recibido por el cliente."
        )


def _check_pedido_has_devolucion(pedido_id: int, db: Session) -> None:
    """Verifica si un pedido ya tiene una devolución."""
    existing = db.query(Devolucion).filter(Devolucion.pedido_id == pedido_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este pedido ya tiene una devolución registrada"
        )


def _serialize_devolucion(devolucion: Devolucion) -> DevolucionOut:
    """Serializa una devolución a su schema de salida."""
    return DevolucionOut(
        id=devolucion.id,
        motivo=devolucion.motivo,
        comentario=devolucion.comentario,
        estado=devolucion.estado.value,
        fecha_solicitud=devolucion.fecha_solicitud,
        pedido_id=devolucion.pedido_id,
        evidencias=[
            {
                "id": e.id,
                "cloudinary_url": e.cloudinary_url,
                "cloudinary_public_id": e.cloudinary_public_id,
                "tipo_archivo": e.tipo_archivo.value,
                "devolucion_id": e.devolucion_id,
            }
            for e in devolucion.evidencias
        ]
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=DevolucionOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_rol("cliente"))],
    summary="Crear una nueva devolución",
    description="Crea una solicitud de devolución para un pedido. Solo el cliente propietario del pedido puede solicitar la devolución."
)
def create_devolucion(
    body: DevolucionCreate,
    payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Crea una nueva devolución para un pedido.
    
    - **pedido_id**: ID del pedido a devolver
    - **motivo**: Razón principal de la devolución
    - **comentario**: Descripción opcional detallada
    """
    # Obtener el cliente actual
    cliente = _get_cliente_by_user_id(int(payload["sub"]), db)
    
    # Obtener y validar el pedido
    pedido = _get_pedido_by_id(body.pedido_id, db)
    
    # Validar que el pedido pertenece al cliente
    _validate_pedido_belongs_to_cliente(pedido, cliente)
    
    # Validar que el pedido esté en estado elegible para devolución
    _validate_pedido_elegible_para_devolucion(pedido)
    
    # Validar que no exista ya una devolución para este pedido
    _check_pedido_has_devolucion(body.pedido_id, db)
    
    # Crear la devolución
    devolucion = Devolucion(
        motivo=body.motivo,
        descripcion=body.comentario,
        comentario=body.comentario,  # Mantener compatibilidad
        estado=EstadoDevolucionEnum.solicitada,
        pedido_id=body.pedido_id,
        fecha_solicitud=datetime.now(timezone.utc),
    )
    
    db.add(devolucion)
    db.commit()
    db.refresh(devolucion)
    
    return _serialize_devolucion(devolucion)


@router.get(
    "/{devolucion_id}",
    response_model=DevolucionOut,
    summary="Obtener detalles de una devolución",
    description="Obtiene los detalles completos de una devolución específica."
)
def get_devolucion(
    devolucion_id: int,
    db: Session = Depends(get_db),
):
    """
    Obtiene los detalles de una devolución por su ID.
    
    - **devolucion_id**: ID de la devolución
    """
    devolucion = _get_devolucion_by_id(devolucion_id, db)
    return _serialize_devolucion(devolucion)


@router.get(
    "",
    response_model=DevolucionListResponse,
    summary="Listar devoluciones con paginación y filtros",
    description="Lista todas las devoluciones con opciones de paginación y filtrado por estado."
)
def list_devoluciones(
    page: int = Query(1, ge=1, description="Número de página"),
    page_size: int = Query(20, ge=1, le=100, description="Elementos por página"),
    estado: Optional[str] = Query(None, description="Filtrar por estado de devolución"),
    db: Session = Depends(get_db),
):
    """
    Lista devoluciones con paginación y filtros opcionales.
    
    - **page**: Número de página (default: 1)
    - **page_size**: Elementos por página (default: 20, max: 100)
    - **estado**: Filtrar por estado (solicitada, en_revision, aprobada, rechazada)
    """
    query = db.query(Devolucion)
    
    # Aplicar filtro por estado si se proporciona
    if estado:
        try:
            estado_enum = EstadoDevolucionEnum(estado)
            query = query.filter(Devolucion.estado == estado_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Estado inválido. Valores permitidos: {[e.value for e in EstadoDevolucionEnum]}"
            )
    
    # Obtener total y aplicar paginación
    total = query.count()
    devoluciones = query.offset((page - 1) * page_size).limit(page_size).all()
    
    return DevolucionListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[_serialize_devolucion(d) for d in devoluciones]
    )


@router.get(
    "/pedido/{pedido_id}",
    response_model=DevolucionOut | None,
    summary="Obtener devolución de un pedido",
    description="Obtiene la devolución asociada a un pedido específico, si existe."
)
def get_devolucion_by_pedido(
    pedido_id: int,
    db: Session = Depends(get_db),
):
    """
    Obtiene la devolución de un pedido específico.
    
    - **pedido_id**: ID del pedido
    """
    # Verificar que el pedido existe
    _get_pedido_by_id(pedido_id, db)
    
    devolucion = db.query(Devolucion).filter(Devolucion.pedido_id == pedido_id).first()
    
    if not devolucion:
        return None
    
    return _serialize_devolucion(devolucion)


@router.put(
    "/{devolucion_id}",
    response_model=DevolucionOut,
    dependencies=[Depends(require_rol("cliente"))],
    summary="Actualizar una devolución",
    description="Actualiza los datos de una devolución (motivo y comentario). Solo el cliente propietario puede editar."
)
def update_devolucion(
    devolucion_id: int,
    body: DevolucionUpdate,
    payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Actualiza una devolución existente.
    
    - **devolucion_id**: ID de la devolución a actualizar
    - **motivo**: Nuevo motivo (opcional)
    - **comentario**: Nuevo comentario (opcional)
    """
    devolucion = _get_devolucion_by_id(devolucion_id, db)
    cliente = _get_cliente_by_user_id(int(payload["sub"]), db)
    
    # Obtener el pedido asociado
    pedido = _get_pedido_by_id(devolucion.pedido_id, db)
    
    # Validar que el cliente es el propietario del pedido
    _validate_pedido_belongs_to_cliente(pedido, cliente)
    
    # Solo se puede editar si está en estado "solicitada"
    if devolucion.estado != EstadoDevolucionEnum.solicitada:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se pueden editar devoluciones en estado 'solicitada'"
        )
    
    # Actualizar campos
    if body.motivo is not None:
        devolucion.motivo = body.motivo
    if body.comentario is not None:
        devolucion.descripcion = body.comentario
        devolucion.comentario = body.comentario
    
    db.commit()
    db.refresh(devolucion)
    
    return _serialize_devolucion(devolucion)


@router.put(
    "/{devolucion_id}/estado",
    response_model=DevolucionOut,
    dependencies=[Depends(require_rol("empresa", "admin"))],
    summary="Actualizar estado de una devolución",
    description="Cambia el estado de una devolución. Solo empresas y administradores pueden realizar esta acción."
)
def update_devolucion_estado(
    devolucion_id: int,
    body: DevolucionEstadoUpdate,
    db: Session = Depends(get_db),
):
    """
    Actualiza el estado de una devolución.
    
    - **devolucion_id**: ID de la devolución
    - **estado**: Nuevo estado (solicitada, en_revision, aprobada, rechazada)
    """
    devolucion = _get_devolucion_by_id(devolucion_id, db)
    
    # Validar el nuevo estado
    try:
        nuevo_estado = EstadoDevolucionEnum(body.estado)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Estado inválido. Valores permitidos: {[e.value for e in EstadoDevolucionEnum]}"
        )
    
    # Actualizar estado
    devolucion.estado = nuevo_estado
    
    # Si el estado es aprobada o rechazada, registrar fecha de resolución
    if nuevo_estado in [EstadoDevolucionEnum.aprobada, EstadoDevolucionEnum.rechazada]:
        devolucion.fecha_resolucion = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(devolucion)
    
    return _serialize_devolucion(devolucion)


@router.delete(
    "/{devolucion_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_rol("cliente"))],
    summary="Eliminar una devolución",
    description="Elimina una devolución. Solo el cliente propietario puede eliminar su propia devolución."
)
def delete_devolucion(
    devolucion_id: int,
    payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Elimina una devolución existente.
    
    - **devolucion_id**: ID de la devolución a eliminar
    """
    devolucion = _get_devolucion_by_id(devolucion_id, db)
    cliente = _get_cliente_by_user_id(int(payload["sub"]), db)
    
    # Obtener el pedido asociado
    pedido = _get_pedido_by_id(devolucion.pedido_id, db)
    
    # Validar que el cliente es el propietario del pedido
    _validate_pedido_belongs_to_cliente(pedido, cliente)
    
    # Solo se puede eliminar si está en estado "solicitada"
    if devolucion.estado != EstadoDevolucionEnum.solicitada:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se pueden eliminar devoluciones en estado 'solicitada'"
        )
    
    db.delete(devolucion)
    db.commit()
    
    return None