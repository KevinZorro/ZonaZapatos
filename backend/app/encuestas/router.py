"""Encuestas router — endpoints para encuestas de satisfacción."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.security import require_rol
from app.encuestas.models import EncuestaSatisfaccion
from app.encuestas.schemas import EncuestaOut, EncuestaPendienteOut, EncuestaResponder
from app.pedidos.models import Pedido
from app.usuarios.models import Cliente

router = APIRouter(prefix="/encuestas", tags=["encuestas"])


def _get_cliente(payload: dict, db: Session) -> Cliente:
    """Obtiene el cliente autenticado desde el token."""
    usuario_id = int(payload["sub"])
    cliente = db.query(Cliente).filter(Cliente.usuario_id == usuario_id).first()
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente no encontrado"
        )
    return cliente


@router.get(
    "/pendiente",
    response_model=EncuestaPendienteOut | None,
)
def get_encuesta_pendiente(
    db: Session = Depends(get_db),
    payload: dict = Depends(require_rol("cliente")),
):
    """Obtiene la encuesta pendiente del cliente autenticado.

    Incluye encuestas con recordatorio activo (que fueron omitidas anteriormente).
    """
    cliente = _get_cliente(payload, db)

    encuesta = (
        db.query(EncuestaSatisfaccion)
        .options(joinedload(EncuestaSatisfaccion.producto))
        .join(Pedido)
        .filter(
            Pedido.cliente_id == cliente.id,
            EncuestaSatisfaccion.respondida == False,
        )
        .order_by(EncuestaSatisfaccion.enviada_en.desc())
        .first()
    )

    if not encuesta:
        return None

    return encuesta


@router.get(
    "/producto/{producto_id}",
    response_model=EncuestaPendienteOut | None,
)
def get_encuesta_por_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_rol("cliente")),
):
    """Obtiene la encuesta pendiente para un producto específico.

    Permite al cliente dejar una reseña desde la página del producto.
    """
    cliente = _get_cliente(payload, db)

    encuesta = (
        db.query(EncuestaSatisfaccion)
        .options(joinedload(EncuestaSatisfaccion.producto))
        .join(Pedido)
        .filter(
            Pedido.cliente_id == cliente.id,
            EncuestaSatisfaccion.producto_id == producto_id,
            EncuestaSatisfaccion.respondida == False,
        )
        .first()
    )

    if not encuesta:
        return None

    return encuesta


@router.get(
    "/pedido/{pedido_id}/pendientes",
    response_model=list[EncuestaPendienteOut],
)
def get_encuestas_pendientes_por_pedido(
    pedido_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_rol("cliente")),
):
    """Obtiene todas las encuestas pendientes de un pedido.

    Permite al cliente dejar reseñas para todos los productos del pedido.
    """
    cliente = _get_cliente(payload, db)

    encuestas = (
        db.query(EncuestaSatisfaccion)
        .options(joinedload(EncuestaSatisfaccion.producto))
        .join(Pedido)
        .filter(
            Pedido.id == pedido_id,
            Pedido.cliente_id == cliente.id,
            EncuestaSatisfaccion.respondida == False,
            EncuestaSatisfaccion.omitida == False,
        )
        .order_by(EncuestaSatisfaccion.id)
        .all()
    )

    return encuestas


@router.get(
    "/{encuesta_id}",
    response_model=EncuestaOut,
)
def get_encuesta(
    encuesta_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_rol("cliente")),
):
    """Obtiene el detalle de una encuesta específica."""
    cliente = _get_cliente(payload, db)

    encuesta = (
        db.query(EncuestaSatisfaccion)
        .options(joinedload(EncuestaSatisfaccion.producto))
        .join(Pedido)
        .filter(
            EncuestaSatisfaccion.id == encuesta_id,
            Pedido.cliente_id == cliente.id,
        )
        .first()
    )

    if not encuesta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encuesta no encontrada"
        )

    return encuesta


@router.post(
    "/{encuesta_id}/responder",
    response_model=EncuestaOut,
)
def responder_encuesta(
    encuesta_id: int,
    body: EncuestaResponder,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_rol("cliente")),
):
    """Guarda la respuesta de la encuesta (calificación y comentario)."""
    cliente = _get_cliente(payload, db)

    encuesta = (
        db.query(EncuestaSatisfaccion)
        .options(joinedload(EncuestaSatisfaccion.producto))
        .join(Pedido)
        .filter(
            EncuestaSatisfaccion.id == encuesta_id,
            Pedido.cliente_id == cliente.id,
        )
        .first()
    )

    if not encuesta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encuesta no encontrada"
        )

    if encuesta.respondida:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta encuesta ya ha sido respondida"
        )

    encuesta.calificacion = body.calificacion
    encuesta.comentario = body.comentario
    encuesta.respondida = True
    encuesta.omitida = False
    encuesta.recordatorio_activo = False
    encuesta.respondida_en = datetime.now(timezone.utc)

    db.commit()
    db.refresh(encuesta)

    return encuesta


@router.post(
    "/{encuesta_id}/omitir",
    response_model=EncuestaOut,
)
def omitir_encuesta(
    encuesta_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_rol("cliente")),
):
    """Marca la encuesta como omitida y activa el recordatorio."""
    cliente = _get_cliente(payload, db)

    encuesta = (
        db.query(EncuestaSatisfaccion)
        .options(joinedload(EncuestaSatisfaccion.producto))
        .join(Pedido)
        .filter(
            EncuestaSatisfaccion.id == encuesta_id,
            Pedido.cliente_id == cliente.id,
        )
        .first()
    )

    if not encuesta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encuesta no encontrada"
        )

    if encuesta.respondida:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta encuesta ya ha sido respondida"
        )

    encuesta.omitida = True
    encuesta.recordatorio_activo = True

    db.commit()
    db.refresh(encuesta)

    return encuesta


@router.get(
    "/pedido/{pedido_id}/respondidas",
    response_model=list[EncuestaOut],
)
def get_encuestas_respondidas_por_pedido(
    pedido_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_rol("cliente")),
):
    """Obtiene todas las encuestas respondidas de un pedido del cliente.

    Permite al cliente ver y editar sus reseñas existentes.
    """
    cliente = _get_cliente(payload, db)

    encuestas = (
        db.query(EncuestaSatisfaccion)
        .options(joinedload(EncuestaSatisfaccion.producto))
        .join(Pedido)
        .filter(
            Pedido.id == pedido_id,
            Pedido.cliente_id == cliente.id,
            EncuestaSatisfaccion.respondida == True,
        )
        .order_by(EncuestaSatisfaccion.respondida_en.desc())
        .all()
    )

    return encuestas


@router.put(
    "/{encuesta_id}",
    response_model=EncuestaOut,
)
def actualizar_encuesta(
    encuesta_id: int,
    body: EncuestaResponder,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_rol("cliente")),
):
    """Actualiza una reseña existente (calificación y comentario)."""
    cliente = _get_cliente(payload, db)

    encuesta = (
        db.query(EncuestaSatisfaccion)
        .options(joinedload(EncuestaSatisfaccion.producto))
        .join(Pedido)
        .filter(
            EncuestaSatisfaccion.id == encuesta_id,
            Pedido.cliente_id == cliente.id,
            EncuestaSatisfaccion.respondida == True,
        )
        .first()
    )

    if not encuesta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reseña no encontrada o no puedes editarla"
        )

    encuesta.calificacion = body.calificacion
    encuesta.comentario = body.comentario
    encuesta.respondida_en = datetime.now(timezone.utc)

    db.commit()
    db.refresh(encuesta)

    return encuesta


@router.delete(
    "/{encuesta_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def eliminar_encuesta(
    encuesta_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_rol("cliente")),
):
    """Elimina una reseña existente (la marca como no respondida)."""
    cliente = _get_cliente(payload, db)

    encuesta = (
        db.query(EncuestaSatisfaccion)
        .join(Pedido)
        .filter(
            EncuestaSatisfaccion.id == encuesta_id,
            Pedido.cliente_id == cliente.id,
            EncuestaSatisfaccion.respondida == True,
        )
        .first()
    )

    if not encuesta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reseña no encontrada o no puedes eliminarla"
        )

    # En lugar de borrar, la marcamos como no respondida para que pueda reseñar de nuevo
    encuesta.respondida = False
    encuesta.calificacion = None
    encuesta.comentario = None
    encuesta.respondida_en = None

    db.commit()

    return None
