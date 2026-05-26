"""
seed_pedidos_ml.py
──────────────────
Inyecta pedidos históricos sintéticos para una empresa específica,
de modo que el modelo ML tenga suficientes datos para entrenarse.

USO:
    cd backend
    python scripts/seed_pedidos_ml.py

CONFIGURA las variables de la sección "CONFIGURACIÓN" antes de correr.
"""

from __future__ import annotations

import sys
from dotenv import load_dotenv
load_dotenv()
from datetime import datetime, timedelta, timezone
from pathlib import Path
from random import Random


ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.dashboard.models import DashboardVentas, AnalisisDevolucion, PrediccionVentas
from app.core.database import SessionLocal, Base, engine
from app.pedidos.models import (
    Pedido, ItemPedido,
    EstadoPedidoEnum, CanalContactoEnum,
)
from app.devoluciones.models import Devolucion
from app.encuestas.models import EncuestaSatisfaccion
from app.productos.models import Producto
from app.dashboard.models import DashboardVentas, AnalisisDevolucion, PrediccionVentas
from app.usuarios.models import Usuario, Cliente, RolEnum
from app.core.security import hash_password

# ══════════════════════════════════════════════════════════════════════════════
#  CONFIGURACIÓN — edita esto antes de correr el script
# ══════════════════════════════════════════════════════════════════════════════

EMPRESA_ID = 2          # <-- pon aquí el id de tu empresa (resultado del SELECT)

# IDs de los productos de esa empresa (resultado del SELECT de productos)
# Formato: { producto_id: precio_unitario }
PRODUCTOS = {
    1: 100000.0,    # TENIS HUGO X RB
    2: 389900.0,    # Nike Air Max 270
    3: 459900.0,    # Adidas Ultraboost 22
    4: 289900.0,    # Puma RS-X
    5: 199900.0,    # Vans Old Skool
    6: 329900.0,    # New Balance 574
    7: 259900.0,    # Reebok Classic Leather
    8: 179900.0,    # Skechers Go Walk 6
    9: 549900.0,    # Timberland 6-Inch Boot
}

# Cuántos pedidos sintéticos generar (mínimo recomendado: 80)
N_PEDIDOS = 120

# Semilla aleatoria (cualquier número; cámbiala si quieres datos distintos)
SEED = 42

# ══════════════════════════════════════════════════════════════════════════════
#  NO TOQUES NADA DE AQUÍ PARA ABAJO SALVO QUE SEPAS LO QUE HACES
# ══════════════════════════════════════════════════════════════════════════════

SEED_CLIENT_EMAIL = "ml.seed.cliente@zonazapatos.internal"
RNG = Random(SEED)


def get_or_create_cliente(session) -> Cliente:
    """Crea un cliente interno solo para los pedidos de ML si no existe."""
    usuario = session.query(Usuario).filter_by(correo=SEED_CLIENT_EMAIL).first()
    if not usuario:
        usuario = Usuario(
            correo=SEED_CLIENT_EMAIL,
            password_hash=hash_password("MLSeed2026!"),
            rol=RolEnum.cliente,
            cuenta_confirmada=True,
        )
        session.add(usuario)
        session.flush()

        cliente = Cliente(
            usuario_id=usuario.id,
            nombre="Cliente ML Seed",
            telefono="573000000000",
            direccion="Interna, Colombia",
        )
        session.add(cliente)
        session.flush()
        return cliente

    if usuario.cliente:
        return usuario.cliente

    cliente = Cliente(
        usuario_id=usuario.id,
        nombre="Cliente ML Seed",
        telefono="573000000000",
        direccion="Interna, Colombia",
    )
    session.add(cliente)
    session.flush()
    return cliente


def generar_fecha_pedido(rng: Random) -> datetime:
    """
    Genera fechas distribuidas en los últimos 12 meses.
    Con más peso en ciertos meses para simular estacionalidad real.
    """
    ahora = datetime.now(timezone.utc)

    # Pesos por mes (índice 0 = enero): más ventas en mayo, oct, dic
    pesos_mes = [1, 1, 1.2, 1.2, 1.8, 1, 1, 1, 1, 1.8, 1.2, 2.0]

    # Elige un mes con probabilidad ponderada
    meses = list(range(12))
    mes_elegido = rng.choices(meses, weights=pesos_mes, k=1)[0]

    # Retrocede al mes correcto dentro del último año
    año = ahora.year if mes_elegido <= ahora.month - 1 else ahora.year - 1
    dia = rng.randint(1, 28)
    hora = rng.randint(8, 22)
    minuto = rng.randint(0, 59)

    return datetime(año, mes_elegido + 1, dia, hora, minuto, tzinfo=timezone.utc)


def generar_cantidad(rng: Random, precio: float) -> int:
    """
    Productos baratos se compran en mayor cantidad.
    Productos caros casi siempre se compran de a 1.
    """
    if precio < 150000:
        return rng.choices([1, 2, 3], weights=[50, 35, 15])[0]
    elif precio < 300000:
        return rng.choices([1, 2], weights=[70, 30])[0]
    else:
        return 1


def seed_pedidos(session, cliente: Cliente) -> int:
    producto_ids = list(PRODUCTOS.keys())
    canales = list(CanalContactoEnum)
    pedidos_creados = 0

    for i in range(N_PEDIDOS):
        # Elige un producto (algunos se venden más que otros)
        pesos_productos = [1.5 if j == 0 else 1.0 for j in range(len(producto_ids))]
        producto_id = RNG.choices(producto_ids, weights=pesos_productos)[0]
        precio = PRODUCTOS[producto_id]

        cantidad = generar_cantidad(RNG, precio)
        fecha_pedido = generar_fecha_pedido(RNG)
        fecha_entrega = fecha_pedido + timedelta(days=RNG.randint(2, 5))

        # 90% entregados, 10% enviados (para que el ML tenga mayoría "completos")
        estado = RNG.choices(
            [EstadoPedidoEnum.entregado, EstadoPedidoEnum.enviado],
            weights=[90, 10]
        )[0]

        pedido = Pedido(
            estado=estado,
            fecha_pedido=fecha_pedido,
            fecha_entrega=fecha_entrega if estado == EstadoPedidoEnum.entregado else None,
            total=float(precio * cantidad),
            canal_contacto=RNG.choice(canales),
            cliente_id=cliente.id,
        )
        session.add(pedido)
        session.flush()

        item = ItemPedido(
            cantidad=cantidad,
            precio_unitario=precio,
            pedido_id=pedido.id,
            producto_id=producto_id,
        )
        session.add(item)
        pedidos_creados += 1

    return pedidos_creados


def limpiar_seed_anterior(session) -> None:
    """Elimina pedidos del cliente ML seed para poder re-correr sin duplicar."""
    usuario = session.query(Usuario).filter_by(correo=SEED_CLIENT_EMAIL).first()
    if not usuario or not usuario.cliente:
        return

    cliente_id = usuario.cliente.id
    pedidos = session.query(Pedido).filter_by(cliente_id=cliente_id).all()
    for p in pedidos:
        for item in p.items:
            session.delete(item)
        session.delete(p)
    session.flush()
    print(f"  Se limpiaron pedidos anteriores del cliente ML seed.")


def main():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()

    try:
        print("━━━ seed_pedidos_ml.py ━━━")
        print(f"  Empresa ID   : {EMPRESA_ID}")
        print(f"  Productos    : {list(PRODUCTOS.keys())}")
        print(f"  Pedidos a crear: {N_PEDIDOS}")
        print()

        limpiar_seed_anterior(session)
        cliente = get_or_create_cliente(session)
        print(f"  Cliente ML seed ID: {cliente.id}")

        total = seed_pedidos(session, cliente)
        session.commit()

        print(f"\n✓ Pedidos creados: {total}")
        print("  Ahora puedes entrenar el modelo con el endpoint /empresa/entrenar")
        print("  o el script de entrenamiento que uses.")

    except Exception as e:
        session.rollback()
        print(f"\n✗ Error: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()