"""Pedidos + Devoluciones router — stub endpoints ready for Phase 4."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_rol
from app.devoluciones.schemas import DevolucionCreate, DevolucionEstadoUpdate, DevolucionOut
from app.pedidos.schemas import PedidoCreate, PedidoOut

router = APIRouter(tags=["pedidos", "devoluciones"])

_P4 = "Implementación pendiente — Fase 4"

# ── Pedidos ──────────────────────────────────────────────────────────────────
@router.post(
    "/pedidos",
    response_model=PedidoOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_rol("cliente"))],
)
def create_pedido(body: PedidoCreate, db: Session = Depends(get_db)):
    raise HTTPException(status_code=501, detail=_P4)


@router.get(
    "/clientes/pedidos",
    response_model=list[PedidoOut],
    dependencies=[Depends(require_rol("cliente"))],
)
def list_mis_pedidos(db: Session = Depends(get_db)):
    raise HTTPException(status_code=501, detail=_P4)


@router.put(
    "/pedidos/{pedido_id}/entregar",
    response_model=PedidoOut,
    dependencies=[Depends(require_rol("empresa", "admin"))],
)
def marcar_entregado(pedido_id: int, db: Session = Depends(get_db)):
    raise HTTPException(status_code=501, detail=_P4)


# ── Devoluciones ─────────────────────────────────────────────────────────────
@router.post(
    "/devoluciones",
    response_model=DevolucionOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_rol("cliente"))],
)
def solicitar_devolucion(body: DevolucionCreate, db: Session = Depends(get_db)):
    raise HTTPException(status_code=501, detail=_P4)


@router.get(
    "/empresa/devoluciones",
    response_model=list[DevolucionOut],
    dependencies=[Depends(require_rol("empresa"))],
)
def list_devoluciones_empresa(db: Session = Depends(get_db)):
    raise HTTPException(status_code=501, detail=_P4)


@router.put(
    "/devoluciones/{devolucion_id}/estado",
    response_model=DevolucionOut,
    dependencies=[Depends(require_rol("empresa", "admin"))],
)
def update_estado_devolucion(
    devolucion_id: int,
    body: DevolucionEstadoUpdate,
    db: Session = Depends(get_db),
):
    raise HTTPException(status_code=501, detail=_P4)
