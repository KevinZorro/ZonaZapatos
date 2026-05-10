#!/usr/bin/env python3
"""Verificar estado de encuesta específica"""

import sys
sys.path.insert(0, '/home/angel/Documents/coding/int3_2026-1_2/ZonaZapatos/backend')

from sqlalchemy import create_engine, text

# Leer DATABASE_URL
with open('/home/angel/Documents/coding/int3_2026-1_2/ZonaZapatos/backend/.env', 'r') as f:
    for line in f:
        if line.startswith('DATABASE_URL='):
            db_url = line.strip().split('=', 1)[1]
            break

engine = create_engine(db_url)
conn = engine.connect()

try:
    # Verificar encuesta #396
    print("="*60)
    print("Verificando encuesta #396")
    print("="*60)
    
    result = conn.execute(text('''
        SELECT id, calificacion, comentario, respondida, omitida, 
               respondida_en, pedido_id, producto_id
        FROM encuestas_satisfaccion 
        WHERE id = 396
    '''))
    encuesta = result.fetchone()
    
    if encuesta:
        print(f"\nID: {encuesta[0]}")
        print(f"Calificación: {encuesta[1]}")
        print(f"Comentario: '{encuesta[2]}' (len={len(encuesta[2]) if encuesta[2] else 0})")
        print(f"Respondida: {encuesta[3]}")
        print(f"Omitida: {encuesta[4]}")
        print(f"Respondida en: {encuesta[5]}")
        print(f"Pedido ID: {encuesta[6]}")
        print(f"Producto ID: {encuesta[7]}")
    else:
        print("❌ No se encontró la encuesta #396")
    
    # Verificar TODAS las encuestas del pedido 315
    print("\n" + "="*60)
    print("Todas las encuestas del pedido #315")
    print("="*60)
    
    result = conn.execute(text('''
        SELECT id, calificacion, comentario, respondida, producto_id
        FROM encuestas_satisfaccion 
        WHERE pedido_id = 315
        ORDER BY id
    '''))
    
    encuestas = result.fetchall()
    print(f"\nTotal encuestas: {len(encuestas)}")
    
    for e in encuestas:
        comentario_str = f"'{e[2]}'" if e[2] else "NULL"
        respondida_str = "✅ Respondida" if e[3] else "⏳ Pendiente"
        print(f"  ID {e[0]}: Calificación={e[1]}, Comentario={comentario_str}, {respondida_str}")
    
    # Contar respondidas vs pendientes
    respondidas = [e for e in encuestas if e[3]]
    print(f"\n📊 Resumen:")
    print(f"   Respondidas: {len(respondidas)}")
    print(f"   Pendientes: {len(encuestas) - len(respondidas)}")
    
    print("\n" + "="*60)
    print("Encuestas respondidas del pedido 315 (para debug)")
    print("="*60)
    
    for e in respondidas:
        comentario_info = f"con comentario" if e[2] else "SIN comentario"
        print(f"  ID {e[0]}: ⭐ {e[1]} ({comentario_info})")

finally:
    conn.close()
