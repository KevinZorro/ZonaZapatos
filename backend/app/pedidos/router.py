"""Pedidos router — endpoints para gestión de pedidos."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_rol
from app.encuestas.models import EncuestaSatisfaccion
from app.pedidos.models import Pedido, ItemPedido, EstadoPedidoEnum
from app.pedidos.schemas import PedidoCreate, PedidoOut
from app.usuarios.models import Cliente, Empresa

router = APIRouter(tags=["pedidos"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_cliente_by_user_id(user_id: int, db: Session) -> Cliente:
    """Obtiene el cliente asociado a un usuario."""
    cliente = db.query(Cliente).filter(Cliente.usuario_id == user_id).first()
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró un cliente asociado a este usuario"
        )
    return cliente


def _get_empresa_by_user_id(user_id: int, db: Session) -> Empresa:
    """Obtiene la empresa asociada a un usuario."""
    empresa = db.query(Empresa).filter(Empresa.usuario_id == user_id).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró una empresa asociada a este usuario"
        )
    return empresa


def _get_pedido_by_id(pedido_id: int, db: Session) -> Pedido:
    """Obtiene un pedido por su ID."""
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El pedido con ID {pedido_id} no existe"
        )
    return pedido


def _validate_pedido_belongs_to_cliente(pedido: Pedido, cliente: Cliente) -> None:
    """Valida que un pedido pertenezca al cliente."""
    if pedido.cliente_id != cliente.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para gestionar este pedido"
        )


def _serialize_pedido(pedido: Pedido) -> PedidoOut:
    """Serializa un pedido a su schema de salida."""
    return PedidoOut(
        id=pedido.id,
        estado=pedido.estado.value,
        fecha_pedido=pedido.fecha_pedido,
        fecha_entrega=pedido.fecha_entrega,
        total=pedido.total,
        canal_contacto=pedido.canal_contacto.value,
        items=[
            {
                "id": item.id,
                "producto_id": item.producto_id,
                "cantidad": item.cantidad,
                "precio_unitario": item.precio_unitario,
            }
            for item in pedido.items
        ]
    )


# ── Endpoints para Pedidos ───────────────────────────────────────────────────

@router.post(
    "/pedidos",
    response_model=PedidoOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_rol("cliente"))],
    summary="Crear un nuevo pedido",
    description="Permite a un cliente crear un nuevo pedido con múltiples items."
)
def create_pedido(
    body: PedidoCreate,
    payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Crea un nuevo pedido para el cliente autenticado.
    
    - **items**: Lista de items con producto_id y cantidad
    - **canal_contacto**: Canal de contacto (whatsapp, web, telefono)
    """
    cliente = _get_cliente_by_user_id(int(payload["sub"]), db)
    
    # Calcular total y crear items
    total = 0.0
    items = []
    
    for item_data in body.items:
        # Aquí se debería validar que el producto existe y obtener su precio
        # Por ahora, asumimos un precio base (esto se implementaría completo)
        precio_unitario = 0.0  # Se obtendría de la base de datos
        subtotal = precio_unitario * item_data.cantidad
        total += subtotal
        
        items.append(
            ItemPedido(
                cantidad=item_data.cantidad,
                precio_unitario=precio_unitario,
                producto_id=item_data.producto_id,
            )
        )
    
    # Crear el pedido
    pedido = Pedido(
        estado=EstadoPedidoEnum.pendiente,
        total=total,
        canal_contacto=body.canal_contacto,
        cliente_id=cliente.id,
        items=items,
    )
    
    db.add(pedido)
    db.commit()
    db.refresh(pedido)
    
    return _serialize_pedido(pedido)


@router.get(
    "/clientes/pedidos",
    response_model=list[PedidoOut],
    dependencies=[Depends(require_rol("cliente"))],
    summary="Listar mis pedidos",
    description="Obtiene la lista de pedidos del cliente autenticado."
)
def list_mis_pedidos(
    payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lista todos los pedidos del cliente autenticado.
    """
    cliente = _get_cliente_by_user_id(int(payload["sub"]), db)
    
    pedidos = db.query(Pedido).filter(Pedido.cliente_id == cliente.id).all()
    
    return [_serialize_pedido(p) for p in pedidos]


@router.get(
    "/pedidos/{pedido_id}",
    response_model=PedidoOut,
    dependencies=[Depends(require_rol("cliente", "empresa", "admin"))],
    summary="Obtener detalles de un pedido",
    description="Obtiene los detalles completos de un pedido específico."
)
def get_pedido(
    pedido_id: int,
    payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Obtiene los detalles de un pedido por su ID.
    
    - **pedido_id**: ID del pedido
    """
    pedido = _get_pedido_by_id(pedido_id, db)
    
    # Validar permisos
    user_rol = payload.get("rol")
    if user_rol == "cliente":
        cliente = _get_cliente_by_user_id(int(payload["sub"]), db)
        _validate_pedido_belongs_to_cliente(pedido, cliente)
    
    return _serialize_pedido(pedido)


@router.put(
    "/pedidos/{pedido_id}/entregar",
    response_model=PedidoOut,
    dependencies=[Depends(require_rol("empresa", "admin"))],
    summary="Marcar pedido como entregado",
    description="Marca un pedido como entregado y genera automáticamente la encuesta de satisfacción."
)
def marcar_entregado(
    pedido_id: int,
    db: Session = Depends(get_db),
):
    """
    Marca un pedido como entregado y genera automáticamente la encuesta de satisfacción.
    
    - **pedido_id**: ID del pedido a entregar
    """
    pedido = _get_pedido_by_id(pedido_id, db)
    
    # Validar que el pedido no esté ya entregado
    if pedido.estado == EstadoPedidoEnum.entregado:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este pedido ya está marcado como entregado"
        )
    
    # Actualizar estado del pedido
    pedido.estado = EstadoPedidoEnum.entregado
    pedido.fecha_entrega = datetime.now(timezone.utc)
    
    # Verificar si ya existe una encuesta para este pedido
    encuesta_existente = db.query(EncuestaSatisfaccion).filter(
        EncuestaSatisfaccion.pedido_id == pedido_id
    ).first()
    
    if not encuesta_existente:
        # Generar automáticamente la encuesta de satisfacción
        encuesta = EncuestaSatisfaccion(
            pedido_id=pedido_id,
            respondida=False,
            omitida=False,
            enviada_en=datetime.now(timezone.utc),
        )
        db.add(encuesta)
    
    db.commit()
    db.refresh(pedido)
    
    return _serialize_pedido(pedido)


@router.put(
    "/pedidos/{pedido_id}/estado",
    response_model=PedidoOut,
    dependencies=[Depends(require_rol("empresa", "admin"))],
    summary="Actualizar estado de un pedido",
    description="Actualiza el estado de un pedido (pendiente, confirmado, enviado, entregado, cancelado)."
)
def update_pedido_estado(
    pedido_id: int,
    estado: str,
    db: Session = Depends(get_db),
):
    """
    Actualiza el estado de un pedido.
    
    - **pedido_id**: ID del pedido
    - **estado**: Nuevo estado (pendiente, confirmado, enviado, entregado, cancelado)
    """
    pedido = _get_pedido_by_id(pedido_id, db)
    
    try:
        nuevo_estado = EstadoPedidoEnum(estado)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Estado inválido. Valores permitidos: {[e.value for e in EstadoPedidoEnum]}"
        )
    
    pedido.estado = nuevo_estado
    
    # Si se marca como entregado, generar encuesta
    if nuevo_estado == EstadoPedidoEnum.entregado:
        pedido.fecha_entrega = datetime.now(timezone.utc)
        
        encuesta_existente = db.query(EncuestaSatisfaccion).filter(
            EncuestaSatisfaccion.pedido_id == pedido_id
        ).first()
        
        if not encuesta_existente:
            encuesta = EncuestaSatisfaccion(
                pedido_id=pedido_id,
                respondida=False,
                omitida=False,
                enviada_en=datetime.now(timezone.utc),
            )
            db.add(encuesta)
    
    db.commit()
    db.refresh(pedido)
    
    return _serialize_pedido(pedido)


@router.delete(
    "/pedidos/{pedido_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_rol("cliente"))],
    summary="Cancelar un pedido",
    description="Cancela un pedido que esté en estado pendiente o confirmado."
)
def cancel_pedido(
    pedido_id: int,
    payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Cancela un pedido si está en estado elegible.
    
    - **pedido_id**: ID del pedido a cancelar
    """
    cliente = _get_cliente_by_user_id(int(payload["sub"]), db)
    pedido = _get_pedido_by_id(pedido_id, db)
    
    # Validar que el cliente es el propietario
    _validate_pedido_belongs_to_cliente(pedido, cliente)
    
    # Solo se pueden cancelar pedidos en estado pendiente o confirmado
    if pedido.estado not in [EstadoPedidoEnum.pendiente, EstadoPedidoEnum.confirmado]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se pueden cancelar pedidos en estado pendiente o confirmado"
        )
    
    pedido.estado = EstadoPedidoEnum.cancelado
    
    db.commit()
    
    return None