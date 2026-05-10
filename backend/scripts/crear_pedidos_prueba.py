#!/usr/bin/env python3
"""Crea pedidos de prueba para angelleonardomoco@ufps.edu.co"""

import sys
sys.path.insert(0, '/home/angel/Documents/coding/int3_2026-1_2/ZonaZapatos/backend')

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timezone

# Leer DATABASE_URL
with open('/home/angel/Documents/coding/int3_2026-1_2/ZonaZapatos/backend/.env', 'r') as f:
    for line in f:
        if line.startswith('DATABASE_URL='):
            db_url = line.strip().split('=', 1)[1]
            break

engine = create_engine(db_url)
Session = sessionmaker(bind=engine)
session = Session()

# Productos disponibles
productos_raw = session.execute(text("SELECT id, nombre, descripcion, precio FROM productos LIMIT 5")).fetchall()

productos = []
for p in productos_raw:
    productos.append({
        'id': p[0],
        'nombre': p[1],
        'sku': f'PROD{p[0]}',
        'descripcion': (p[2] or p[1])[:200],
        'precio': p[3],
        'imagen': ''
    })
    print(f"Producto {p[0]}: {p[1]} - ${p[3]}")

if len(productos) < 2:
    print("ERROR: Se necesitan al menos 2 productos")
    session.close()
    sys.exit(1)

cliente_id = 37
direccion = session.execute(text("SELECT direccion FROM clientes WHERE id = :cid"), {"cid": cliente_id}).fetchone()
direccion_envio = direccion[0] if direccion and direccion[0] else "Calle 123 #45-67, Cúcuta"

ahora = datetime.now(timezone.utc)
pedidos_creados = []

print(f"\n>>> Creando pedidos para cliente {cliente_id}...")

for i in range(2):
    result = session.execute(text("""
        INSERT INTO pedidos (estado, fecha_pedido, total, canal_contacto, cliente_id, direccion_envio)
        VALUES ('confirmado', :fecha, 0, 'web', :cliente_id, :direccion)
        RETURNING id
    """), {"fecha": ahora, "cliente_id": cliente_id, "direccion": direccion_envio})
    pedido_id = result.fetchone()[0]
    pedidos_creados.append(pedido_id)
    
    # 2 productos diferentes por pedido
    prod1 = productos[0]
    prod2 = productos[(i+1) % len(productos)]
    
    total = 0
    for prod in [prod1, prod2]:
        cantidad = 1
        subtotal = prod['precio'] * cantidad
        total += subtotal
        
        session.execute(text("""
            INSERT INTO items_pedido 
            (pedido_id, producto_id, cantidad, precio_unitario,
             producto_nombre_snapshot, producto_sku_snapshot, 
             producto_descripcion_snapshot, producto_imagen_url_snapshot)
            VALUES (:pedido_id, :producto_id, :cantidad, :precio,
                    :nombre, :sku, :descripcion, :imagen)
        """), {
            "pedido_id": pedido_id,
            "producto_id": prod['id'],
            "cantidad": cantidad,
            "precio": prod['precio'],
            "nombre": prod['nombre'],
            "sku": prod['sku'],
            "descripcion": prod['descripcion'],
            "imagen": prod['imagen']
        })
        print(f"   + {prod['nombre']} x{cantidad} = ${subtotal:,.0f}")
    
    session.execute(text("UPDATE pedidos SET total = :total WHERE id = :pid"),
                   {"total": total, "pid": pedido_id})
    print(f"   Pedido #{pedido_id} creado - Total: ${total:,.0f}\n")

session.commit()

# Marcar como entregados y crear encuestas
print(f">>> Marcando como ENTREGADOS y creando encuestas...")
for pedido_id in pedidos_creados:
    session.execute(text("UPDATE pedidos SET estado = 'entregado', fecha_entrega = :ahora WHERE id = :pid"),
                   {"ahora": ahora, "pid": pedido_id})
    
    items = session.execute(text("SELECT producto_id FROM items_pedido WHERE pedido_id = :pid"),
                          {"pid": pedido_id}).fetchall()
    
    for item in items:
        producto_id = item[0]
        existente = session.execute(text("""
            SELECT id FROM encuestas_satisfaccion 
            WHERE pedido_id = :pedido_id AND producto_id = :producto_id
        """), {"pedido_id": pedido_id, "producto_id": producto_id}).fetchone()
        
        if not existente:
            session.execute(text("""
                INSERT INTO encuestas_satisfaccion 
                (pedido_id, producto_id, respondida, omitida, enviada_en, recordatorio_activo)
                VALUES (:pedido_id, :producto_id, false, false, :ahora, false)
            """), {"pedido_id": pedido_id, "producto_id": producto_id, "ahora": ahora})
            print(f"   ✅ Encuesta: Pedido #{pedido_id} - Producto #{producto_id}")

session.commit()

print(f"\n{'='*60}")
print(f"✅ LISTO! Pedidos: {pedidos_creados}")
print(f"   Usuario: angelleonardomoco@ufps.edu.co")
print(f"   Ahora inicia sesión para ver los recordatorios")
print(f"{'='*60}")

session.close()
