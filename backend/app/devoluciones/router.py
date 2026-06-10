"""Devoluciones router - Endpoints para gestión de devoluciones."""
import json
import os
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.devoluciones.models import Devolucion, EvidenciaDevolucion, ItemDevolucion, TipoArchivoEnum
from app.devoluciones.schemas import (
    DevolucionCreate, DevolucionOut, DevolucionEstadoUpdate,
    EvidenciaOut, ClienteInfo, ProductoSnapshot, PedidoInfo,
    DevolucionDetalleEmpresa, DevolucionPendienteOut,
    DevolucionClienteOut, ItemDevolucionOut,
    PedidoDisponibilidadDevolucion, ItemDisponibilidadDevolucion
)
from app.pedidos.models import Pedido, ItemPedido
from app.productos.models import Producto
from app.usuarios.models import Usuario, Cliente
from sqlalchemy.orm import joinedload
from app.core.cloudinary_client import upload_file
import io

router = APIRouter(prefix="/devoluciones", tags=["devoluciones"])

# Lista de motivos permitidos para devolución
MOTIVOS_PERMITIDOS = [
    "Producto dañado",
    "Talla/Color incorrecto", 
    "No era lo esperado",
    "Calidad inferior a la esperada",
    "Producto defectuoso",
    "Otro"
]

@router.get("/debug-user", response_model=dict)
async def debug_user(
    current_user_payload: dict = Depends(get_current_user)
):
    """Endpoint temporal para verificar el usuario logueado."""
    return {
        "current_user_payload": current_user_payload,
        "user_id": current_user_payload.get("sub"),
        "rol": current_user_payload.get("rol")
    }

@router.post("/", response_model=dict)
async def crear_devolucion(
    pedido_id: int = Form(...),
    items: str = Form(...),  # JSON string con array de ItemDevolucionCreate
    comentario_general: str = Form(None),
    evidencias: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user_payload: dict = Depends(get_current_user)
):
    """Crear una nueva solicitud de devolución con productos específicos."""

    print(f"DEBUG POST: Iniciando creación de devolución")
    print(f"DEBUG POST: pedido_id={pedido_id}, items={items}")
    print(f"DEBUG POST: evidencias count={len(evidencias) if evidencias else 0}")

    # Parsear items JSON
    try:
        items_data = json.loads(items)
        print(f"DEBUG POST: Items parseados: {len(items_data)} items")
        print(f"DEBUG POST: Items data: {items_data}")
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Formato inválido de items: {str(e)}")

    # Validar que hay al menos un item
    if not items_data or len(items_data) == 0:
        raise HTTPException(status_code=400, detail="Debe seleccionar al menos un producto para devolver")

    try:
        # Inicio de transacción atómica
        
        # Obtener el ID del usuario desde el payload JWT
        current_user_id = int(current_user_payload.get("sub", 0))
        print(f"DEBUG POST: current_user_id from JWT={current_user_id}")
        if not current_user_id:
            raise HTTPException(status_code=401, detail="Usuario no autenticado")

        # Buscar el cliente_id correspondiente al usuario
        cliente = db.query(Cliente).filter(Cliente.usuario_id == current_user_id).first()
        print(f"DEBUG POST: cliente found={cliente is not None}")
        if not cliente:
            raise HTTPException(status_code=403, detail="No tienes permisos de cliente")

        current_cliente_id = cliente.id
        print(f"DEBUG POST: current_cliente_id={current_cliente_id}")

        # Verificar que el pedido exista y pertenezca al cliente actual
        print(f"DEBUG POST: Buscando pedido {pedido_id} con cliente_id {current_cliente_id}")
        pedido = db.query(Pedido).options(
            joinedload(Pedido.items).joinedload(ItemPedido.producto)
        ).filter(
            Pedido.id == pedido_id,
            Pedido.cliente_id == current_cliente_id
        ).first()

        if not pedido:
            print(f"DEBUG POST: Pedido no encontrado")
            raise HTTPException(status_code=404, detail="Pedido no encontrado")

        print(f"DEBUG POST: Pedido encontrado, estado={pedido.estado}")

        # Verificar que el pedido esté entregado
        if pedido.estado != "entregado":
            raise HTTPException(
                status_code=400,
                detail="Solo se pueden solicitar devoluciones de pedidos entregados"
            )

        # Validar ventana de devolución POR PRODUCTO según motivo
        # Clasificar motivos
        MOTIVOS_RETRACTO = {"Talla/Color incorrecto", "No era lo esperado", "Otro"}
        MOTIVOS_GARANTIA = {"Producto dañado", "Producto defectuoso", "Calidad inferior a la esperada", "Otro"}

        from datetime import datetime as _dt, timezone as _tz
        ahora = _dt.now(_tz.utc)
        fecha_entrega = pedido.fecha_entrega
        if fecha_entrega:
            if fecha_entrega.tzinfo is None:
                fecha_entrega = fecha_entrega.replace(tzinfo=_tz.utc)
            dias_transcurridos_global = (ahora - fecha_entrega).days
        else:
            dias_transcurridos_global = None

        # Crear mapa de items del pedido para validación
        items_pedido_map = {item.id: item for item in pedido.items}

        # Validar items y motivos
        for item_data in items_data:
            item_pedido_id = item_data.get("item_pedido_id")
            motivo = item_data.get("motivo")

            if item_pedido_id not in items_pedido_map:
                raise HTTPException(status_code=400, detail=f"Item {item_pedido_id} no pertenece al pedido")

            if motivo not in MOTIVOS_PERMITIDOS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Motivo '{motivo}' no válido para item {item_pedido_id}"
                )

            # Validar ventana según motivo (por producto individual)
            item_pedido = items_pedido_map[item_pedido_id]
            producto = item_pedido.producto
            empresa = producto.empresa if producto else None

            if dias_transcurridos_global is not None and empresa:
                dias_transcurridos = dias_transcurridos_global

                if motivo == "Otro":
                    # "Otro" puede ser retracto o garantía — basta con que UNO esté vigente
                    limite_retracto = empresa.dias_devolucion or 15
                    limite_garantia = producto.dias_garantia if producto else 365
                    if dias_transcurridos > limite_retracto and dias_transcurridos > limite_garantia:
                        raise HTTPException(
                            status_code=400,
                            detail=(
                                f"Período de devolución expirado para '{producto.nombre}'. "
                                f"Motivo: '{motivo}'. "
                                f"Retracto expiró a los {limite_retracto} días y garantía a los {limite_garantia} días "
                                f"(han pasado {dias_transcurridos} días)."
                            )
                        )
                elif motivo in MOTIVOS_RETRACTO:
                    # Retracto: validar dias_devolucion de la EMPRESA
                    limite = empresa.dias_devolucion or 15
                    if dias_transcurridos > limite:
                        raise HTTPException(
                            status_code=400,
                            detail=(
                                f"Período de devolución expirado para '{producto.nombre}'. "
                                f"Motivo: '{motivo}' (retracto). "
                                f"Límite: {limite} días desde entrega (han pasado {dias_transcurridos} días)."
                            )
                        )
                elif motivo in MOTIVOS_GARANTIA:
                    # Garantía: validar dias_garantia del PRODUCTO
                    limite = producto.dias_garantia if producto else 365
                    if dias_transcurridos > limite:
                        raise HTTPException(
                            status_code=400,
                            detail=(
                                f"Garantía expirada para '{producto.nombre}'. "
                                f"Motivo: '{motivo}' (garantía). "
                                f"Límite: {limite} días desde entrega (han pasado {dias_transcurridos} días)."
                            )
                        )

        # Verificar que el pedido no tenga ya una devolución
        print(f"DEBUG POST: Verificando devolución existente")
        devolucion_existente = db.query(Devolucion).filter(
            Devolucion.pedido_id == pedido_id
        ).first()

        if devolucion_existente:
            print(f"DEBUG POST: Devolución ya existe: id={devolucion_existente.id}")
            raise HTTPException(
                status_code=400,
                detail="Este pedido ya tiene una solicitud de devolución"
            )

        # Validar que se adjunten al menos una evidencia
        print(f"DEBUG POST: Validando evidencias: {len(evidencias) if evidencias else 0} archivos")
        if not evidencias:
            raise HTTPException(
                status_code=400,
                detail="Debe adjuntar al menos una foto como evidencia"
            )

        # Crear la devolución (motivo general será el primero o genérico)
        motivo_general = items_data[0].get("motivo", "Otro")
        devolucion = Devolucion(
            pedido_id=pedido_id,
            motivo=motivo_general,
            comentario=comentario_general
        )
        
        db.add(devolucion)
        db.flush()  # Obtener el ID sin hacer commit aún
        db.refresh(devolucion)

        # Guardar los items de la devolución
        for item_data in items_data:
            item_pedido_id = item_data.get("item_pedido_id")
            item_pedido = items_pedido_map[item_pedido_id]

            # Usar solo el snapshot guardado en ItemPedido (datos históricos inmutables)
            # El modelo Producto no tiene imagen_url directa, está en media_archivos
            producto_nombre = item_pedido.producto_nombre_snapshot or "Producto"
            producto_sku = item_pedido.producto_sku_snapshot
            producto_imagen_url = item_pedido.producto_imagen_url_snapshot

            item_devolucion = ItemDevolucion(
                devolucion_id=devolucion.id,
                item_pedido_id=item_pedido_id,
                producto_id=item_pedido.producto_id,
                producto_nombre=producto_nombre,
                producto_sku=producto_sku,
                producto_imagen_url=producto_imagen_url,
                cantidad=item_data.get("cantidad", 1),
                motivo=item_data.get("motivo", "Otro"),
                comentario=item_data.get("comentario")
            )
            db.add(item_devolucion)
            print(f"DEBUG: Item de devolución agregado: producto_id={item_pedido.producto_id}, nombre={producto_nombre}, motivo={item_data.get('motivo')}")

        db.flush()  # Guardar items sin commit aún

        # Subir y guardar las evidencias
        evidencias_subidas = 0
        errores_subida = []
        
        for evidencia_file in evidencias:
            if not evidencia_file.content_type.startswith('image/'):
                raise HTTPException(
                    status_code=400, 
                    detail="Las evidencias deben ser archivos de imagen"
                )
            
            try:
                print(f"DEBUG: Subiendo evidencia {evidencia_file.filename} a Cloudinary...")
                # Leer el contenido del archivo y envolver en BytesIO
                contenido_bytes = await evidencia_file.read()
                file_obj = io.BytesIO(contenido_bytes)
                print(f"DEBUG: Archivo leído, tamaño: {len(contenido_bytes)} bytes")
                # Subir a Cloudinary
                upload_result = upload_file(file_obj, folder="devoluciones")
                print(f"DEBUG: Evidencia subida exitosamente: {upload_result['cloudinary_url'][:50]}...")
                
                # Crear registro de evidencia
                evidencia = EvidenciaDevolucion(
                    devolucion_id=devolucion.id,
                    cloudinary_url=upload_result["cloudinary_url"],
                    cloudinary_public_id=upload_result["cloudinary_public_id"],
                    tipo_archivo=TipoArchivoEnum.imagen
                )
                
                db.add(evidencia)
                evidencias_subidas += 1
            except Exception as e:
                print(f"DEBUG: Error subiendo evidencia: {e}")
                errores_subida.append(str(e))
        
        # Si no se subió ninguna evidencia, fallar la devolución
        if evidencias_subidas == 0:
            db.rollback()  # Revertir todo (devolución e items)
            raise HTTPException(
                status_code=500, 
                detail=f"No se pudieron subir las evidencias. Errores: {', '.join(errores_subida)}"
            )
        
        db.commit()
        db.refresh(devolucion)
        print(f"DEBUG: Devolución creada exitosamente con {evidencias_subidas} evidencias y {len(items_data)} items")
        
        # Retornar respuesta simple
        return {
            "id": devolucion.id,
            "motivo": devolucion.motivo,
            "comentario": devolucion.comentario,
            "estado": devolucion.estado.value if hasattr(devolucion.estado, 'value') else str(devolucion.estado),
            "pedido_id": devolucion.pedido_id,
            "message": "Devolución creada exitosamente"
        }
    
    except HTTPException:
        raise  # Re-lanzar HTTPExceptions sin modificar
    except Exception as e:
        db.rollback()  # Revertir cualquier cambio en caso de error
        print(f"DEBUG ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error interno al crear la devolución: {str(e)}")

@router.get("/pedido/{pedido_id}/ventana")
async def info_ventana_devolucion(
    pedido_id: int,
    db: Session = Depends(get_db),
    current_user_payload: dict = Depends(get_current_user),
):
    """Devuelve la política de devolución aplicable y los días restantes para este pedido."""
    from datetime import datetime as _dt, timezone as _tz

    current_user_id = int(current_user_payload.get("sub", 0))
    cliente = db.query(Cliente).filter(Cliente.usuario_id == current_user_id).first()
    if not cliente:
        raise HTTPException(status_code=403, detail="No tienes permisos de cliente")

    pedido = db.query(Pedido).options(
        joinedload(Pedido.items).joinedload(ItemPedido.producto)
    ).filter(
        Pedido.id == pedido_id,
        Pedido.cliente_id == cliente.id,
    ).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    empresas_ids = {
        it.producto.empresa_id for it in pedido.items
        if it.producto and it.producto.empresa_id is not None
    }
    from app.usuarios.models import Empresa as _Empresa
    empresas = db.query(_Empresa).filter(_Empresa.id.in_(empresas_ids)).all() if empresas_ids else []
    dias_limite = min((e.dias_devolucion or 15) for e in empresas) if empresas else 15

    if not pedido.fecha_entrega:
        return {
            "dias_limite": dias_limite,
            "dias_restantes": None,
            "vencida": False,
            "entregado": False,
        }

    fecha_entrega = pedido.fecha_entrega
    if fecha_entrega.tzinfo is None:
        fecha_entrega = fecha_entrega.replace(tzinfo=_tz.utc)
    dias_transcurridos = (_dt.now(_tz.utc) - fecha_entrega).days
    dias_restantes = dias_limite - dias_transcurridos
    return {
        "dias_limite": dias_limite,
        "dias_restantes": max(dias_restantes, 0),
        "vencida": dias_restantes < 0,
        "entregado": True,
    }


@router.get("/pedido/{pedido_id}/disponibilidad", response_model=PedidoDisponibilidadDevolucion)
async def disponibilidad_devolucion_por_pedido(
    pedido_id: int,
    db: Session = Depends(get_db),
    current_user_payload: dict = Depends(get_current_user),
):
    """
    Retorna por cada item del pedido la disponibilidad de devolución según motivo.
    Incluye días restantes para retracto (empresa) y garantía (producto).
    """
    from datetime import datetime as _dt, timezone as _tz

    current_user_id = int(current_user_payload.get("sub", 0))
    cliente = db.query(Cliente).filter(Cliente.usuario_id == current_user_id).first()
    if not cliente:
        raise HTTPException(status_code=403, detail="No tienes permisos de cliente")

    pedido = db.query(Pedido).options(
        joinedload(Pedido.items).joinedload(ItemPedido.producto).joinedload(Producto.media)
    ).filter(
        Pedido.id == pedido_id,
        Pedido.cliente_id == cliente.id,
    ).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    MOTIVOS_RETRACTO = ["Talla/Color incorrecto", "No era lo esperado", "Otro"]
    MOTIVOS_GARANTIA = ["Producto dañado", "Producto defectuoso", "Calidad inferior a la esperada", "Otro"]

    items_disponibilidad = []
    for item_pedido in pedido.items:
        producto = item_pedido.producto
        empresa = producto.empresa if producto else None

        dias_transcurridos = None
        if pedido.fecha_entrega:
            fecha_entrega = pedido.fecha_entrega
            if fecha_entrega.tzinfo is None:
                fecha_entrega = fecha_entrega.replace(tzinfo=_tz.utc)
            dias_transcurridos = (_dt.now(_tz.utc) - fecha_entrega).days

        empresa_dias_devolucion = empresa.dias_devolucion if empresa else 15
        producto_dias_garantia = producto.dias_garantia if producto else 365

        retracto_disponible = True
        dias_restantes_retracto = 0
        garantia_disponible = True
        dias_restantes_garantia = 0

        if dias_transcurridos is not None:
            dias_restantes_retracto = max(empresa_dias_devolucion - dias_transcurridos, 0)
            retracto_disponible = dias_transcurridos <= empresa_dias_devolucion

            dias_restantes_garantia = max(producto_dias_garantia - dias_transcurridos, 0)
            garantia_disponible = dias_transcurridos <= producto_dias_garantia
        else:
            dias_restantes_retracto = empresa_dias_devolucion
            dias_restantes_garantia = producto_dias_garantia

        imagen_url = None
        if producto and producto.media:
            img = next((m for m in producto.media if m.tipo == "imagen"), None)
            if img:
                imagen_url = img.cloudinary_url
        elif item_pedido.producto_imagen_url_snapshot:
            imagen_url = item_pedido.producto_imagen_url_snapshot

        items_disponibilidad.append(ItemDisponibilidadDevolucion(
            item_pedido_id=item_pedido.id,
            producto_id=producto.id if producto else 0,
            producto_nombre=item_pedido.producto_nombre_snapshot or (producto.nombre if producto else "Producto"),
            producto_imagen_url=imagen_url,
            dias_transcurridos=dias_transcurridos,
            retracto_disponible=retracto_disponible,
            dias_restantes_retracto=dias_restantes_retracto,
            garantia_disponible=garantia_disponible,
            dias_restantes_garantia=dias_restantes_garantia,
            motivos_retracto_permitidos=MOTIVOS_RETRACTO,
            motivos_garantia_permitidos=MOTIVOS_GARANTIA,
            empresa_dias_devolucion=empresa_dias_devolucion,
            producto_dias_garantia=producto_dias_garantia,
        ))

    return PedidoDisponibilidadDevolucion(
        pedido_id=pedido.id,
        fecha_entrega=pedido.fecha_entrega,
        items=items_disponibilidad
    )


@router.get("/pedido/{pedido_id}")
async def obtener_devolucion_por_pedido(
    pedido_id: int,
    db: Session = Depends(get_db),
    current_user_payload: dict = Depends(get_current_user)
):
    """Obtener la devolución de un pedido específico."""
    
    # Obtener el ID del usuario desde el payload JWT
    current_user_id = int(current_user_payload.get("sub", 0))
    if not current_user_id:
        raise HTTPException(status_code=401, detail="Usuario no autenticado")
    
    # Buscar el cliente_id correspondiente al usuario
    cliente = db.query(Cliente).filter(Cliente.usuario_id == current_user_id).first()
    if not cliente:
        raise HTTPException(status_code=403, detail="No tienes permisos de cliente")
    
    current_cliente_id = cliente.id
    
    # Verificar que el pedido exista y pertenezca al cliente actual
    pedido = db.query(Pedido).filter(
        Pedido.id == pedido_id,
        Pedido.cliente_id == current_cliente_id
    ).first()
    
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    # Buscar la devolución con sus items y item_pedido relacionado (eager loading)
    devolucion = db.query(Devolucion).options(
        joinedload(Devolucion.items).joinedload(ItemDevolucion.item_pedido)
    ).filter(
        Devolucion.pedido_id == pedido_id
    ).first()
    
    if not devolucion:
        # Retornar null en lugar de 404 para evitar errores en consola del navegador
        return None
    
    # Construir lista de items devueltos
    items_devueltos = []
    for item in devolucion.items:
        items_devueltos.append({
            "id": item.id,
            "producto_nombre": item.producto_nombre or "Producto desconocido",
            "producto_sku": item.producto_sku or "N/A",
            "producto_imagen_url": item.producto_imagen_url,
            "cantidad": item.cantidad,
            "motivo": item.motivo,
            "comentario": item.comentario,
            "precio_unitario": item.item_pedido.precio_unitario if item.item_pedido else 0
        })
    
    # Retornar respuesta con los items de la devolución
    return {
        "id": devolucion.id,
        "motivo": devolucion.motivo,
        "comentario": devolucion.comentario,
        "estado": devolucion.estado.value if hasattr(devolucion.estado, 'value') else str(devolucion.estado),
        "pedido_id": devolucion.pedido_id,
        "items": items_devueltos,
        "fecha_solicitud": devolucion.fecha_solicitud.isoformat() if devolucion.fecha_solicitud else None
    }

@router.get("/mis-devoluciones", response_model=List[DevolucionClienteOut])
async def obtener_mis_devoluciones(
    db: Session = Depends(get_db),
    current_user_payload: dict = Depends(get_current_user)
):
    """Obtener todas las devoluciones del usuario actual con los productos específicos devueltos."""

    # Obtener el ID del usuario desde el payload JWT
    current_user_id = int(current_user_payload.get("sub", 0))
    if not current_user_id:
        raise HTTPException(status_code=401, detail="Usuario no autenticado")

    # Buscar el cliente_id correspondiente al usuario
    cliente = db.query(Cliente).filter(Cliente.usuario_id == current_user_id).first()
    if not cliente:
        raise HTTPException(status_code=403, detail="No tienes permisos de cliente")

    current_cliente_id = cliente.id

    # Obtener devoluciones con sus items
    devoluciones = db.query(Devolucion).options(
        joinedload(Devolucion.items)
    ).join(Pedido).filter(
        Pedido.cliente_id == current_cliente_id
    ).all()

    # Procesar cada devolución con sus items específicos
    resultado = []
    for dev in devoluciones:
        # Construir lista de items (productos específicos de esta devolución)
        items = []
        for item in dev.items:
            items.append(ItemDevolucionOut(
                id=item.id,
                producto_nombre=item.producto_nombre,
                producto_sku=item.producto_sku,
                producto_imagen_url=item.producto_imagen_url,
                cantidad=item.cantidad,
                motivo=item.motivo,
                comentario=item.comentario
            ))

        resultado.append(DevolucionClienteOut(
            id=dev.id,
            estado=dev.estado.value if hasattr(dev.estado, 'value') else str(dev.estado),
            fecha_solicitud=dev.fecha_solicitud,
            comentario_general=dev.comentario,
            respuesta_empresa=dev.respuesta_empresa,
            pedido_id=dev.pedido_id,
            items=items
        ))

    return resultado

@router.post("/{devolucion_id}/estado", response_model=DevolucionOut)
async def actualizar_estado_devolucion(
    devolucion_id: int,
    estado_update: DevolucionEstadoUpdate,
    db: Session = Depends(get_db),
    current_user_payload: dict = Depends(get_current_user)
):
    """Actualizar el estado de una devolución (solo para empresas).
    """
    print(f"DEBUG ESTADO: Iniciando actualización - devolucion_id={devolucion_id}, estado={estado_update.estado}")
    
    # Obtener el rol del usuario desde el payload JWT
    current_user_rol = current_user_payload.get("rol")
    print(f"DEBUG ESTADO: rol del usuario={current_user_rol}")
    
    # Solo las empresas pueden actualizar estados
    if current_user_rol != "empresa":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Obtener el ID del usuario desde el payload JWT (sub es usuario_id, no empresa_id)
    usuario_id = int(current_user_payload.get("sub"))
    
    # Obtener la empresa asociada al usuario
    from app.usuarios.models import Empresa
    empresa = db.query(Empresa).filter(Empresa.usuario_id == usuario_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    empresa_id = empresa.id
    print(f"DEBUG: usuario_id={usuario_id}, empresa_id={empresa_id}")
    
    # Validar estado
    estados_validos = ["solicitada", "en_revision", "aprobada", "rechazada"]
    if estado_update.estado not in estados_validos:
        raise HTTPException(
            status_code=400, 
            detail=f"Estado no válido. Estados válidos: {', '.join(estados_validos)}"
        )
    
    # Buscar la devolución verificando que pertenezca a productos de esta empresa
    # Relación: Devolucion → Pedido → ItemPedido → Producto → Empresa
    # Usar DISTINCT para evitar duplicados por múltiples items en un pedido
    devolucion = db.query(Devolucion).join(Pedido).join(ItemPedido).join(Producto).filter(
        Devolucion.id == devolucion_id,
        Producto.empresa_id == empresa_id
    ).distinct().first()
    
    if not devolucion:
        raise HTTPException(status_code=404, detail="Devolución no encontrada o no autorizada")
    
    # Actualizar estado de la devolución
    devolucion.estado = estado_update.estado
    
    # Guardar respuesta de la empresa si se proporciona
    if estado_update.respuesta_empresa:
        devolucion.respuesta_empresa = estado_update.respuesta_empresa
    
    # Nota: La actualización del estado del pedido se deshabilita temporalmente
    # porque el enum de PostgreSQL no tiene el valor 'en_devolucion'
    # TODO: Actualizar el enum en la base de datos con Alembic
    # if estado_update.estado == "aprobada":
    #     pedido = db.query(Pedido).filter(Pedido.id == devolucion.pedido_id).first()
    #     if pedido:
    #         pedido.estado = EstadoPedidoEnum.en_devolucion
    #         print(f"DEBUG: Pedido {pedido.id} actualizado a estado 'en_devolucion'")
    
    db.commit()
    db.refresh(devolucion)
    
    # Retornar respuesta simple sin serialización compleja
    try:
        resultado = {
            "id": devolucion.id,
            "motivo": devolucion.motivo,
            "comentario": devolucion.comentario,
            "respuesta_empresa": devolucion.respuesta_empresa,
            "estado": devolucion.estado.value if hasattr(devolucion.estado, 'value') else str(devolucion.estado),
            "pedido_id": devolucion.pedido_id
        }
        print(f"DEBUG ESTADO: Retornando resultado exitoso: {resultado}")
        return resultado
    except Exception as e:
        print(f"DEBUG ESTADO: Error serializando respuesta: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error interno al serializar respuesta: {str(e)}")

@router.get("/", response_model=List[DevolucionOut])
async def listar_devoluciones(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user_payload: dict = Depends(get_current_user)
):
    """Listar devoluciones (para empresas)."""
    
    # Obtener el rol del usuario desde el payload JWT
    current_user_rol = current_user_payload.get("rol")
    
    # Solo las empresas pueden ver todas las devoluciones
    if current_user_rol != "empresa":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Obtener el ID del usuario desde el payload JWT (sub es usuario_id, no empresa_id)
    usuario_id = int(current_user_payload.get("sub"))
    
    # Obtener la empresa asociada al usuario
    from app.usuarios.models import Empresa
    empresa = db.query(Empresa).filter(Empresa.usuario_id == usuario_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    empresa_id = empresa.id
    print(f"DEBUG: usuario_id={usuario_id}, empresa_id={empresa_id}")
    
    # Filtrar devoluciones que pertenezcan a productos de esta empresa
    # Relación: Devolucion → Pedido → ItemPedido → Producto → Empresa
    # Usar DISTINCT para evitar duplicados por múltiples items en un pedido
    devoluciones = db.query(Devolucion).join(Pedido).join(ItemPedido).join(Producto).filter(
        Producto.empresa_id == empresa_id
    ).distinct().offset(skip).limit(limit).all()
    
    print(f"DEBUG: Devoluciones encontradas para empresa {empresa_id}: {len(devoluciones)}")
    
    # Procesar cada devolución a través del schema
    return [
        DevolucionOut(
            id=dev.id,
            motivo=dev.motivo,
            comentario=dev.comentario,
            estado=dev.estado.value if hasattr(dev.estado, 'value') else str(dev.estado),
            pedido_id=dev.pedido_id
        ) for dev in devoluciones
    ]


@router.get("/pendientes", response_model=List[DevolucionPendienteOut])
async def listar_devoluciones_pendientes(
    db: Session = Depends(get_db),
    current_user_payload: dict = Depends(get_current_user)
):
    """Listar devoluciones con estado 'solicitada' para la bandeja de entrada de la empresa (HU07)."""
    
    # Obtener el rol del usuario desde el payload JWT
    current_user_rol = current_user_payload.get("rol")
    
    # Solo las empresas pueden ver la bandeja de devoluciones
    if current_user_rol != "empresa":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Obtener el ID del usuario desde el payload JWT (sub es usuario_id, no empresa_id)
    usuario_id = int(current_user_payload.get("sub"))
    
    # Obtener la empresa asociada al usuario
    from app.usuarios.models import Empresa
    empresa = db.query(Empresa).filter(Empresa.usuario_id == usuario_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    empresa_id = empresa.id
    print(f"DEBUG: usuario_id={usuario_id}, empresa_id={empresa_id}")
    
    # Buscar devoluciones con estado 'solicitada' que pertenezcan a productos de esta empresa
    # Relación: Devolucion → Pedido → ItemPedido → Producto → Empresa
    # Usar DISTINCT para evitar duplicados por múltiples items en un pedido
    devoluciones = db.query(Devolucion).join(Pedido).join(ItemPedido).join(Producto).filter(
        Devolucion.estado == "solicitada",
        Producto.empresa_id == empresa_id
    ).distinct().order_by(Devolucion.fecha_solicitud.desc()).all()
    
    print(f"DEBUG: Devoluciones encontradas para empresa {empresa_id}: {len(devoluciones)}")
    
    resultado = []
    for dev in devoluciones:
        # Obtener información del pedido y cliente con eager loading
        pedido = db.query(Pedido).options(
            joinedload(Pedido.items)
        ).filter(Pedido.id == dev.pedido_id).first()
        if not pedido:
            continue
            
        cliente = db.query(Cliente).options(
            joinedload(Cliente.usuario)
        ).filter(Cliente.id == pedido.cliente_id).first()
        if not cliente:
            continue
        
        # Contar productos en el pedido
        total_productos = len(pedido.items) if pedido.items else 0
        
        resultado.append({
            "id": dev.id,
            "motivo": dev.motivo,
            "estado": dev.estado.value if hasattr(dev.estado, 'value') else str(dev.estado),
            "fecha_solicitud": dev.fecha_solicitud,
            "pedido_id": dev.pedido_id,
            "cliente_nombre": cliente.nombre,
            "cliente_correo": cliente.usuario.correo if cliente.usuario else "N/A",
            "total_productos": total_productos
        })
    
    return resultado


@router.get("/{devolucion_id}/detalle", response_model=DevolucionDetalleEmpresa)
async def obtener_detalle_devolucion_empresa(
    devolucion_id: int,
    db: Session = Depends(get_db),
    current_user_payload: dict = Depends(get_current_user)
):
    """Obtener detalle completo de una devolución para la empresa (HU07 + RF10 + RF11).
    
    Incluye:
    - Información del cliente
    - Información del pedido
    - Evidencias fotográficas desde Cloudinary
    - Snapshot inmutable del producto (datos históricos del momento de la compra)
    """
    
    # Obtener el rol del usuario desde el payload JWT
    current_user_rol = current_user_payload.get("rol")
    
    # Solo las empresas pueden ver el detalle completo
    if current_user_rol != "empresa":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Obtener el ID del usuario desde el payload JWT (sub es usuario_id, no empresa_id)
    usuario_id = int(current_user_payload.get("sub"))
    
    # Obtener la empresa asociada al usuario
    from app.usuarios.models import Empresa
    empresa = db.query(Empresa).filter(Empresa.usuario_id == usuario_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    empresa_id = empresa.id
    print(f"DEBUG: usuario_id={usuario_id}, empresa_id={empresa_id}")
    
    # Buscar la devolución verificando que pertenezca a productos de esta empresa
    # Relación: Devolucion → Pedido → ItemPedido → Producto → Empresa
    # Usar DISTINCT para evitar duplicados por múltiples items en un pedido
    devolucion = db.query(Devolucion).join(Pedido).join(ItemPedido).join(Producto).options(
        joinedload(Devolucion.items).joinedload(ItemDevolucion.item_pedido)
    ).filter(
        Devolucion.id == devolucion_id,
        Producto.empresa_id == empresa_id
    ).distinct().first()
    if not devolucion:
        raise HTTPException(status_code=404, detail="Devolución no encontrada o no autorizada")
    
    # Obtener el pedido con sus items y productos (eager loading)
    pedido = db.query(Pedido).options(
        joinedload(Pedido.items).joinedload(ItemPedido.producto)
    ).filter(Pedido.id == devolucion.pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    # Obtener el cliente con su usuario (eager loading)
    cliente = db.query(Cliente).options(
        joinedload(Cliente.usuario)
    ).filter(Cliente.id == pedido.cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    # Obtener evidencias
    evidencias = db.query(EvidenciaDevolucion).filter(
        EvidenciaDevolucion.devolucion_id == devolucion.id
    ).all()
    
    evidencias_out = [
        EvidenciaOut(
            id=ev.id,
            cloudinary_url=ev.cloudinary_url,
            cloudinary_public_id=ev.cloudinary_public_id,
            tipo_archivo=ev.tipo_archivo.value
        ) for ev in evidencias
    ]
    
    # Construir productos desde los items de la devolución (solo los seleccionados)
    productos_snapshot = []
    for item in devolucion.items:
        # Cada item en devolucion.items es un ItemDevolucion con datos snapshot
        # Obtener descripción del producto actual o del item_pedido relacionado
        descripcion = ""
        precio_unitario = 0
        if item.item_pedido:
            descripcion = item.item_pedido.producto_descripcion_snapshot or ""
            precio_unitario = item.item_pedido.precio_unitario or 0
        productos_snapshot.append({
            "nombre": item.producto_nombre or "Producto desconocido",
            "sku": item.producto_sku or "N/A",
            "descripcion": descripcion,
            "imagen_url": item.producto_imagen_url,
            "cantidad": item.cantidad,
            "precio_unitario": precio_unitario,
            "motivo": item.motivo,
            "comentario": item.comentario
        })
    
    # Construir respuesta
    return {
        "id": devolucion.id,
        "motivo": devolucion.motivo,
        "comentario": devolucion.comentario,
        "respuesta_empresa": devolucion.respuesta_empresa,
        "estado": devolucion.estado.value if hasattr(devolucion.estado, 'value') else str(devolucion.estado),
        "fecha_solicitud": devolucion.fecha_solicitud,
        "pedido": {
            "id": pedido.id,
            "estado": pedido.estado.value,
            "fecha_pedido": pedido.fecha_pedido,
            "total": pedido.total,
            "productos": productos_snapshot  # Productos específicos de esta devolución
        },
        "cliente": {
            "id": cliente.id,
            "nombre": cliente.nombre,
            "correo": cliente.usuario.correo if cliente.usuario else "N/A",
            "telefono": cliente.telefono
        },
        "evidencias": evidencias_out
    }
