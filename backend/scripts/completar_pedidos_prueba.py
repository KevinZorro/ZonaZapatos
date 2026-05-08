#!/usr/bin/env python3
"""Completa los pedidos de prueba: marca como entregados y crea encuestas"""

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

cliente_id = 37
ahora = datetime.now(timezone.utc)

# Buscar los últimos pedidos creados para este cliente
pedidos = session.execute(text("""
    SELECT id, estado, total FROM pedidos 
    WHERE cliente_id = :cid 
    ORDER BY id DESC LIMIT 2
"""), {"cid": cliente_id}).fetchall()

print(f"Pedidos encontrados para cliente {cliente_id}:")
for p in pedidos:
    print(f"  Pedido #{p[0]} - Estado: {p[1]} - Total: ${p[2]:,.0f}")

# Marcar como entregados y crear encuestas
print(f"\n>>> Marcando como ENTREGADOS y creando encuestas...")
encuestas_creadas = 0

for pedido in pedidos:
    pedido_id = pedido[0]
    
    # Marcar como entregado
    session.execute(text("""
        UPDATE pedidos 
        SET estado = 'entregado', fecha_entrega = :ahora 
        WHERE id = :pid
    """), {"ahora": ahora, "pid": pedido_id})
    print(f"\n  Pedido #{pedido_id}: Marcado como ENTREGADO")
    
    # Buscar items del pedido
    items = session.execute(text("""
        SELECT producto_id, producto_nombre_snapshot 
        FROM items_pedido 
        WHERE pedido_id = :pid
    """), {"pid": pedido_id}).fetchall()
    
    print(f"    Productos ({len(items)}):")
    
    # Verificar si ya existe encuesta para este pedido
    existente = session.execute(text("""
        SELECT id, producto_id FROM encuestas_satisfaccion 
        WHERE pedido_id = :pedido_id
    """), {"pedido_id": pedido_id}).fetchone()
    
    if existente:
        print(f"      ℹ️  Ya existe encuesta #{existente[0]} para este pedido")
    else:
        # Crear una sola encuesta usando el primer producto (limitación actual del constraint)
        primer_producto = items[0]
        producto_id = primer_producto[0]
        nombre = primer_producto[1]
        
        session.execute(text("""
            INSERT INTO encuestas_satisfaccion 
            (pedido_id, producto_id, respondida, omitida, enviada_en, recordatorio_activo)
            VALUES (:pedido_id, :producto_id, false, false, :ahora, false)
        """), {"pedido_id": pedido_id, "producto_id": producto_id, "ahora": ahora})
        encuestas_creadas += 1
        print(f"      ✅ {nombre}: Encuesta creada (Producto #{producto_id})")
    
    # Mostrar otros productos del pedido
    if len(items) > 1:
        print(f"      📦 Otros productos en este pedido:")
        for item in items[1:]:
            print(f"         - {item[1]} (ID: {item[0]})")

session.commit()

print(f"\n{'='*60}")
print(f"✅ PEDIDOS COMPLETADOS!")
print(f"{'='*60}")
print(f"\nUsuario: angelleonardomoco@ufps.edu.co")
print(f"Pedidos: {[p[0] for p in pedidos]}")
print(f"Encuestas creadas: {encuestas_creadas}")
print(f"\n📝 Prueba ahora:")
print(f"   1. Inicia sesión en http://localhost:5173")
print(f"   2. Debería aparecer el MODAL de recordatorio")
print(f"   3. O ve a 'Mis Pedidos' -> Pedidos entregados")
print(f"{'='*60}")

session.close()
