from collections import defaultdict
from sqlalchemy import and_

from app.devoluciones.models import Devolucion
from app.encuestas.models import EncuestaSatisfaccion


# 🔥 Clasificador de motivos
def clasificar_motivo(texto: str):
    if not texto:
        return "otro"

    texto = texto.lower()

    if "pequeñ" in texto or "apret" in texto:
        return "talla_pequena"

    if "grande" in texto or "holgado" in texto:
        return "talla_grande"

    if "defect" in texto or "dañ" in texto:
        return "producto_defectuoso"

    if "material" in texto or "rigido" in texto:
        return "material_rigido"

    if "acabado" in texto or "costura" in texto:
        return "acabado"

    return "otro"


def analizar_devoluciones(db, fecha_inicio=None, fecha_fin=None):
    conteo = defaultdict(lambda: defaultdict(int))

    # =========================
    # 🔵 DEVOLUCIONES
    # =========================
    query_dev = db.query(Devolucion)

    if fecha_inicio and fecha_fin:
        query_dev = query_dev.filter(
            and_(
                Devolucion.fecha_solicitud >= fecha_inicio,
                Devolucion.fecha_solicitud <= fecha_fin
            )
        )

    devoluciones = query_dev.all()

    # =========================
    # 🟡 ENCUESTAS
    # =========================
    query_enc = db.query(EncuestaSatisfaccion)

    if fecha_inicio and fecha_fin:
        query_enc = query_enc.filter(
            and_(
                EncuestaSatisfaccion.enviada_en >= fecha_inicio,
                EncuestaSatisfaccion.enviada_en <= fecha_fin
            )
        )

    encuestas = query_enc.all()

    # =========================
    # VALIDACIÓN GLOBAL
    # =========================
    if len(devoluciones) + len(encuestas) < 3:
        return {
            "datos_suficientes": False,
            "mensaje": "No hay suficientes datos para análisis"
        }

    # =========================
    # PROCESAR DEVOLUCIONES
    # =========================
    for d in devoluciones:
        if not d.pedido:
            continue

        for item in d.pedido.items:
            if not item.producto:
                continue

            producto_nombre = item.producto.nombre
            motivo = clasificar_motivo(d.motivo)

            # ✅ YA NO se ignora "otro"
            conteo[producto_nombre][motivo] += 1

    # =========================
    # PROCESAR ENCUESTAS
    # =========================
    for e in encuestas:
        if not e.comentario or not e.pedido:
            continue

        for item in e.pedido.items:
            if not item.producto:
                continue

            producto_nombre = item.producto.nombre
            motivo = clasificar_motivo(e.comentario)

            # ✅ YA NO se ignora "otro"
            conteo[producto_nombre][motivo] += 1

    # =========================
    # CALCULAR PORCENTAJES
    # =========================
    resultados = {}

    for producto, motivos in conteo.items():
        total = sum(motivos.values())

        if total == 0:
            continue

        resultados[producto] = {
            motivo: round((cantidad / total) * 100, 2)
            for motivo, cantidad in motivos.items()
        }

    # =========================
    # 🚨 ALERTAS AUTOMÁTICAS
    # =========================
    umbral = 80  # puedes hacerlo configurable luego

    alertas = []

    for producto, motivos in resultados.items():
        for motivo, porcentaje in motivos.items():

            # ❌ IGNORAR "otro" SOLO aquí
            if motivo == "otro":
                continue

            if porcentaje >= umbral:
                alertas.append({
                    "producto": producto,
                    "motivo": motivo,
                    "porcentaje": porcentaje
                })

    # =========================
    # RETURN FINAL
    # =========================
    return {
        "datos_suficientes": True,
        "analisis": resultados,
        "alertas": alertas
    }