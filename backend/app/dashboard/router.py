"""Dashboard de ventas — RF12 — Implementación Phase 6."""
from collections import defaultdict
import datetime as _dt
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_rol
from app.pedidos.models import EstadoPedidoEnum, ItemPedido, Pedido
from app.productos.models import Producto
from app.usuarios.models import Empresa
from app.dashboard.services import analizar_devoluciones
from typing import Optional
from datetime import date

from pydantic import BaseModel
from typing import List
import joblib
import numpy as np

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
@router.get("/analisis-devoluciones", dependencies=[Depends(require_rol("empresa"))])
def get_analisis_devoluciones(
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    db: Session = Depends(get_db)
):
    return analizar_devoluciones(db, fecha_inicio, fecha_fin)


# ── Stub: Predicción de ventas (Phase 7 — Javier) ────────────────────────────

MESES = {
    1: "enero", 2: "febrero", 3: "marzo", 4: "abril",
    5: "mayo", 6: "junio", 7: "julio", 8: "agosto",
    9: "septiembre", 10: "octubre", 11: "noviembre", 12: "diciembre",
}

FEATURES = ["producto_id", "precio", "talla", "color", "mes", "semana"]

NOMBRES_FEATURES = {
    "producto_id": "identidad del producto",
    "precio":      "precio de venta",
    "talla":       "talla del zapato",
    "color":       "color del zapato",
    "mes":         "mes del año",
    "semana":      "semana del año",
}


def nivel_demanda(prediccion: float):
    if prediccion >= 10:
        return "muy alta", "Asegúrate de tener suficiente stock. Es uno de tus productos con mayor rotación."
    if prediccion >= 6:
        return "alta", "Buen momento para promocionarlo. Tiene buena salida este período."
    if prediccion >= 3:
        return "moderada", "Demanda estable. Mantén un stock básico disponible."
    return "baja", "Poca rotación esperada. Evalúa si vale la pena hacer una promoción para activarlo."


def generar_explicaciones(ranking, ahora, producto):
    explicaciones = []
    for f, v in ranking[:3]:
        pct = round(v * 100)
        if f == "semana":
            explicaciones.append(
                f"La semana del año explica el {pct}% de la predicción — "
                "el modelo detectó que ciertos períodos del año tienen más ventas que otros."
            )
        elif f == "mes":
            mes_nombre = MESES.get(ahora.month, "este mes")
            tendencia = "buena" if ahora.month in [5, 10, 11, 12] else "demanda regular"
            explicaciones.append(
                f"El mes influye un {pct}%. Estamos en {mes_nombre}, "
                f"que históricamente tiene {tendencia} en calzado."
            )
        elif f == "precio":
            precio = producto.precio or 0
            rango = "accesible y atrae más compradores" if precio < 300000 else "premium con menor volumen pero mayor margen"
            explicaciones.append(
                f"El precio (${int(precio):,}) tiene un {pct}% de peso — es un producto {rango}."
            )
        elif f == "talla":
            explicaciones.append(
                f"La talla disponible ({producto.talla}) influye un {pct}% — "
                "entre más tallas cubras, más clientes puedes capturar."
            )
        elif f == "color":
            explicaciones.append(
                f"El color ({producto.color}) tiene un {pct}% de influencia "
                "en la demanda histórica de este producto."
            )
        elif f == "producto_id":
            explicaciones.append(
                f"El historial propio de este producto explica el {pct}% — "
                "el modelo aprendió su patrón de ventas específico."
            )
    return explicaciones


def predecir_4_semanas(modelo, producto_id, precio, talla_enc, color_enc, ahora):
    semana_actual = ahora.isocalendar()[1]
    total = 0.0
    for i in range(4):
        semana = ((semana_actual + i - 1) % 52) + 1
        entrada = np.array([[producto_id, float(precio), talla_enc, color_enc, ahora.month, semana]])
        total += modelo.predict(entrada)[0]
    return total


@router.get("/prediccion/{producto_id}", dependencies=[Depends(require_rol("empresa"))])
def get_prediccion(
    producto_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(get_current_user),
):
    from app.usuarios.models import Empresa
    from app.productos.models import Producto

    usuario_id = int(payload.get("sub"))
    empresa = db.query(Empresa).filter(Empresa.usuario_id == usuario_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada.")

    carpeta = f"static/models/empresa_{empresa.id}"
    try:
        modelo   = joblib.load(f"{carpeta}/prediccion_ventas.pkl")
        le_talla = joblib.load(f"{carpeta}/encoder_talla.pkl")
        le_color = joblib.load(f"{carpeta}/encoder_color.pkl")
    except Exception:
        raise HTTPException(status_code=503, detail="Modelo no disponible para esta empresa.")

    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado.")

    talla = str(producto.talla) if producto.talla else "N/A"
    color = str(producto.color) if producto.color else "N/A"

    try:
        talla_enc = le_talla.transform([talla])[0]
    except Exception:
        talla_enc = 0
    try:
        color_enc = le_color.transform([color])[0]
    except Exception:
        color_enc = 0

    ahora      = _dt.datetime.now()
    prediccion = predecir_4_semanas(modelo, producto_id, producto.precio or 0, talla_enc, color_enc, ahora)

    importancias = modelo.feature_importances_
    ranking  = sorted(zip(FEATURES, importancias), key=lambda x: x[1], reverse=True)
    factores = [f"{NOMBRES_FEATURES[f]} ({round(v*100)}% de influencia)" for f, v in ranking[:3]]

    nivel, consejo = nivel_demanda(prediccion)
    explicaciones  = generar_explicaciones(ranking, ahora, producto)

    return {
        "producto_id":          producto_id,
        "unidades_estimadas":   round(float(prediccion), 1),
        "mensaje":              f"Se estiman ~{round(prediccion)} unidades vendidas en las próximas 4 semanas",
        "factores_principales": factores,
        "nivel_demanda":        nivel,
        "consejo":              consejo,
        "explicacion_factores": explicaciones,
    }


class PrediccionConjuntoRequest(BaseModel):
    producto_ids: List[int]


@router.post("/prediccion/conjunto", dependencies=[Depends(require_rol("empresa"))])
def predecir_conjunto(
    body: PrediccionConjuntoRequest,
    db: Session = Depends(get_db),
    payload: dict = Depends(get_current_user),
):
    from app.usuarios.models import Empresa
    from app.productos.models import Producto

    usuario_id = int(payload.get("sub"))
    empresa = db.query(Empresa).filter(Empresa.usuario_id == usuario_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada.")

    carpeta = f"static/models/empresa_{empresa.id}"
    try:
        modelo   = joblib.load(f"{carpeta}/prediccion_ventas.pkl")
        le_talla = joblib.load(f"{carpeta}/encoder_talla.pkl")
        le_color = joblib.load(f"{carpeta}/encoder_color.pkl")
    except Exception:
        raise HTTPException(status_code=503, detail="Modelo no disponible para esta empresa.")

    ahora      = _dt.datetime.now()
    resultados = []

    for pid in body.producto_ids:
        producto = db.query(Producto).filter(Producto.id == pid).first()
        if not producto:
            continue

        talla = str(producto.talla) if producto.talla else "N/A"
        color = str(producto.color) if producto.color else "N/A"

        try:
            talla_enc = le_talla.transform([talla])[0]
        except Exception:
            talla_enc = 0
        try:
            color_enc = le_color.transform([color])[0]
        except Exception:
            color_enc = 0

        total = predecir_4_semanas(modelo, pid, producto.precio or 0, talla_enc, color_enc, ahora)

        importancias = modelo.feature_importances_
        ranking  = sorted(zip(FEATURES, importancias), key=lambda x: x[1], reverse=True)
        factores = [f"{NOMBRES_FEATURES[f]} ({round(v*100)}%)" for f, v in ranking[:3]]
        nivel, consejo = nivel_demanda(total)

        resultados.append({
            "producto_id":          pid,
            "nombre":               producto.nombre,
            "unidades_estimadas":   round(float(total), 1),
            "factores_principales": factores,
            "nivel_demanda":        nivel,
            "consejo":              consejo,
        })

    resultados.sort(key=lambda x: x["unidades_estimadas"], reverse=True)
    return {"predicciones": resultados}