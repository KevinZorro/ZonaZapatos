"""Agrega encuestas para productos de pedidos entregados que aún no tienen encuesta."""
import sys
sys.path.insert(0, '/home/angel/Documents/coding/int3_2026-1_2/ZonaZapatos/backend')

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings


def agregar_encuestas_faltantes():
    engine = create_engine(settings.database_url)
    Session = sessionmaker(bind=engine)
    db = Session()
    
    try:
        # Buscar todos los pedidos entregados
        query = text("""
            SELECT DISTINCT p.id, p.fecha_entrega
            FROM pedidos p
            WHERE p.estado = 'entregado'
            ORDER BY p.id
        """)
        
        result = db.execute(query)
        pedidos = result.fetchall()
        
        print(f"Procesando {len(pedidos)} pedidos entregados...")
        encuestas_creadas = 0
        
        for row in pedidos:
            pedido_id = row[0]
            fecha_entrega = row[1]
            
            # Obtener productos del pedido que NO tienen encuesta
            query_faltantes = text("""
                SELECT ip.producto_id 
                FROM items_pedido ip
                WHERE ip.pedido_id = :pedido_id 
                AND ip.producto_id IS NOT NULL
                AND ip.producto_id NOT IN (
                    SELECT es.producto_id 
                    FROM encuestas_satisfaccion es 
                    WHERE es.pedido_id = :pedido_id
                )
            """)
            
            result_faltantes = db.execute(query_faltantes, {'pedido_id': pedido_id})
            productos_faltantes = [r[0] for r in result_faltantes.fetchall()]
            
            if productos_faltantes:
                print(f"Pedido {pedido_id}: creando {len(productos_faltantes)} encuestas faltantes...")
                
                for producto_id in productos_faltantes:
                    try:
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
                        encuestas_creadas += 1
                        
                    except Exception as e:
                        db.rollback()
                        print(f"  ✗ Error: {e}")
                        continue
            else:
                print(f"Pedido {pedido_id}: todas las encuestas ya existen ✓")
        
        print(f"\nTotal encuestas creadas: {encuestas_creadas}")
        print("Proceso completado!")
        
    finally:
        db.close()


if __name__ == "__main__":
    agregar_encuestas_faltantes()
