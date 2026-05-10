#!/usr/bin/env python3
"""Test directo del endpoint de encuestas respondidas"""

import sys
sys.path.insert(0, '/home/angel/Documents/coding/int3_2026-1_2/ZonaZapatos/backend')

from sqlalchemy import create_engine, text
from sqlalchemy.orm import joinedload

# Importar modelos
from app.core.database import SessionLocal
from app.encuestas.models import EncuestaSatisfaccion
from app.pedidos.models import Pedido

# Simular la consulta del endpoint
db = SessionLocal()

try:
    pedido_id = 315
    cliente_id = 2  # angelleonardomoco@ufps.edu.co
    
    print("="*60)
    print(f"Simulando endpoint /encuestas/pedido/{pedido_id}/respondidas")
    print(f"Cliente ID: {cliente_id}")
    print("="*60)
    
    # Consulta exacta como en el endpoint
    encuestas = (
        db.query(EncuestaSatisfaccion)
        .options(joinedload(EncuestaSatisfaccion.producto))
        .join(Pedido)
        .filter(
            Pedido.id == pedido_id,
            Pedido.cliente_id == cliente_id,
            EncuestaSatisfaccion.respondida == True,
        )
        .order_by(EncuestaSatisfaccion.respondida_en.desc())
        .all()
    )
    
    print(f"\n✅ Encuestas encontradas: {len(encuestas)}")
    
    for e in encuestas:
        comentario_info = f"'{e.comentario}'" if e.comentario else "NULL"
        print(f"  ID {e.id}: Calificación={e.calificacion}, Comentario={comentario_info}")
    
    # Verificar TODAS las encuestas del pedido sin filtro
    print("\n" + "="*60)
    print(f"TODAS las encuestas del pedido {pedido_id} (sin filtro)")
    print("="*60)
    
    todas = (
        db.query(EncuestaSatisfaccion)
        .filter(EncuestaSatisfaccion.pedido_id == pedido_id)
        .all()
    )
    
    print(f"\nTotal: {len(todas)}")
    for e in todas:
        respondida_str = "✅" if e.respondida else "⏳"
        comentario_info = f"comentario='{e.comentario}'" if e.comentario else "sin comentario"
        print(f"  {respondida_str} ID {e.id}: {comentario_info}")
    
    print("\n" + "="*60)
    print("Diagnóstico:")
    print("="*60)
    
    encuestas_respondidas = [e for e in todas if e.respondida]
    print(f"\nEncuestas respondidas: {len(encuestas_respondidas)}")
    
    for e in encuestas_respondidas:
        if not e.comentario:
            print(f"  ⚠️  ID {e.id}: Respondida SIN comentario - ¿Aparece en endpoint? ", end="")
            # Verificar si aparecería en el endpoint
            aparece = any(enc.id == e.id for enc in encuestas)
            print(f"{'SÍ ✅' if aparece else 'NO ❌'}")

finally:
    db.close()
