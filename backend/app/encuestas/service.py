"""Encuestas service — lógica de envío de encuestas y notificaciones."""
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.email import send_email
from app.encuestas.models import EncuestaSatisfaccion
from app.pedidos.models import Pedido, ItemPedido, CanalContactoEnum


def crear_encuesta_pendiente(db: Session, pedido_id: int) -> EncuestaSatisfaccion:
    """Crea una encuesta pendiente asociada al pedido.

    Usa el primer producto del pedido para la encuesta.
    """
    # Buscar el primer item del pedido para asociar el producto
    item = db.query(ItemPedido).filter(ItemPedido.pedido_id == pedido_id).first()
    producto_id = item.producto_id if item else None

    encuesta = EncuestaSatisfaccion(
        pedido_id=pedido_id,
        producto_id=producto_id,
        respondida=False,
        omitida=False,
        recordatorio_activo=False,
    )
    db.add(encuesta)
    db.commit()
    db.refresh(encuesta)
    return encuesta


def crear_encuestas_pendientes_pedido(db: Session, pedido_id: int) -> list[EncuestaSatisfaccion]:
    """Crea encuestas pendientes para TODOS los productos del pedido.

    Retorna la lista de encuestas creadas.
    """
    # Buscar todos los items del pedido con sus productos
    items = db.query(ItemPedido).filter(ItemPedido.pedido_id == pedido_id).all()
    
    encuestas_creadas = []
    
    for item in items:
        if item.producto_id:
            # Verificar si ya existe encuesta para este producto en este pedido
            existente = (
                db.query(EncuestaSatisfaccion)
                .filter(
                    EncuestaSatisfaccion.pedido_id == pedido_id,
                    EncuestaSatisfaccion.producto_id == item.producto_id
                )
                .first()
            )
            
            if not existente:
                encuesta = EncuestaSatisfaccion(
                    pedido_id=pedido_id,
                    producto_id=item.producto_id,
                    respondida=False,
                    omitida=False,
                    recordatorio_activo=False,
                )
                db.add(encuesta)
                encuestas_creadas.append(encuesta)
    
    if encuestas_creadas:
        db.commit()
        for encuesta in encuestas_creadas:
            db.refresh(encuesta)
    
    return encuestas_creadas


def enviar_encuesta_email(
    db: Session,
    encuestas: list[EncuestaSatisfaccion],
    pedido: Pedido,
    email_destino: str,
    nombre_cliente: str,
) -> None:
    """Envía las encuestas por email al cliente.

    Si SMTP no está configurado, imprime el link en consola.
    """
    # URLs de todas las encuestas
    encuestas_info = []
    for encuesta in encuestas:
        encuesta_url = f"{settings.frontend_url}/encuestas/{encuesta.id}"
        producto_nombre = encuesta.producto.nombre if encuesta.producto else f"Producto #{encuesta.producto_id}"
        encuestas_info.append((producto_nombre, encuesta_url))

    asunto = f"¿Cómo fue tu experiencia con tu pedido #{pedido.id}?"

    # Generar HTML con todos los productos
    encuestas_html = ""
    for producto_nombre, encuesta_url in encuestas_info:
        encuestas_html += f"""
        <div style="margin: 16px 0; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <p style="margin: 0 0 12px 0; font-weight: 600;">{producto_nombre}</p>
            <a href="{encuesta_url}" style="
                background: #0D9488;
                color: white;
                padding: 10px 20px;
                text-decoration: none;
                border-radius: 6px;
                display: inline-block;
                font-size: 14px;
            ">
                Calificar este producto
            </a>
        </div>
        """

    html = f"""
    <h2>¡Hola {nombre_cliente}!</h2>
    <p>Tu pedido #{pedido.id} ha sido entregado. Nos gustaría conocer tu opinión sobre cada producto:</p>
    {encuestas_html}
    <p style="color: #6B7280; font-size: 12px; margin-top: 24px;">
        Gracias por comprar en Zona Zapatos
    </p>
    """

    # Si no hay SMTP configurado, imprime los links en consola para desarrollo
    if not settings.smtp_user or not settings.smtp_password:
        print(f"\n[DEV] Encuestas de satisfacción para {email_destino}:")
        for producto_nombre, encuesta_url in encuestas_info:
            print(f"  - {producto_nombre}: {encuesta_url}")
        print()
        return

    try:
        send_email(to=email_destino, subject=asunto, html_body=html)
    except Exception as e:
        print(f"[WARN] No se pudo enviar encuesta a {email_destino}: {e}")


def notificar_encuesta_whatsapp_telefono(
    encuesta: EncuestaSatisfaccion,
    pedido: Pedido,
    canal: CanalContactoEnum,
) -> None:
    """Simula notificación por WhatsApp o Teléfono.

    En MVP solo loguea a consola. En producción integraría Twilio/API de WhatsApp.
    """
    encuesta_url = f"{settings.frontend_url}/encuestas/{encuesta.id}"

    if canal == CanalContactoEnum.whatsapp:
        print(f"\n[WHATSAPP MOCK] Enviar a {pedido.cliente.telefono or 'N/A'}:\n")
        print(f"  ¡Hola! Tu pedido #{pedido.id} fue entregado.")
        print(f"  Cuéntanos tu experiencia: {encuesta_url}\n")
    elif canal == CanalContactoEnum.telefono:
        print(f"\n[TELÉFONO MOCK] Llamar a {pedido.cliente.telefono or 'N/A'}:\n")
        print(f"  Mensaje: Solicitar calificación del pedido #{pedido.id}\n")
