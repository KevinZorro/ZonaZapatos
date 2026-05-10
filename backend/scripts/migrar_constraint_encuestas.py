#!/usr/bin/env python3
"""
Migración: Cambia constraint de encuestas_satisfaccion
De: UNIQUE (pedido_id)  ->  A: UNIQUE (pedido_id, producto_id)
Esto permite múltiples encuestas por pedido (una por cada producto)
"""

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
    print("="*60)
    print("MIGRACIÓN: Cambiar constraint de encuestas_satisfaccion")
    print("="*60)
    
    # 1. Verificar constraint existente
    print("\n1. Verificando constraints actuales...")
    result = conn.execute(text("""
        SELECT conname, pg_get_constraintdef(oid) 
        FROM pg_constraint 
        WHERE conrelid = 'encuestas_satisfaccion'::regclass
        AND contype = 'u'
    """))
    constraints = result.fetchall()
    
    for c in constraints:
        print(f"   Encontrado: {c[0]} -> {c[1]}")
    
    # 2. Eliminar constraint único antiguo si existe
    print("\n2. Eliminando constraint único antiguo (si existe)...")
    try:
        conn.execute(text("""
            ALTER TABLE encuestas_satisfaccion 
            DROP CONSTRAINT IF EXISTS encuestas_satisfaccion_pedido_id_key
        """))
        print("   ✅ Constraint antiguo eliminado")
    except Exception as e:
        print(f"   ℹ️  No se encontró constraint antiguo o ya fue eliminado: {e}")
    
    # 3. Crear nuevo constraint único por combinación
    print("\n3. Creando nuevo constraint único (pedido_id, producto_id)...")
    try:
        conn.execute(text("""
            ALTER TABLE encuestas_satisfaccion 
            ADD CONSTRAINT unique_pedido_producto 
            UNIQUE (pedido_id, producto_id)
        """))
        print("   ✅ Nuevo constraint creado exitosamente")
    except Exception as e:
        if "already exists" in str(e):
            print("   ℹ️  El constraint ya existe")
        else:
            raise
    
    # 4. Asegurar que producto_id no sea NULL
    print("\n4. Asegurando que producto_id no sea NULL...")
    conn.execute(text("""
        UPDATE encuestas_satisfaccion 
        SET producto_id = 1 
        WHERE producto_id IS NULL
    """))
    
    # 5. Agregar constraint NOT NULL a producto_id si es necesario
    print("\n5. Modificando producto_id para que sea NOT NULL...")
    try:
        conn.execute(text("""
            ALTER TABLE encuestas_satisfaccion 
            ALTER COLUMN producto_id SET NOT NULL
        """))
        print("   ✅ producto_id ahora es NOT NULL")
    except Exception as e:
        print(f"   ℹ️  Nota: {e}")
    
    conn.commit()
    
    print("\n" + "="*60)
    print("✅ MIGRACIÓN COMPLETADA EXITOSAMENTE")
    print("="*60)
    print("\nAhora puedes:")
    print("   • Crear múltiples encuestas por pedido")
    print("   • Un cliente puede reseñar cada producto individualmente")
    print("   • Cada producto del pedido tendrá su propia encuesta")
    print("="*60)
    
except Exception as e:
    conn.rollback()
    print(f"\n❌ ERROR: {e}")
    print("La migración falló. Revisa el error arriba.")
    sys.exit(1)
finally:
    conn.close()
