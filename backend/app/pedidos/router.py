"""Pedidos + Devoluciones router."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload

from app.core.database import get_db
from app.core.security import get_current_user, require_rol
from app.devoluciones.schemas import DevolucionCreate, DevolucionEstadoUpdate, DevolucionOut
from app.encuestas.models import EncuestaSatisfaccion
from app.encuestas.service import crear_encuestas_pendientes_pedido, enviar_encuesta_email, notificar_encuesta_whatsapp_telefono
from app.pedidos.models import Pedido, ItemPedido, EstadoPedidoEnum, CanalContactoEnum
from app.pedidos.schemas import PedidoCreate, PedidoOut
from app.productos.models import Producto, EstadoProductoEnum, MediaArchivo, TipoMediaEnum
from app.usuarios.models import Cliente, Empresa
router = APIRouter(tags=["pedidos", "devoluciones"])

_P4 = "Implementación pendiente — Fase 4"

# ── Helper ────────────────────────────────────────────────────────────────────
def _get_cliente(payload: dict, db: Session) -> Cliente:
    usuario_id = int(payload["sub"])
    cliente = db.query(Cliente).filter(Cliente.usuario_id == usuario_id).first()
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente no encontrado"
        )
    return cliente

# ── Pedidos ───────────────────────────────────────────────────────────────────
@router.post(
    "/pedidos",
    response_model=PedidoOut,
    status_code=status.HTTP_201_CREATED,
)
def create_pedido(
    body: PedidoCreate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_rol("cliente")),
):
    """Cliente confirma su carrito. El pedido nace en estado 'pendiente' y queda
    a la espera de que la(s) empresa(s) lo acepten o rechacen."""
    cliente = _get_cliente(payload, db)

    if not body.items:
        raise HTTPException(status_code=400, detail="El pedido debe tener al menos un producto")

    # Validar canal
    try:
        canal = CanalContactoEnum(body.canal_contacto)
    except ValueError:
        raise HTTPException(status_code=400, detail="Canal de contacto inválido")

    # Cargar todos los productos del pedido y validar
    producto_ids = [it.producto_id for it in body.items]
    productos = (
        db.query(Producto)
        .options(joinedload(Producto.media))
        .filter(Producto.id.in_(producto_ids))
        .all()
    )
    productos_map = {p.id: p for p in productos}

    total = 0.0
    for it in body.items:
        if it.cantidad <= 0:
            raise HTTPException(status_code=400, detail="La cantidad debe ser mayor a 0")
        prod = productos_map.get(it.producto_id)
        if not prod:
            raise HTTPException(status_code=404, detail=f"Producto {it.producto_id} no encontrado")
        if prod.estado != EstadoProductoEnum.activo:
            raise HTTPException(
                status_code=400,
                detail=f"El producto '{prod.nombre}' no está disponible",
            )
        if prod.stock is not None and prod.stock < it.cantidad:
            raise HTTPException(
                status_code=400,
                detail=f"Stock insuficiente para '{prod.nombre}' (disponible: {prod.stock})",
            )
        total += prod.precio * it.cantidad

    # Crear pedido
    pedido = Pedido(
        cliente_id=cliente.id,
        total=round(total, 2),
        estado=EstadoPedidoEnum.pendiente,
        canal_contacto=canal,
    )
    db.add(pedido)
    db.flush()  # obtener id

    for it in body.items:
        prod = productos_map[it.producto_id]
        imagen_url = None
        if prod.media:
            primera = next(
                (m for m in prod.media if m.tipo == TipoMediaEnum.imagen),
                None,
            )
            if primera:
                imagen_url = primera.cloudinary_url

        item = ItemPedido(
            pedido_id=pedido.id,
            producto_id=prod.id,
            cantidad=it.cantidad,
            precio_unitario=prod.precio,
            producto_nombre_snapshot=prod.nombre,
            producto_descripcion_snapshot=prod.descripcion,
            producto_imagen_url_snapshot=imagen_url,
        )
        db.add(item)

    db.commit()

    pedido_completo = (
        db.query(Pedido)
        .options(
            joinedload(Pedido.items)
            .joinedload(ItemPedido.producto)
            .joinedload(Producto.media)
        )
        .filter(Pedido.id == pedido.id)
        .first()
    )
    return pedido_completo


@router.get(
    "/clientes/pedidos",
    response_model=list[PedidoOut],
)
def list_mis_pedidos(
    db: Session = Depends(get_db),
    payload: dict = Depends(require_rol("cliente")),
):
    cliente = _get_cliente(payload, db)
    pedidos = (
        db.query(Pedido)
        .options(
            joinedload(Pedido.items)
            .joinedload(ItemPedido.producto)  
            .joinedload(Producto.media),
            joinedload(Pedido.encuesta)
        )
        .filter(Pedido.cliente_id == cliente.id)
        .order_by(Pedido.fecha_pedido.desc())
        .all()
    )
    return pedidos

@router.get(
    "/pedidos/{pedido_id}",
    response_model=PedidoOut,
)
def get_pedido(
    pedido_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_rol("cliente")),
):
    cliente = _get_cliente(payload, db)
    pedido = (
        db.query(Pedido)
        .options(
            joinedload(Pedido.items)
            .joinedload(ItemPedido.producto)
            .joinedload(Producto.media),
            joinedload(Pedido.encuesta)
        )
        .filter(Pedido.id == pedido_id, Pedido.cliente_id == cliente.id)
        .first()
    )
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return pedido

@router.put(
    "/pedidos/{pedido_id}/entregar",
    response_model=PedidoOut,
)
def marcar_entregado(
    pedido_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_rol("empresa", "admin")),
):
    """Marca un pedido como entregado y crea/envía la encuesta de satisfacción."""
    pedido = (
        db.query(Pedido)
        .options(
            joinedload(Pedido.items).joinedload(ItemPedido.producto),
            joinedload(Pedido.cliente).joinedload(Cliente.usuario),
        )
        .filter(Pedido.id == pedido_id)
        .first()
    )

    if not pedido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido no encontrado"
        )

    # Verificar que no esté ya entregado
    if pedido.estado == EstadoPedidoEnum.entregado:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El pedido ya está marcado como entregado"
        )

    # Actualizar estado y fecha de entrega
    pedido.estado = EstadoPedidoEnum.entregado
    pedido.fecha_entrega = datetime.now(timezone.utc)

    # Verificar si ya existen encuestas para este pedido
    encuestas_existentes = (
        db.query(EncuestaSatisfaccion)
        .filter(EncuestaSatisfaccion.pedido_id == pedido_id)
        .count()
    )

    if encuestas_existentes == 0:
        # Crear encuestas pendientes para TODOS los productos del pedido
        encuestas = crear_encuestas_pendientes_pedido(db, pedido_id)

        if encuestas:
            # Enviar notificación según canal de contacto preferido
            cliente = pedido.cliente
            email_destino = cliente.usuario.correo if cliente.usuario else None
            nombre_cliente = cliente.nombre if cliente else "Cliente"

            if pedido.canal_contacto in (CanalContactoEnum.web, CanalContactoEnum.whatsapp):
                # Para web y whatsapp enviamos email (en MVP whatsapp simula)
                if pedido.canal_contacto == CanalContactoEnum.whatsapp:
                    for encuesta in encuestas:
                        notificar_encuesta_whatsapp_telefono(encuesta, pedido, CanalContactoEnum.whatsapp)

                if email_destino:
                    enviar_encuesta_email(db, encuestas, pedido, email_destino, nombre_cliente)

            elif pedido.canal_contacto == CanalContactoEnum.telefono:
                # Para teléfono solo simulamos
                for encuesta in encuestas:
                    notificar_encuesta_whatsapp_telefono(encuesta, pedido, CanalContactoEnum.telefono)

    db.commit()
    db.refresh(pedido)

    return pedido


# ── Empresa: gestión de pedidos (aceptar / rechazar) ─────────────────────────
def _get_empresa_for_user(payload: dict, db: Session) -> Empresa:
    usuario_id = int(payload["sub"])
    empresa = db.query(Empresa).filter(Empresa.usuario_id == usuario_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    return empresa


class PedidoEmpresaItemOut(BaseModel):
    id: int
    producto_id: int | None
    cantidad: int
    precio_unitario: float
    producto_nombre: str | None = None
    producto_imagen_url: str | None = None
    es_de_esta_empresa: bool

    model_config = {"from_attributes": True}


class PedidoEmpresaOut(BaseModel):
    id: int
    estado: str
    fecha_pedido: datetime
    fecha_entrega: datetime | None = None
    total: float
    canal_contacto: str
    motivo_rechazo: str | None = None
    cliente_nombre: str
    cliente_correo: str
    subtotal_empresa: float
    items: list[PedidoEmpresaItemOut] = []


class RechazarPedidoBody(BaseModel):
    motivo: str = Field(..., min_length=3, max_length=500)


def _pedido_to_empresa_out(pedido: Pedido, empresa_id: int) -> PedidoEmpresaOut:
    cliente = pedido.cliente
    correo = cliente.usuario.correo if cliente and cliente.usuario else ""
    nombre = cliente.nombre if cliente else "Cliente"

    items_out: list[PedidoEmpresaItemOut] = []
    subtotal = 0.0
    for it in pedido.items:
        prod = it.producto
        es_de_empresa = bool(prod and prod.empresa_id == empresa_id)
        if es_de_empresa:
            subtotal += it.cantidad * it.precio_unitario
        items_out.append(PedidoEmpresaItemOut(
            id=it.id,
            producto_id=it.producto_id,
            cantidad=it.cantidad,
            precio_unitario=it.precio_unitario,
            producto_nombre=it.producto_nombre_snapshot or (prod.nombre if prod else None),
            producto_imagen_url=it.producto_imagen_url_snapshot,
            es_de_esta_empresa=es_de_empresa,
        ))

    return PedidoEmpresaOut(
        id=pedido.id,
        estado=pedido.estado.value,
        fecha_pedido=pedido.fecha_pedido,
        fecha_entrega=pedido.fecha_entrega,
        total=pedido.total,
        canal_contacto=pedido.canal_contacto.value,
        motivo_rechazo=pedido.motivo_rechazo,
        cliente_nombre=nombre,
        cliente_correo=correo,
        subtotal_empresa=round(subtotal, 2),
        items=items_out,
    )


@router.get("/empresa/pedidos", response_model=list[PedidoEmpresaOut])
def listar_pedidos_empresa(
    estado: str | None = None,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_rol("empresa")),
):
    """Lista los pedidos que contienen al menos un producto de esta empresa.
    Filtro opcional por estado (pendiente, confirmado, enviado, entregado, cancelado)."""
    empresa = _get_empresa_for_user(payload, db)

    q = (
        db.query(Pedido)
        .join(ItemPedido, Pedido.id == ItemPedido.pedido_id)
        .join(Producto, ItemPedido.producto_id == Producto.id)
        .filter(Producto.empresa_id == empresa.id)
        .options(
            joinedload(Pedido.items).joinedload(ItemPedido.producto),
            joinedload(Pedido.cliente).joinedload(Cliente.usuario),
        )
        .distinct()
    )

    if estado:
        try:
            estado_enum = EstadoPedidoEnum(estado)
        except ValueError:
            raise HTTPException(status_code=400, detail="Estado inválido")
        q = q.filter(Pedido.estado == estado_enum)

    pedidos = q.order_by(Pedido.fecha_pedido.desc()).all()
    return [_pedido_to_empresa_out(p, empresa.id) for p in pedidos]


@router.put("/empresa/pedidos/{pedido_id}/aceptar", response_model=PedidoEmpresaOut)
def aceptar_pedido(
    pedido_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_rol("empresa")),
):
    """Marca un pedido como 'confirmado'. La empresa debe tener al menos un producto en él."""
    empresa = _get_empresa_for_user(payload, db)

    pedido = (
        db.query(Pedido)
        .options(
            joinedload(Pedido.items).joinedload(ItemPedido.producto),
            joinedload(Pedido.cliente).joinedload(Cliente.usuario),
        )
        .filter(Pedido.id == pedido_id)
        .first()
    )
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    if not any(it.producto and it.producto.empresa_id == empresa.id for it in pedido.items):
        raise HTTPException(status_code=403, detail="Este pedido no contiene productos de tu empresa")

    if pedido.estado != EstadoPedidoEnum.pendiente:
        raise HTTPException(
            status_code=400,
            detail=f"Solo se pueden aceptar pedidos pendientes (estado actual: {pedido.estado.value})",
        )

    pedido.estado = EstadoPedidoEnum.confirmado
    db.commit()
    db.refresh(pedido)
    return _pedido_to_empresa_out(pedido, empresa.id)


@router.put("/empresa/pedidos/{pedido_id}/rechazar", response_model=PedidoEmpresaOut)
def rechazar_pedido(
    pedido_id: int,
    body: RechazarPedidoBody,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_rol("empresa")),
):
    """Rechaza un pedido pendiente con un motivo. El pedido pasa a 'cancelado'."""
    empresa = _get_empresa_for_user(payload, db)

    pedido = (
        db.query(Pedido)
        .options(
            joinedload(Pedido.items).joinedload(ItemPedido.producto),
            joinedload(Pedido.cliente).joinedload(Cliente.usuario),
        )
        .filter(Pedido.id == pedido_id)
        .first()
    )
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    if not any(it.producto and it.producto.empresa_id == empresa.id for it in pedido.items):
        raise HTTPException(status_code=403, detail="Este pedido no contiene productos de tu empresa")

    if pedido.estado != EstadoPedidoEnum.pendiente:
        raise HTTPException(
            status_code=400,
            detail=f"Solo se pueden rechazar pedidos pendientes (estado actual: {pedido.estado.value})",
        )

    pedido.estado = EstadoPedidoEnum.cancelado
    pedido.motivo_rechazo = body.motivo.strip()
    db.commit()
    db.refresh(pedido)
    return _pedido_to_empresa_out(pedido, empresa.id)


@router.put("/empresa/pedidos/{pedido_id}/enviar", response_model=PedidoEmpresaOut)
def marcar_enviado(
    pedido_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_rol("empresa")),
):
    """Pasa de 'confirmado' a 'enviado'."""
    empresa = _get_empresa_for_user(payload, db)
    pedido = (
        db.query(Pedido)
        .options(
            joinedload(Pedido.items).joinedload(ItemPedido.producto),
            joinedload(Pedido.cliente).joinedload(Cliente.usuario),
        )
        .filter(Pedido.id == pedido_id)
        .first()
    )
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    if not any(it.producto and it.producto.empresa_id == empresa.id for it in pedido.items):
        raise HTTPException(status_code=403, detail="Pedido no pertenece a tu empresa")
    if pedido.estado != EstadoPedidoEnum.confirmado:
        raise HTTPException(
            status_code=400,
            detail=f"Solo se pueden enviar pedidos confirmados (estado actual: {pedido.estado.value})",
        )
    pedido.estado = EstadoPedidoEnum.enviado
    db.commit()
    db.refresh(pedido)
    return _pedido_to_empresa_out(pedido, empresa.id)


# ── Empresa: política de devoluciones (días) ─────────────────────────────────
class ConfiguracionDevolucionOut(BaseModel):
    dias_devolucion: int


class ConfiguracionDevolucionUpdate(BaseModel):
    dias_devolucion: int = Field(..., ge=1, le=90)


@router.get("/empresa/configuracion/devoluciones", response_model=ConfiguracionDevolucionOut)
def get_config_devoluciones(
    db: Session = Depends(get_db),
    payload: dict = Depends(require_rol("empresa")),
):
    empresa = _get_empresa_for_user(payload, db)
    return ConfiguracionDevolucionOut(dias_devolucion=empresa.dias_devolucion or 15)


@router.put("/empresa/configuracion/devoluciones", response_model=ConfiguracionDevolucionOut)
def update_config_devoluciones(
    body: ConfiguracionDevolucionUpdate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_rol("empresa")),
):
    empresa = _get_empresa_for_user(payload, db)
    empresa.dias_devolucion = body.dias_devolucion
    db.commit()
    db.refresh(empresa)
    return ConfiguracionDevolucionOut(dias_devolucion=empresa.dias_devolucion)


# ── Devoluciones ──────────────────────────────────────────────────────────────
@router.post(
    "/devoluciones",
    response_model=DevolucionOut,
    status_code=status.HTTP_201_CREATED,
)
def solicitar_devolucion(
    body: DevolucionCreate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_rol("cliente")),
):
    raise HTTPException(status_code=501, detail=_P4)


@router.get(
    "/empresa/devoluciones",
    response_model=list[DevolucionOut],
)
def list_devoluciones_empresa(
    db: Session = Depends(get_db),
    payload: dict = Depends(require_rol("empresa")),
):
    raise HTTPException(status_code=501, detail=_P4)


@router.put(
    "/devoluciones/{devolucion_id}/estado",
    response_model=DevolucionOut,
)
def update_estado_devolucion(
    devolucion_id: int,
    body: DevolucionEstadoUpdate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_rol("empresa", "admin")),
):
    raise HTTPException(status_code=501, detail=_P4)