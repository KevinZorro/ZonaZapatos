"""Crea encuestas pendientes para pedidos entregados que no tengan encuesta."""
import sys
sys.path.insert(0, '/home/angel/Documents/coding/int3_2026-1_2/ZonaZapatos/backend')

from datetime import datetime, timezone
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings


def crear_encuestas_pendientes():
    # Crear conexión directa a la base de datos
    engine = create_engine(settings.database_url)
    Session = sessionmaker(bind=engine)
    db = Session()
    
    try:
        # Buscar pedidos entregados que no tengan encuestas
        query = text("""
            SELECT DISTINCT p.id, p.fecha_entrega
            FROM pedidos p
            LEFT JOIN encuestas_satisfaccion es ON p.id = es.pedido_id
            WHERE p.estado = 'entregado'
            AND es.id IS NULL
            ORDER BY p.id
        """)
        
        result = db.execute(query)
        pedidos = result.fetchall()
        
        print(f"Encontrados {len(pedidos)} pedidos entregados sin encuestas")
        
        for row in pedidos:
            pedido_id = row[0]
            fecha_entrega = row[1]
            
            # Obtener todos los productos del pedido
            items_query = text("""
                SELECT producto_id FROM items_pedido 
                WHERE pedido_id = :pedido_id AND producto_id IS NOT NULL
            """)
            items_result = db.execute(items_query, {'pedido_id': pedido_id})
            productos = [r[0] for r in items_result.fetchall()]
            
            if not productos:
                print(f"⚠ Pedido {pedido_id} no tiene productos, saltando...")
                continue
            
            print(f"Creando {len(productos)} encuestas para pedido {pedido_id}...")
            
            for producto_id in productos:
                try:
                    # Crear encuesta
                    insert_query = text("""
                        INSERT INTO encuestas_satisfaccion 
                        (pedido_id, producto_id, calificacion, comentario, respondida, omitida, 
                         recordatorio_activo, enviada_en, respondida_en)
                        VALUES 
                        (:pedido_id, :producto_id, NULL, NULL, FALSE, FALSE, FALSE, 
                         COALESCE(:fecha_entrega, NOW()), NULL)
                        RETURNING id
                    """)
                    
                    result = db.execute(insert_query, {
                        'pedido_id': pedido_id,
                        'producto_id': producto_id,
                        'fecha_entrega': fecha_entrega
                    })
                    encuesta_id = result.scalar()
                    db.commit()
                    print(f"  ✓ Encuesta {encuesta_id} para producto {producto_id}")
                    
                except Exception as e:
                    db.rollback()
                    print(f"  ✗ Error creando encuesta para producto {producto_id}: {e}")
                    continue
        
        print("\nProceso completado!")
        
    finally:
        db.close()


if __name__ == "__main__":
    crear_encuestas_pendientes()
