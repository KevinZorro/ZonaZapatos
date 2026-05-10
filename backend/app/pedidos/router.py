"""Pedidos + Devoluciones router."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload

from app.core.database import get_db
from app.core.security import require_rol
from app.devoluciones.schemas import DevolucionCreate, DevolucionEstadoUpdate, DevolucionOut
from app.encuestas.models import EncuestaSatisfaccion
from app.encuestas.service import crear_encuestas_pendientes_pedido, enviar_encuesta_email, notificar_encuesta_whatsapp_telefono
from app.pedidos.models import Pedido, ItemPedido, EstadoPedidoEnum, CanalContactoEnum
from app.pedidos.schemas import PedidoCreate, PedidoOut
from app.productos.models import Producto
from app.usuarios.models import Cliente
router = APIRouter(tags=["pedidos", "devoluciones"])

_P4 = "Implementación pendiente — Fase 4"

# ── Helper ────────────────────────────────────────────────────────────────────
def _get_cliente(payload: dict, db: Session) -> Cliente:
    usuario_id = int(payload["sub"])
    cliente = db.query(Cliente).filter(Cliente.usuario_id == usuario_id).first()
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente no encontrado"
        )
    return cliente

# ── Pedidos ───────────────────────────────────────────────────────────────────
@router.post(
    "/pedidos",
    response_model=PedidoOut,
    status_code=status.HTTP_201_CREATED,
)
def create_pedido(
    body: PedidoCreate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_rol("cliente")),
):
    raise HTTPException(status_code=501, detail=_P4)


@router.get(
    "/clientes/pedidos",
    response_model=list[PedidoOut],
)
def list_mis_pedidos(
    db: Session = Depends(get_db),
    payload: dict = Depends(require_rol("cliente")),
):
    cliente = _get_cliente(payload, db)
    pedidos = (
        db.query(Pedido)
        .options(
            joinedload(Pedido.items)
            .joinedload(ItemPedido.producto)  
            .joinedload(Producto.media),
            joinedload(Pedido.encuesta)
        )
        .filter(Pedido.cliente_id == cliente.id)
        .order_by(Pedido.fecha_pedido.desc())
        .all()
    )
    return pedidos

@router.get(
    "/pedidos/{pedido_id}",
    response_model=PedidoOut,
)
def get_pedido(
    pedido_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_rol("cliente")),
):
    cliente = _get_cliente(payload, db)
    pedido = (
        db.query(Pedido)
        .options(
            joinedload(Pedido.items)
            .joinedload(ItemPedido.producto)
            .joinedload(Producto.media),
            joinedload(Pedido.encuesta)
        )
        .filter(Pedido.id == pedido_id, Pedido.cliente_id == cliente.id)
        .first()
    )
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return pedido

@router.put(
    "/pedidos/{pedido_id}/entregar",
    response_model=PedidoOut,
)
def marcar_entregado(
    pedido_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_rol("empresa", "admin")),
):
    """Marca un pedido como entregado y crea/envía la encuesta de satisfacción."""
    pedido = (
        db.query(Pedido)
        .options(
            joinedload(Pedido.items).joinedload(ItemPedido.producto),
            joinedload(Pedido.cliente).joinedload(Cliente.usuario),
        )
        .filter(Pedido.id == pedido_id)
        .first()
    )

    if not pedido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido no encontrado"
        )

    # Verificar que no esté ya entregado
    if pedido.estado == EstadoPedidoEnum.entregado:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El pedido ya está marcado como entregado"
        )

    # Actualizar estado y fecha de entrega
    pedido.estado = EstadoPedidoEnum.entregado
    pedido.fecha_entrega = datetime.now(timezone.utc)

    # Verificar si ya existen encuestas para este pedido
    encuestas_existentes = (
        db.query(EncuestaSatisfaccion)
        .filter(EncuestaSatisfaccion.pedido_id == pedido_id)
        .count()
    )

    if encuestas_existentes == 0:
        # Crear encuestas pendientes para TODOS los productos del pedido
        encuestas = crear_encuestas_pendientes_pedido(db, pedido_id)

        if encuestas:
            # Enviar notificación según canal de contacto preferido
            cliente = pedido.cliente
            email_destino = cliente.usuario.correo if cliente.usuario else None
            nombre_cliente = cliente.nombre if cliente else "Cliente"

            if pedido.canal_contacto in (CanalContactoEnum.web, CanalContactoEnum.whatsapp):
                # Para web y whatsapp enviamos email (en MVP whatsapp simula)
                if pedido.canal_contacto == CanalContactoEnum.whatsapp:
                    for encuesta in encuestas:
                        notificar_encuesta_whatsapp_telefono(encuesta, pedido, CanalContactoEnum.whatsapp)

                if email_destino:
                    enviar_encuesta_email(db, encuestas, pedido, email_destino, nombre_cliente)

            elif pedido.canal_contacto == CanalContactoEnum.telefono:
                # Para teléfono solo simulamos
                for encuesta in encuestas:
                    notificar_encuesta_whatsapp_telefono(encuesta, pedido, CanalContactoEnum.telefono)

    db.commit()
    db.refresh(pedido)

    return pedido


# ── Devoluciones ──────────────────────────────────────────────────────────────
@router.post(
    "/devoluciones",
    response_model=DevolucionOut,
    status_code=status.HTTP_201_CREATED,
)
def solicitar_devolucion(
    body: DevolucionCreate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_rol("cliente")),
):
    raise HTTPException(status_code=501, detail=_P4)


@router.get(
    "/empresa/devoluciones",
    response_model=list[DevolucionOut],
)
def list_devoluciones_empresa(
    db: Session = Depends(get_db),
    payload: dict = Depends(require_rol("empresa")),
):
    raise HTTPException(status_code=501, detail=_P4)


@router.put(
    "/devoluciones/{devolucion_id}/estado",
    response_model=DevolucionOut,
)
def update_estado_devolucion(
    devolucion_id: int,
    body: DevolucionEstadoUpdate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_rol("empresa", "admin")),
):
    raise HTTPException(status_code=501, detail=_P4)