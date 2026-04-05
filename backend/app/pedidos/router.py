"""Pedidos + Devoluciones router."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from app.pedidos.models import Pedido, ItemPedido
from app.productos.models import Producto

from app.core.database import get_db
from app.core.security import require_rol
from app.devoluciones.schemas import DevolucionCreate, DevolucionEstadoUpdate, DevolucionOut
from app.pedidos.schemas import PedidoCreate, PedidoOut
from app.pedidos.models import Pedido
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
            .joinedload(Producto.media)
        )
        .filter(Pedido.cliente_id == cliente.id)
        .order_by(Pedido.fecha_pedido.desc())
        .all()
    )
    return pedidos


@router.put(
    "/pedidos/{pedido_id}/entregar",
    response_model=PedidoOut,
)
def marcar_entregado(
    pedido_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_rol("empresa", "admin")),
):
    raise HTTPException(status_code=501, detail=_P4)


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