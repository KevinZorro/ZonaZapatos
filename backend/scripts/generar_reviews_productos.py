#!/usr/bin/env python3
"""
Genera reseñas de prueba para productos.
- 85% de productos con reseñas
- ~80% con calificación 4-5 (buenas)
- ~20% con calificación 1-3 (mixtas)
- 2 productos específicos con calificación baja (1-2)
- 15% sin reseñas
"""

import sys
sys.path.insert(0, '/home/angel/Documents/coding/int3_2026-1_2/ZonaZapatos/backend')

from sqlalchemy import create_engine, text
from datetime import datetime, timezone
import random

# Leer DATABASE_URL
with open('/home/angel/Documents/coding/int3_2026-1_2/ZonaZapatos/backend/.env', 'r') as f:
    for line in f:
        if line.startswith('DATABASE_URL='):
            db_url = line.strip().split('=', 1)[1]
            break

engine = create_engine(db_url)
conn = engine.connect()

try:
    print("="*70)
    print("GENERADOR DE RESEÑAS PARA PRODUCTOS")
    print("="*70)
    
    # 0. Limpiar reseñas de prueba anteriores (respondidas con comentarios)
    print("\n🧹 Limpiando reseñas anteriores...")
    result = conn.execute(text('''
        SELECT COUNT(*) FROM encuestas_satisfaccion 
        WHERE respondida = true AND comentario IS NOT NULL
    '''))
    count_anterior = result.fetchone()[0]
    
    if count_anterior > 0:
        # Obtener pedidos asociados a estas encuestas para borrarlos también
        result = conn.execute(text('''
            SELECT DISTINCT pedido_id FROM encuestas_satisfaccion 
            WHERE respondida = true AND comentario IS NOT NULL
        '''))
        pedidos_a_borrar = [row[0] for row in result.fetchall()]
        
        # Borrar encuestas primero (por foreign key)
        conn.execute(text('''
            DELETE FROM encuestas_satisfaccion 
            WHERE respondida = true AND comentario IS NOT NULL
        '''))
        
        # Borrar items_pedido y pedidos asociados
        if pedidos_a_borrar:
            conn.execute(text('''
                DELETE FROM items_pedido WHERE pedido_id = ANY(:pedidos)
            '''), {'pedidos': pedidos_a_borrar})
            conn.execute(text('''
                DELETE FROM pedidos WHERE id = ANY(:pedidos) AND estado = 'entregado'
            '''), {'pedidos': pedidos_a_borrar})
        
        print(f"   ✅ Eliminadas {count_anterior} reseñas anteriores")
        print(f"   ✅ Eliminados {len(pedidos_a_borrar)} pedidos de prueba")
    else:
        print("   ℹ️  No hay reseñas anteriores para limpiar")
    
    # 1. Obtener productos
    result = conn.execute(text('SELECT id, nombre FROM productos'))
    productos = result.fetchall()
    total_productos = len(productos)
    print(f"\n📦 Total productos: {total_productos}")
    
    # 2. Obtener clientes
    result = conn.execute(text('''
        SELECT c.id, u.correo, c.nombre 
        FROM clientes c 
        JOIN usuarios u ON c.usuario_id = u.id 
        WHERE u.rol = 'cliente'
    '''))
    clientes = result.fetchall()
    print(f"👥 Total clientes: {len(clientes)}")
    
    if not productos or not clientes:
        print("❌ No hay productos o clientes suficientes")
        sys.exit(1)
    
    # 3. Calcular cuántos productos tendrán reseñas (85%)
    productos_con_reviews = int(total_productos * 0.85)
    productos_sin_reviews = total_productos - productos_con_reviews
    
    print(f"\n📊 Plan:")
    print(f"   - Productos CON reseñas: {productos_con_reviews} (85%)")
    print(f"   - Productos SIN reseñas: {productos_sin_reviews} (15%)")
    
    # Mezclar y seleccionar
    random.shuffle(productos)
    productos_a_resear = productos[:productos_con_reviews]
    productos_sin_resear = productos[productos_con_reviews:]
    
    # Seleccionar 2 productos para calificación baja
    productos_baja_calificacion = random.sample(productos_a_resear, 2)
    ids_baja_calificacion = {p[0] for p in productos_baja_calificacion}
    
    print(f"\n⭐ 2 productos con baja calificación:")
    for p in productos_baja_calificacion:
        print(f"   - {p[1]} (ID: {p[0]})")
    
    # Comentarios de ejemplo
    comentarios_positivos = [
        "Excelente producto, superó mis expectativas",
        "Muy buena calidad, lo recomiendo totalmente",
        "Me encantó, justo lo que buscaba",
        "Calidad precio inmejorable, volveré a comprar",
        "Producto de alta calidad, entrega rápida",
        "Perfecto, muy satisfecho con la compra",
        "Mejor de lo esperado, excelente servicio",
        "Producto original, muy buen estado",
        "Muy cómodo y de buenos materiales",
        "Llegó rápido y en perfectas condiciones",
        "Excelente diseño y calidad",
        "Muy buen producto, lo recomiendo",
        "Superó mis expectativas, muy bueno",
        "Calidad excelente, precio justo",
        "Producto muy resistente y duradero"
    ]
    
    comentarios_negativos = [
        "No me gustó la calidad, esperaba más",
        "El producto llegó con defectos",
        "Mala calidad, no lo recomiendo",
        "No cumplió con mis expectativas",
        "Producto defectuoso, pésimo servicio",
        "Calidad muy baja para el precio",
        "Me arrepiento de la compra",
        "No es lo que aparece en la foto",
        "Muy frágil, se dañó rápido",
        "Pésima calidad, dinero perdido"
    ]
    
    comentarios_neutros = [
        "Producto regular, cumple su función",
        "Está bien por el precio",
        "Calidad promedio, nada especial",
        "Cumple pero no es excelente",
        "Regular, esperaba un poco más",
        "Aceptable por el precio pagado"
    ]
    
    reviews_creadas = 0
    ahora = datetime.now(timezone.utc)
    
    print(f"\n📝 Generando reseñas...")
    
    for i, producto in enumerate(productos_a_resear):
        producto_id = producto[0]
        producto_nombre = producto[1]
        
        # Determinar cantidad de reviews (1-3 por producto)
        num_reviews = random.randint(1, 3)
        
        # Determinar si es producto de baja calificación
        es_baja_calificacion = producto_id in ids_baja_calificacion
        
        for j in range(num_reviews):
            # Seleccionar cliente aleatorio
            cliente = random.choice(clientes)
            cliente_id = cliente[0]
            cliente_nombre = cliente[2] or cliente[1]
            
            # Determinar calificación
            if es_baja_calificacion:
                calificacion = random.randint(1, 2)
                comentario = random.choice(comentarios_negativos)
            else:
                # 95% calificaciones 4-5 (altas), solo 5% calificaciones 3 (neutras)
                if random.random() < 0.95:
                    calificacion = random.randint(4, 5)
                    comentario = random.choice(comentarios_positivos)
                else:
                    calificacion = 3  # Solo neutras, no negativas
                    comentario = random.choice(comentarios_neutros)
            
            # Crear pedido para este cliente
            result = conn.execute(text('''
                INSERT INTO pedidos (estado, fecha_pedido, total, canal_contacto, cliente_id, direccion_envio, fecha_entrega)
                VALUES ('entregado', :ahora, :precio, 'web', :cliente_id, 'Dirección de prueba', :ahora)
                RETURNING id
            '''), {
                'ahora': ahora,
                'precio': random.randint(100000, 500000),
                'cliente_id': cliente_id
            })
            pedido_id = result.fetchone()[0]
            
            # Agregar item al pedido
            conn.execute(text('''
                INSERT INTO items_pedido 
                (pedido_id, producto_id, cantidad, precio_unitario, producto_nombre_snapshot)
                VALUES (:pedido_id, :producto_id, 1, :precio, :nombre)
            '''), {
                'pedido_id': pedido_id,
                'producto_id': producto_id,
                'precio': random.randint(100000, 500000),
                'nombre': producto_nombre
            })
            
            # Crear encuesta respondida
            conn.execute(text('''
                INSERT INTO encuestas_satisfaccion 
                (pedido_id, producto_id, calificacion, comentario, respondida, omitida, enviada_en, respondida_en, recordatorio_activo)
                VALUES (:pedido_id, :producto_id, :calificacion, :comentario, true, false, :ahora, :ahora, false)
            '''), {
                'pedido_id': pedido_id,
                'producto_id': producto_id,
                'calificacion': calificacion,
                'comentario': comentario,
                'ahora': ahora
            })
            
            reviews_creadas += 1
        
        if (i + 1) % 10 == 0:
            print(f"   Procesados {i + 1}/{productos_con_reviews} productos...")
    
    conn.commit()
    
    # Mostrar resumen por productos
    print(f"\n📈 RESUMEN:")
    print(f"   ✅ Reviews creadas: {reviews_creadas}")
    print(f"   ✅ Productos con reviews: {productos_con_reviews}")
    print(f"   ✅ Productos sin reviews: {productos_sin_reviews}")
    
    # Calcular promedio por producto
    result = conn.execute(text('''
        SELECT p.id, p.nombre, COUNT(e.id) as num_reviews, AVG(e.calificacion) as promedio
        FROM productos p
        LEFT JOIN encuestas_satisfaccion e ON p.id = e.producto_id AND e.respondida = true
        GROUP BY p.id, p.nombre
        HAVING COUNT(e.id) > 0
        ORDER BY promedio DESC
    '''))
    
    print(f"\n🏆 Top 10 productos mejor valorados:")
    for i, row in enumerate(result.fetchall()[:10]):
        print(f"   {i+1}. {row[1][:40]:<40} ⭐ {row[3]:.1f} ({int(row[2])} reviews)")
    
    print(f"\n👎 Productos con baja valoración:")
    result = conn.execute(text('''
        SELECT p.id, p.nombre, COUNT(e.id) as num_reviews, AVG(e.calificacion) as promedio
        FROM productos p
        JOIN encuestas_satisfaccion e ON p.id = e.producto_id AND e.respondida = true
        GROUP BY p.id, p.nombre
        HAVING AVG(e.calificacion) < 3
        ORDER BY promedio ASC
    '''))
    for row in result.fetchall():
        print(f"   ⭐ {row[3]:.1f} - {row[1][:40]} ({int(row[2])} reviews)")
    
    print(f"\n" + "="*70)
    print("✅ GENERACIÓN COMPLETADA")
    print("="*70)
    print("\nAhora puedes ver las reseñas en:")
    print("   - Frontend: Catálogo de productos (ver reseñas)")
    print("   - Backend: GET /productos/{id}/reviews")
    print("="*70)

except Exception as e:
    conn.rollback()
    print(f"\n❌ ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
finally:
    conn.close()
