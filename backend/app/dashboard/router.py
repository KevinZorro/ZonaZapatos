"""Dashboard de ventas — RF12 — Implementación Phase 6."""
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_rol
from app.pedidos.models import EstadoPedidoEnum, ItemPedido, Pedido
from app.productos.models import Producto
from app.usuarios.models import Empresa

router = APIRouter(prefix="/empresa", tags=["dashboard", "analisis", "prediccion"])

_P7 = "Implementación pendiente — Fase 7"


# ── Helpers ───────────────────────────────────────────────────────────────────
def _get_empresa(user_id: int, db: Session) -> Empresa:
    empresa = db.query(Empresa).filter(Empresa.usuario_id == user_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    return empresa


def _parse_date(s: str, end_of_day: bool = False) -> datetime:
    dt = datetime.strptime(s, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    if end_of_day:
        dt = dt.replace(hour=23, minute=59, second=59, microsecond=999999)
    return dt


# ── RF12: Dashboard de ventas ─────────────────────────────────────────────────
@router.get("/dashboard", dependencies=[Depends(require_rol("empresa"))])
def get_dashboard(
    fecha_inicio: Optional[str] = Query(None, description="Fecha inicio YYYY-MM-DD"),
    fecha_fin: Optional[str] = Query(None, description="Fecha fin YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Dashboard de ventas para la empresa autenticada.

    Retorna:
    - KPIs: ingresos, total pedidos, por estado, ticket promedio
    - Tendencia mensual: ingresos y pedidos por mes (últimos 6 meses por defecto)
    - Ranking de productos más y menos vendidos (top 5)
    - Historial de los 10 pedidos más recientes
    """
    empresa = _get_empresa(int(current_user["sub"]), db)

    # ── Rango de fechas ───────────────────────────────────────────────────────
    now = datetime.now(timezone.utc)
    if fecha_inicio:
        inicio = _parse_date(fecha_inicio)
    else:
        # Por defecto: inicio del mes de hace 5 meses (6 meses en total)
        inicio = (now.replace(day=1) - timedelta(days=5 * 30)).replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )

    fin = _parse_date(fecha_fin, end_of_day=True) if fecha_fin else now

    # ── Pedidos de la empresa en el periodo ───────────────────────────────────
    # Un pedido pertenece a esta empresa si al menos un ítem es de un producto suyo
    pedidos_ids_q = (
        db.query(Pedido.id)
        .join(ItemPedido, Pedido.id == ItemPedido.pedido_id)
        .join(Producto, ItemPedido.producto_id == Producto.id)
        .filter(Producto.empresa_id == empresa.id)
        .filter(Pedido.fecha_pedido >= inicio)
        .filter(Pedido.fecha_pedido <= fin)
        .distinct()
        .subquery()
    )

    pedidos = (
        db.query(Pedido)
        .filter(Pedido.id.in_(pedidos_ids_q))
        .order_by(Pedido.fecha_pedido.desc())
        .all()
    )

    # ── KPIs ──────────────────────────────────────────────────────────────────
    total_pedidos = len(pedidos)
    por_estado = defaultdict(int)
    for p in pedidos:
        por_estado[p.estado.value] += 1

    # Ingresos solo de ítems de esta empresa (excluye cancelados)
    ingresos_totales = 0.0
    items_empresa = (
        db.query(ItemPedido)
        .join(Producto, ItemPedido.producto_id == Producto.id)
        .join(Pedido, ItemPedido.pedido_id == Pedido.id)
        .filter(Producto.empresa_id == empresa.id)
        .filter(Pedido.fecha_pedido >= inicio)
        .filter(Pedido.fecha_pedido <= fin)
        .filter(Pedido.estado != EstadoPedidoEnum.cancelado)
        .all()
    )

    for item in items_empresa:
        ingresos_totales += item.cantidad * item.precio_unitario

    entregados = por_estado.get("entregado", 0)
    ticket_promedio = ingresos_totales / entregados if entregados > 0 else 0.0

    # ── Tendencia mensual ─────────────────────────────────────────────────────
    monthly: dict[str, dict] = defaultdict(lambda: {"ingresos": 0.0, "pedidos": set()})

    items_con_pedido = (
        db.query(ItemPedido, Pedido.fecha_pedido, Pedido.id, Pedido.estado)
        .join(Producto, ItemPedido.producto_id == Producto.id)
        .join(Pedido, ItemPedido.pedido_id == Pedido.id)
        .filter(Producto.empresa_id == empresa.id)
        .filter(Pedido.fecha_pedido >= inicio)
        .filter(Pedido.fecha_pedido <= fin)
        .all()
    )

    for item, fecha, pedido_id, estado in items_con_pedido:
        key = fecha.strftime("%Y-%m")
        monthly[key]["pedidos"].add(pedido_id)
        if estado != EstadoPedidoEnum.cancelado:
            monthly[key]["ingresos"] += item.cantidad * item.precio_unitario

    tendencia_mensual = sorted(
        [
            {
                "periodo": k,
                "ingresos": round(v["ingresos"], 2),
                "pedidos": len(v["pedidos"]),
            }
            for k, v in monthly.items()
        ],
        key=lambda x: x["periodo"],
    )

    # ── Rankings de productos ─────────────────────────────────────────────────
    product_sales: dict[int, dict] = defaultdict(
        lambda: {"nombre": "", "unidades": 0, "ingresos": 0.0}
    )

    for item in items_empresa:
        if item.producto_id is None:
            continue
        prod = item.producto
        product_sales[item.producto_id]["nombre"] = prod.nombre if prod else f"Producto #{item.producto_id}"
        product_sales[item.producto_id]["unidades"] += item.cantidad
        product_sales[item.producto_id]["ingresos"] += item.cantidad * item.precio_unitario

    ranking = sorted(
        [
            {
                "producto_id": pid,
                "nombre": data["nombre"],
                "unidades": data["unidades"],
                "ingresos": round(data["ingresos"], 2),
            }
            for pid, data in product_sales.items()
        ],
        key=lambda x: x["unidades"],
        reverse=True,
    )

    ranking_mas_vendidos = ranking[:5]
    ranking_menos_vendidos = list(reversed(ranking[-5:])) if len(ranking) > 5 else ranking[::-1]

    # ── Historial reciente (10 pedidos) ───────────────────────────────────────
    historial = []
    for p in pedidos[:10]:
        # Ítems de esta empresa en este pedido
        items_en_pedido = [
            i for i in p.items
            if i.producto and i.producto.empresa_id == empresa.id
        ]
        subtotal_empresa = sum(i.cantidad * i.precio_unitario for i in items_en_pedido)
        historial.append(
            {
                "id": p.id,
                "fecha": p.fecha_pedido.isoformat(),
                "estado": p.estado.value,
                "total_empresa": round(subtotal_empresa, 2),
                "canal": p.canal_contacto.value,
                "unidades": sum(i.cantidad for i in items_en_pedido),
                "num_productos": len(items_en_pedido),
            }
        )

    return {
        "empresa": {"id": empresa.id, "nombre": empresa.nombre},
        "periodo": {
            "inicio": inicio.date().isoformat(),
            "fin": fin.date().isoformat(),
        },
        "kpis": {
            "ingresos_totales": round(ingresos_totales, 2),
            "total_pedidos": total_pedidos,
            "pedidos_entregados": por_estado.get("entregado", 0),
            "pedidos_pendientes": por_estado.get("pendiente", 0),
            "pedidos_enviados": por_estado.get("enviado", 0),
            "pedidos_confirmados": por_estado.get("confirmado", 0),
            "pedidos_cancelados": por_estado.get("cancelado", 0),
            "ticket_promedio": round(ticket_promedio, 2),
        },
        "tendencia_mensual": tendencia_mensual,
        "ranking_mas_vendidos": ranking_mas_vendidos,
        "ranking_menos_vendidos": ranking_menos_vendidos,
        "historial_pedidos": historial,
    }


# ── Stub: Análisis de devoluciones (Phase 7 — Brayan) ────────────────────────
@router.get(
    "/analisis-devoluciones", dependencies=[Depends(require_rol("empresa"))]
)
def get_analisis_devoluciones(db: Session = Depends(get_db)):
    raise HTTPException(status_code=501, detail=_P7)


# ── Stub: Predicción de ventas (Phase 7 — Javier) ────────────────────────────
@router.get(
    "/prediccion/{producto_id}", dependencies=[Depends(require_rol("empresa"))]
)
def get_prediccion(producto_id: int, db: Session = Depends(get_db)):
    raise HTTPException(status_code=501, detail=_P7)
