"""Encuestas router — endpoints para gestión de encuestas de satisfacción."""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_rol
from app.encuestas.models import EncuestaSatisfaccion
from app.encuestas.schemas import (
    EncuestaCreate,
    EncuestaEstadisticas,
    EncuestaListResponse,
    EncuestaOmitir,
    EncuestaOut,
    EncuestaResponder,
)
from app.pedidos.models import Pedido, EstadoPedidoEnum
from app.usuarios.models import Cliente

router = APIRouter(prefix="/encuestas", tags=["encuestas"])


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


def _get_encuesta_by_id(encuesta_id: int, db: Session) -> EncuestaSatisfaccion:
    """Obtiene una encuesta por su ID."""
    encuesta = db.query(EncuestaSatisfaccion).filter(EncuestaSatisfaccion.id == encuesta_id).first()
    if not encuesta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"La encuesta con ID {encuesta_id} no existe"
        )
    return encuesta


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
            detail="No tienes permiso para encuestar este pedido"
        )


def _validate_pedido_entregado(pedido: Pedido) -> None:
    """Valida que un pedido esté entregado para poder ser encuestado."""
    if pedido.estado != EstadoPedidoEnum.entregado:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se pueden encuestar pedidos en estado 'entregado'"
        )


def _check_pedido_has_encuesta(pedido_id: int, db: Session) -> None:
    """Verifica si un pedido ya tiene una encuesta."""
    existing = db.query(EncuestaSatisfaccion).filter(
        EncuestaSatisfaccion.pedido_id == pedido_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este pedido ya tiene una encuesta registrada"
        )


def _serialize_encuesta(encuesta: EncuestaSatisfaccion) -> EncuestaOut:
    """Serializa una encuesta a su schema de salida."""
    return EncuestaOut(
        id=encuesta.id,
        calificacion=encuesta.calificacion,
        comentario=encuesta.comentario,
        respondida=encuesta.respondida,
        omitida=encuesta.omitida,
        enviada_en=encuesta.enviada_en,
        respondida_en=encuesta.respondida_en,
        pedido_id=encuesta.pedido_id,
    )


# ── Endpoints para Clientes ──────────────────────────────────────────────────

@router.get(
    "/mis-pendientes",
    response_model=list[EncuestaOut],
    dependencies=[Depends(require_rol("cliente"))],
    summary="Obtener encuestas pendientes del cliente",
    description="Lista las encuestas pendientes de los pedidos del cliente actual."
)
def get_mis_encuestas_pendientes(
    payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Obtiene las encuestas pendientes del cliente actual.
    
    Retorna las encuestas de pedidos entregados que aún no han sido respondidas ni omitidas.
    """
    cliente = _get_cliente_by_user_id(int(payload["sub"]), db)
    
    # Buscar pedidos entregados del cliente que no tengan encuesta respondida/omitida
    pedidos_elegibles = (
        db.query(Pedido)
        .filter(
            Pedido.cliente_id == cliente.id,
            Pedido.estado == EstadoPedidoEnum.entregado,
        )
        .all()
    )
    
    encuestas_pendientes = []
    for pedido in pedidos_elegibles:
        encuesta = db.query(EncuestaSatisfaccion).filter(
            EncuestaSatisfaccion.pedido_id == pedido.id,
            EncuestaSatisfaccion.respondida == False,
            EncuestaSatisfaccion.omitida == False,
        ).first()
        
        if encuesta:
            encuestas_pendientes.append(_serialize_encuesta(encuesta))
    
    return encuestas_pendientes


@router.get(
    "/pedido/{pedido_id}",
    response_model=EncuestaOut | None,
    dependencies=[Depends(require_rol("cliente"))],
    summary="Obtener encuesta de un pedido específico",
    description="Obtiene la encuesta asociada a un pedido del cliente."
)
def get_encuesta_by_pedido(
    pedido_id: int,
    payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Obtiene la encuesta de un pedido específico.
    
    - **pedido_id**: ID del pedido
    """
    cliente = _get_cliente_by_user_id(int(payload["sub"]), db)
    pedido = _get_pedido_by_id(pedido_id, db)
    
    # Validar que el pedido pertenece al cliente
    _validate_pedido_belongs_to_cliente(pedido, cliente)
    
    encuesta = db.query(EncuestaSatisfaccion).filter(
        EncuestaSatisfaccion.pedido_id == pedido_id
    ).first()
    
    if not encuesta:
        return None
    
    return _serialize_encuesta(encuesta)


@router.post(
    "",
    response_model=EncuestaOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_rol("cliente"))],
    summary="Crear encuesta para un pedido",
    description="Crea una nueva encuesta para un pedido entregado. El sistema genera la encuesta automáticamente."
)
def create_encuesta(
    body: EncuestaCreate,
    payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Crea una nueva encuesta para un pedido.
    
    - **pedido_id**: ID del pedido a encuestar
    """
    cliente = _get_cliente_by_user_id(int(payload["sub"]), db)
    pedido = _get_pedido_by_id(body.pedido_id, db)
    
    # Validar que el pedido pertenece al cliente
    _validate_pedido_belongs_to_cliente(pedido, cliente)
    
    # Validar que el pedido esté entregado
    _validate_pedido_entregado(pedido)
    
    # Validar que no exista ya una encuesta
    _check_pedido_has_encuesta(body.pedido_id, db)
    
    # Crear la encuesta (sin responder aún)
    encuesta = EncuestaSatisfaccion(
        pedido_id=body.pedido_id,
        respondida=False,
        omitida=False,
        enviada_en=datetime.now(timezone.utc),
    )
    
    db.add(encuesta)
    db.commit()
    db.refresh(encuesta)
    
    return _serialize_encuesta(encuesta)


@router.post(
    "/{encuesta_id}/responder",
    response_model=EncuestaOut,
    dependencies=[Depends(require_rol("cliente"))],
    summary="Responder una encuesta",
    description="Permite al cliente responder una encuesta de satisfacción."
)
def responder_encuesta(
    encuesta_id: int,
    body: EncuestaResponder,
    payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Responde una encuesta de satisfacción.
    
    - **encuesta_id**: ID de la encuesta a responder
    - **calificacion**: Calificación del 1 al 5
    - **comentario**: Comentario opcional
    """
    cliente = _get_cliente_by_user_id(int(payload["sub"]), db)
    encuesta = _get_encuesta_by_id(encuesta_id, db)
    
    # Validar que el cliente es el propietario del pedido
    pedido = _get_pedido_by_id(encuesta.pedido_id, db)
    _validate_pedido_belongs_to_cliente(pedido, cliente)
    
    # Validar que la encuesta no haya sido respondida o omitida
    if encuesta.respondida:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta encuesta ya fue respondida"
        )
    if encuesta.omitida:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta encuesta fue omitida previamente"
        )
    
    # Actualizar la encuesta
    encuesta.calificacion = body.calificacion
    encuesta.comentario = body.comentario
    encuesta.respondida = True
    encuesta.respondida_en = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(encuesta)
    
    return _serialize_encuesta(encuesta)


@router.post(
    "/{encuesta_id}/omitir",
    response_model=EncuestaOut,
    dependencies=[Depends(require_rol("cliente"))],
    summary="Omitir una encuesta",
    description="Permite al cliente omitir una encuesta de satisfacción."
)
def omitir_encuesta(
    encuesta_id: int,
    body: EncuestaOmitir | None = None,
    payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Omite una encuesta de satisfacción.
    
    - **encuesta_id**: ID de la encuesta a omitir
    - **motivo**: Motivo opcional de omisión
    """
    cliente = _get_cliente_by_user_id(int(payload["sub"]), db)
    encuesta = _get_encuesta_by_id(encuesta_id, db)
    
    # Validar que el cliente es el propietario del pedido
    pedido = _get_pedido_by_id(encuesta.pedido_id, db)
    _validate_pedido_belongs_to_cliente(pedido, cliente)
    
    # Validar que la encuesta no haya sido respondida o omitida
    if encuesta.respondida:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta encuesta ya fue respondida, no se puede omitir"
        )
    if encuesta.omitida:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta encuesta ya fue omitida"
        )
    
    # Actualizar la encuesta
    encuesta.omitida = True
    if body and body.motivo:
        encuesta.motivo_omision = body.motivo
    
    db.commit()
    db.refresh(encuesta)
    
    return _serialize_encuesta(encuesta)


# ── Endpoints para Empresa/Admin ─────────────────────────────────────────────

@router.get(
    "",
    response_model=EncuestaListResponse,
    dependencies=[Depends(require_rol("empresa", "admin"))],
    summary="Listar todas las encuestas",
    description="Lista todas las encuestas con paginación y filtros opcionales."
)
def list_encuestas(
    page: int = Query(1, ge=1, description="Número de página"),
    page_size: int = Query(20, ge=1, le=100, description="Elementos por página"),
    respondida: Optional[bool] = Query(None, description="Filtrar por estado de respuesta"),
    db: Session = Depends(get_db),
):
    """
    Lista encuestas con paginación y filtros opcionales.
    
    - **page**: Número de página (default: 1)
    - **page_size**: Elementos por página (default: 20, max: 100)
    - **respondida**: Filtrar por estado de respuesta (True/False)
    """
    query = db.query(EncuestaSatisfaccion)
    
    # Aplicar filtro por estado de respuesta si se proporciona
    if respondida is not None:
        query = query.filter(EncuestaSatisfaccion.respondida == respondida)
    
    # Obtener total y aplicar paginación
    total = query.count()
    encuestas = query.offset((page - 1) * page_size).limit(page_size).all()
    
    return EncuestaListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[_serialize_encuesta(e) for e in encuestas]
    )


@router.get(
    "/estadisticas",
    response_model=EncuestaEstadisticas,
    dependencies=[Depends(require_rol("empresa", "admin"))],
    summary="Obtener estadísticas de encuestas",
    description="Obtiene estadísticas generales de las encuestas de satisfacción."
)
def get_encuestas_estadisticas(
    db: Session = Depends(get_db),
):
    """
    Obtiene estadísticas de encuestas.
    
    Incluye total de encuestas, respondidas, omitidas, calificación promedio y porcentaje de respuesta.
    """
    # Consulta para obtener estadísticas
    total = db.query(func.count(EncuestaSatisfaccion.id)).scalar() or 0
    respondidas = db.query(func.count(EncuestaSatisfaccion.id)).filter(
        EncuestaSatisfaccion.respondida == True
    ).scalar() or 0
    omitidas = db.query(func.count(EncuestaSatisfaccion.id)).filter(
        EncuestaSatisfaccion.omitida == True
    ).scalar() or 0
    
    calificacion_promedio = None
    if respondidas > 0:
        result = db.query(func.avg(EncuestaSatisfaccion.calificacion)).filter(
            EncuestaSatisfaccion.respondida == True,
            EncuestaSatisfaccion.calificacion.isnot(None)
        ).scalar()
        if result is not None:
            calificacion_promedio = round(float(result), 2)
    
    porcentaje_respuesta = (respondidas / total * 100) if total > 0 else 0.0
    
    return EncuestaEstadisticas(
        total_encuestas=total,
        respondidas=respondidas,
        omitidas=omitidas,
        calificacion_promedio=calificacion_promedio,
        porcentaje_respuesta=round(porcentaje_respuesta, 2),
    )


@router.get(
    "/{encuesta_id}",
    response_model=EncuestaOut,
    dependencies=[Depends(require_rol("empresa", "admin"))],
    summary="Obtener detalles de una encuesta",
    description="Obtiene los detalles de una encuesta específica."
)
def get_encuesta_detalle(
    encuesta_id: int,
    db: Session = Depends(get_db),
):
    """
    Obtiene los detalles de una encuesta por su ID.
    
    - **encuesta_id**: ID de la encuesta
    """
    encuesta = _get_encuesta_by_id(encuesta_id, db)
    return _serialize_encuesta(encuesta)


# ── Endpoints para listar encuestas por pedido (cualquier rol autenticado) ────

@router.get(
    "/detalle/pedido/{pedido_id}",
    response_model=EncuestaOut | None,
    summary="Obtener encuesta por ID de pedido",
    description="Obtiene la encuesta asociada a un pedido específico."
)
def get_encuesta_por_pedido(
    pedido_id: int,
    db: Session = Depends(get_db),
):
    """
    Obtiene la encuesta de un pedido específico.
    
    - **pedido_id**: ID del pedido
    """
    # Verificar que el pedido existe
    _get_pedido_by_id(pedido_id, db)
    
    encuesta = db.query(EncuestaSatisfaccion).filter(
        EncuestaSatisfaccion.pedido_id == pedido_id
    ).first()
    
    if not encuesta:
        return None
    
    return _serialize_encuesta(encuesta)