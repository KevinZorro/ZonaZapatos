import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))



import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.pedidos.models import Pedido, ItemPedido
from app.productos.models import Producto
from app.usuarios.models import Usuario
from app.devoluciones.models import Devolucion
from app.encuestas.models import EncuestaSatisfaccion
from app.dashboard.models import DashboardVentas
from app.dashboard.models import DashboardVentas, AnalisisDevolucion, PrediccionVentas

db = SessionLocal()

# Traer datos de ventas
query = (
    db.query(
        ItemPedido.producto_id,
        Producto.talla,
        Producto.color,
        Producto.precio,
        ItemPedido.cantidad,
        Pedido.fecha_pedido,
    )
    .join(Pedido, ItemPedido.pedido_id == Pedido.id)
    .join(Producto, ItemPedido.producto_id == Producto.id)
    .all()
)

df = pd.DataFrame(query, columns=[
    "producto_id", "talla", "color", "precio", "cantidad", "fecha"
])

print(f"Total registros encontrados: {len(df)}")

if len(df) == 0:
    print("❌ No hay datos de pedidos. Agrega ventas primero.")
    sys.exit()

# Preparar features
df["mes"] = pd.to_datetime(df["fecha"]).dt.month
df["dia_semana"] = pd.to_datetime(df["fecha"]).dt.dayofweek

le_talla = LabelEncoder()
le_color = LabelEncoder()
df["talla_enc"] = le_talla.fit_transform(df["talla"].fillna("N/A"))
df["color_enc"] = le_color.fit_transform(df["color"].fillna("N/A"))
# Agregar empresa_id al DataFrame desde Producto
df["empresa_id"] = None
for idx, row in df.iterrows():
    from app.productos.models import Producto as P
    prod = db.query(P).filter(P.id == row["producto_id"]).first()
    if prod:
        df.at[idx, "empresa_id"] = prod.empresa_id

# Entrenar un modelo por empresa
empresas_ids = df["empresa_id"].dropna().unique()
print(f"Empresas encontradas: {list(empresas_ids)}")

for empresa_id in empresas_ids:
    df_empresa = df[df["empresa_id"] == empresa_id].copy()

    if len(df_empresa) < 5:
        print(f"⚠️ Empresa {int(empresa_id)} tiene solo {len(df_empresa)} registros, saltando...")
        continue

    le_talla_e = LabelEncoder()
    le_color_e = LabelEncoder()
    df_empresa["talla_enc"] = le_talla_e.fit_transform(df_empresa["talla"].fillna("N/A"))
    df_empresa["color_enc"] = le_color_e.fit_transform(df_empresa["color"].fillna("N/A"))

    X = df_empresa[["producto_id", "precio", "talla_enc", "color_enc", "mes", "dia_semana"]]
    y = df_empresa["cantidad"]

    modelo = RandomForestRegressor(n_estimators=100, random_state=42)
    modelo.fit(X, y)

    carpeta = f"static/models/empresa_{int(empresa_id)}"
    os.makedirs(carpeta, exist_ok=True)
    joblib.dump(modelo, f"{carpeta}/prediccion_ventas.pkl")
    joblib.dump(le_talla_e, f"{carpeta}/encoder_talla.pkl")
    joblib.dump(le_color_e, f"{carpeta}/encoder_color.pkl")
    print(f"✅ Modelo guardado para empresa {int(empresa_id)} ({len(df_empresa)} registros)")

db.close()