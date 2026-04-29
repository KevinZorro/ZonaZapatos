from collections import defaultdict
from sqlalchemy import and_

from app.devoluciones.models import Devolucion
from app.encuestas.models import EncuestaSatisfaccion


# 🔥 Clasificador de motivos
def clasificar_motivo(texto: str):
    if not texto:
        return "otro"

    texto = texto.lower()

    # 🔵 TALLA PEQUEÑA
    if any(p in texto for p in [
        "pequeñ", "apret", "ajust", "estrech", "no entra",
        "muy justo", "incomodo", "aprieta"
    ]):
        return "talla_pequena"

    # 🔵 TALLA GRANDE
    if any(p in texto for p in [
        "grande", "holgado", "suelto", "flojo",
        "muy ancho", "queda grande"
    ]):
        return "talla_grande"

    # 🔴 PRODUCTO DEFECTUOSO
    if any(p in texto for p in [
        "defect", "dañ", "roto", "mal estado",
        "vino mal", "fallo", "error", "no funciona",
        "despeg", "pegamento", "descocido"
    ]):
        return "producto_defectuoso"

    # 🟡 MATERIAL / COMODIDAD
    if any(p in texto for p in [
        "material", "rigido", "duro", "incómodo",
        "incomodo", "molesta", "raspa", "calidad",
        "plastico", "no transpira"
    ]):
        return "material_rigido"

    # 🟢 ACABADOS / FABRICACIÓN
    if any(p in texto for p in [
        "acabado", "costura", "mal cosido",
        "terminacion", "detalle", "mal hecho"
    ]):
        return "acabado"

    # 🟣 COLOR / DISEÑO
    if any(p in texto for p in [
        "color", "diferente", "no es como", "no coincide",
        "imagen", "foto", "diseño", "modelo distinto"
    ]):
        return "diseno_color"

    # 🟠 ENTREGA / LOGÍSTICA
    if any(p in texto for p in [
        "tarde", "demora", "retraso", "envio",
        "entrega", "no llegó", "equivocado", "pedido mal"
    ]):
        return "logistica"

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