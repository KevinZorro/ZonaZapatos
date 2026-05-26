"""
entrenar_modelo_v2.py
─────────────────────
Entrena un modelo que predice el TOTAL de unidades vendidas
por producto en una semana determinada.

Esto es más útil para el empresario que saber la cantidad por pedido.

USO:
    cd backend
    python scripts/entrenar_modelo_v2.py
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder

from app.core.database import SessionLocal
from app.pedidos.models import Pedido, ItemPedido
from app.productos.models import Producto
from app.usuarios.models import Usuario, Cliente, RolEnum
from app.devoluciones.models import Devolucion
from app.encuestas.models import EncuestaSatisfaccion
from app.dashboard.models import DashboardVentas, AnalisisDevolucion, PrediccionVentas

db = SessionLocal()

# ── 1. Traer datos crudos ─────────────────────────────────────────────────────
query = (
    db.query(
        ItemPedido.producto_id,
        Producto.talla,
        Producto.color,
        Producto.precio,
        Producto.empresa_id,
        ItemPedido.cantidad,
        Pedido.fecha_pedido,
    )
    .join(Pedido, ItemPedido.pedido_id == Pedido.id)
    .join(Producto, ItemPedido.producto_id == Producto.id)
    .all()
)

df = pd.DataFrame(query, columns=[
    "producto_id", "talla", "color", "precio",
    "empresa_id", "cantidad", "fecha"
])

print(f"Registros crudos: {len(df)}")

if len(df) == 0:
    print("No hay datos. Corre primero seed_pedidos_ml.py")
    db.close()
    sys.exit()

# ── 2. Convertir fecha y agrupar por producto + semana ────────────────────────
df["fecha"] = pd.to_datetime(df["fecha"], utc=True)
df["semana"] = df["fecha"].dt.isocalendar().week.astype(int)
df["mes"]    = df["fecha"].dt.month
df["año"]    = df["fecha"].dt.year

# Total vendido por producto por semana
df_agrupado = (
    df.groupby(["empresa_id", "producto_id", "talla", "color", "precio", "año", "mes", "semana"])
    .agg(total_vendido=("cantidad", "sum"))
    .reset_index()
)

print(f"Registros agrupados por semana: {len(df_agrupado)}")

# ── 3. Entrenar un modelo por empresa ─────────────────────────────────────────
empresas_ids = df_agrupado["empresa_id"].dropna().unique()
print(f"Empresas: {list(empresas_ids)}\n")

for empresa_id in empresas_ids:
    df_e = df_agrupado[df_agrupado["empresa_id"] == empresa_id].copy()

    if len(df_e) < 5:
        print(f"Empresa {int(empresa_id)}: solo {len(df_e)} semanas de datos, saltando...")
        continue

    le_talla = LabelEncoder()
    le_color = LabelEncoder()
    df_e["talla_enc"] = le_talla.fit_transform(df_e["talla"].fillna("N/A"))
    df_e["color_enc"] = le_color.fit_transform(df_e["color"].fillna("N/A"))

    # Features: qué producto, a qué precio, en qué semana del año, en qué mes
    X = df_e[["producto_id", "precio", "talla_enc", "color_enc", "mes", "semana"]]
    y = df_e["total_vendido"]

    modelo = RandomForestRegressor(n_estimators=200, random_state=42)
    modelo.fit(X, y)

    # Guardar
    carpeta = f"static/models/empresa_{int(empresa_id)}"
    os.makedirs(carpeta, exist_ok=True)
    joblib.dump(modelo,   f"{carpeta}/prediccion_ventas.pkl")
    joblib.dump(le_talla, f"{carpeta}/encoder_talla.pkl")
    joblib.dump(le_color, f"{carpeta}/encoder_color.pkl")

    # Estadísticas útiles para debug
    promedio = round(y.mean(), 1)
    maximo   = int(y.max())
    print(f"Empresa {int(empresa_id)}: {len(df_e)} semanas — promedio {promedio} uds/semana, máx {maximo} uds/semana — modelo guardado")

db.close()
print("\nEntrenamiento v2 completado.")
print("Recuerda actualizar el endpoint de predicción para usar 'semana' en vez de 'dia_semana'.")