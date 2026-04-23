"""Devoluciones router - Endpoints para gestión de devoluciones."""
import os
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.devoluciones.models import Devolucion, EvidenciaDevolucion, TipoArchivoEnum
from app.devoluciones.schemas import (
    DevolucionCreate, DevolucionOut, DevolucionEstadoUpdate,
    EvidenciaOut, ClienteInfo, ProductoSnapshot, PedidoInfo,
    DevolucionDetalleEmpresa, DevolucionPendienteOut
)
from app.pedidos.models import Pedido
from app.usuarios.models import Usuario, Cliente
from app.core.cloudinary_client import upload_file

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
    motivo: str = Form(...),
    comentario: str = Form(None),
    evidencias: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user_payload: dict = Depends(get_current_user)
):
    """Crear una nueva solicitud de devolución."""
    
    print(f"DEBUG POST: Iniciando creación de devolución")
    print(f"DEBUG POST: pedido_id={pedido_id}, motivo={motivo}")
    print(f"DEBUG POST: evidencias count={len(evidencias) if evidencias else 0}")
    
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
    
    # Validar motivo
    print(f"DEBUG POST: Validando motivo '{motivo}' en {MOTIVOS_PERMITIDOS}")
    if motivo not in MOTIVOS_PERMITIDOS:
        raise HTTPException(
            status_code=400, 
            detail=f"Motivo no válido. Motivos permitidos: {', '.join(MOTIVOS_PERMITIDOS)}"
        )
    
    # Verificar que el pedido exista y pertenezca al cliente actual
    print(f"DEBUG POST: Buscando pedido {pedido_id} con cliente_id {current_cliente_id}")
    pedido = db.query(Pedido).filter(
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
    
    # Crear la devolución
    devolucion = Devolucion(
        pedido_id=pedido_id,
        motivo=motivo,
        comentario=comentario
    )
    
    db.add(devolucion)
    db.commit()
    db.refresh(devolucion)
    
    # Subir y guardar las evidencias
    evidencias_subidas = 0
    for evidencia_file in evidencias:
        if not evidencia_file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400, 
                detail="Las evidencias deben ser archivos de imagen"
            )
        
        try:
            # Subir a Cloudinary
            upload_result = upload_file(evidencia_file, folder="devoluciones")
            
            # Crear registro de evidencia
            evidencia = EvidenciaDevolucion(
                devolucion_id=devolucion.id,
                cloudinary_url=upload_result["url"],
                cloudinary_public_id=upload_result["public_id"],
                tipo_archivo=TipoArchivoEnum.imagen
            )
            
            db.add(evidencia)
            evidencias_subidas += 1
        except Exception as e:
            print(f"DEBUG: Error subiendo evidencia: {e}")
            # Continuar sin la evidencia si falla la subida
    
    if evidencias_subidas > 0:
        db.commit()
    
    db.refresh(devolucion)
    
    # Retornar respuesta simple
    return {
        "id": devolucion.id,
        "motivo": devolucion.motivo,
        "comentario": devolucion.comentario,
        "estado": devolucion.estado,
        "pedido_id": devolucion.pedido_id,
        "message": "Devolución creada exitosamente"
    }

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
    
    # Buscar la devolución
    devolucion = db.query(Devolucion).filter(
        Devolucion.pedido_id == pedido_id
    ).first()
    
    if not devolucion:
        # Retornar 404 con un mensaje claro para que el frontend pueda manejarlo
        from fastapi import status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Este pedido no tiene solicitud de devolución"
        )
    
    # Retornar respuesta simple sin serialización compleja
    return {
        "id": devolucion.id,
        "motivo": devolucion.motivo,
        "comentario": devolucion.comentario,
        "estado": devolucion.estado,
        "pedido_id": devolucion.pedido_id
    }

@router.get("/mis-devoluciones", response_model=List[DevolucionOut])
async def obtener_mis_devoluciones(
    db: Session = Depends(get_db),
    current_user_payload: dict = Depends(get_current_user)
):
    """Obtener todas las devoluciones del usuario actual."""
    
    # Obtener el ID del usuario desde el payload JWT
    current_user_id = int(current_user_payload.get("sub", 0))
    if not current_user_id:
        raise HTTPException(status_code=401, detail="Usuario no autenticado")
    
    # Buscar el cliente_id correspondiente al usuario
    cliente = db.query(Cliente).filter(Cliente.usuario_id == current_user_id).first()
    if not cliente:
        raise HTTPException(status_code=403, detail="No tienes permisos de cliente")
    
    current_cliente_id = cliente.id
    
    devoluciones = db.query(Devolucion).join(Pedido).filter(
        Pedido.cliente_id == current_cliente_id
    ).all()
    
    # Procesar cada devolución a través del schema
    return [
        DevolucionOut(
            id=dev.id,
            motivo=dev.motivo,
            comentario=dev.comentario,
            estado=dev.estado,
            pedido_id=dev.pedido_id
        ) for dev in devoluciones
    ]

@router.put("/{devolucion_id}/estado", response_model=DevolucionOut)
async def actualizar_estado_devolucion(
    devolucion_id: int,
    estado_update: DevolucionEstadoUpdate,
    db: Session = Depends(get_db),
    current_user_payload: dict = Depends(get_current_user)
):
    """Actualizar el estado de una devolución (solo para empresas).
    
    Si el estado es 'aprobada', también actualiza el estado del pedido a 'en_devolucion'.
    """
    from app.pedidos.models import EstadoPedidoEnum
    
    # Obtener el rol del usuario desde el payload JWT
    current_user_rol = current_user_payload.get("rol")
    
    # Solo las empresas pueden actualizar estados
    if current_user_rol != "empresa":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Validar estado
    estados_validos = ["solicitada", "en_revision", "aprobada", "rechazada"]
    if estado_update.estado not in estados_validos:
        raise HTTPException(
            status_code=400, 
            detail=f"Estado no válido. Estados válidos: {', '.join(estados_validos)}"
        )
    
    # Buscar la devolución
    devolucion = db.query(Devolucion).filter(
        Devolucion.id == devolucion_id
    ).first()
    
    if not devolucion:
        raise HTTPException(status_code=404, detail="Devolución no encontrada")
    
    # Actualizar estado de la devolución
    devolucion.estado = estado_update.estado
    
    # Si se aprueba, actualizar también el estado del pedido (RF11)
    if estado_update.estado == "aprobada":
        pedido = db.query(Pedido).filter(Pedido.id == devolucion.pedido_id).first()
        if pedido:
            pedido.estado = EstadoPedidoEnum.en_devolucion
            print(f"DEBUG: Pedido {pedido.id} actualizado a estado 'en_devolucion'")
    
    db.commit()
    db.refresh(devolucion)
    
    # Retornar respuesta simple sin serialización compleja
    return {
        "id": devolucion.id,
        "motivo": devolucion.motivo,
        "comentario": devolucion.comentario,
        "estado": devolucion.estado,
        "pedido_id": devolucion.pedido_id
    }

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
    
    devoluciones = db.query(Devolucion).offset(skip).limit(limit).all()
    
    # Procesar cada devolución a través del schema
    return [
        DevolucionOut(
            id=dev.id,
            motivo=dev.motivo,
            comentario=dev.comentario,
            estado=dev.estado,
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
    
    # Buscar devoluciones con estado 'solicitada'
    devoluciones = db.query(Devolucion).filter(
        Devolucion.estado == "solicitada"
    ).order_by(Devolucion.fecha_solicitud.desc()).all()
    
    resultado = []
    for dev in devoluciones:
        # Obtener información del pedido y cliente
        pedido = db.query(Pedido).filter(Pedido.id == dev.pedido_id).first()
        if not pedido:
            continue
            
        cliente = db.query(Cliente).filter(Cliente.id == pedido.cliente_id).first()
        if not cliente:
            continue
        
        # Contar productos en el pedido
        total_productos = len(pedido.items) if pedido.items else 0
        
        resultado.append({
            "id": dev.id,
            "motivo": dev.motivo,
            "estado": dev.estado,
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
    
    # Buscar la devolución
    devolucion = db.query(Devolucion).filter(Devolucion.id == devolucion_id).first()
    if not devolucion:
        raise HTTPException(status_code=404, detail="Devolución no encontrada")
    
    # Obtener el pedido
    pedido = db.query(Pedido).filter(Pedido.id == devolucion.pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    # Obtener el cliente
    cliente = db.query(Cliente).filter(Cliente.id == pedido.cliente_id).first()
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
    
    # Construir productos desde el snapshot inmutable (RF10)
    productos_snapshot = []
    for item in pedido.items:
        productos_snapshot.append({
            "nombre": item.producto_nombre_snapshot or (item.producto.nombre if item.producto else "Producto desconocido"),
            "sku": item.producto_sku_snapshot or (item.producto.sku if item.producto else "N/A"),
            "descripcion": item.producto_descripcion_snapshot or (item.producto.descripcion if item.producto else ""),
            "imagen_url": item.producto_imagen_url_snapshot or (item.producto.imagen_url if item.producto else None),
            "cantidad": item.cantidad,
            "precio_unitario": item.precio_unitario
        })
    
    # Construir respuesta
    return {
        "id": devolucion.id,
        "motivo": devolucion.motivo,
        "comentario": devolucion.comentario,
        "estado": devolucion.estado,
        "fecha_solicitud": devolucion.fecha_solicitud,
        "pedido": {
            "id": pedido.id,
            "estado": pedido.estado.value,
            "fecha_pedido": pedido.fecha_pedido,
            "total": pedido.total,
            "productos": productos_snapshot
        },
        "cliente": {
            "id": cliente.id,
            "nombre": cliente.nombre,
            "correo": cliente.usuario.correo if cliente.usuario else "N/A",
            "telefono": cliente.telefono
        },
        "evidencias": evidencias_out
    }
