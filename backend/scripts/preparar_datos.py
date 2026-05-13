import pandas as pd
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.pedidos.models import Pedido, ItemPedido
from app.productos.models import Producto

def obtener_datos_ventas(db: Session):
    # Consulta: unir items de pedido con sus pedidos y productos
    query = (
        db.query(
            ItemPedido.producto_id,
            Producto.nombre,
            Producto.talla,
            Producto.color,
            Producto.precio,
            ItemPedido.cantidad,
            Pedido.creado_en,  # fecha del pedido
        )
        .join(Pedido, ItemPedido.pedido_id == Pedido.id)
        .join(Producto, ItemPedido.producto_id == Producto.id)
        .all()
    )

    df = pd.DataFrame(query, columns=[
        "producto_id", "nombre", "talla", "color",
        "precio", "cantidad", "fecha"
    ])

    # Extraer mes y día de semana como features
    df["mes"] = pd.to_datetime(df["fecha"]).dt.month
    df["dia_semana"] = pd.to_datetime(df["fecha"]).dt.dayofweek

    return df