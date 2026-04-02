from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from random import Random
import sys
from urllib.parse import quote_plus

from sqlalchemy import delete

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.dashboard.models import AnalisisDevolucion, DashboardVentas, PrediccionVentas
from app.devoluciones.models import Devolucion, EstadoDevolucionEnum, EvidenciaDevolucion, TipoArchivoEnum
from app.encuestas.models import EncuestaSatisfaccion
from app.pedidos.models import CanalContactoEnum, EstadoPedidoEnum, ItemPedido, Pedido
from app.productos.models import Categoria, MediaArchivo, Producto, TipoMediaEnum
from app.usuarios.models import Administrador, Cliente, Empresa, RolEnum, Usuario

SEED_PASSWORD = "SeedDemo2026!"
SEED_EMAILS = {
    "admin.seed@zapatos.local",
    "aurora.seed@zapatos.local",
    "trocha.seed@zapatos.local",
    "cordillera.seed@zapatos.local",
    "atelier.seed@zapatos.local",
    "brio.seed@zapatos.local",
    "surco.seed@zapatos.local",
    "natalia.seed@zapatos.local",
    "santiago.seed@zapatos.local",
    "laura.seed@zapatos.local",
    "miguel.seed@zapatos.local",
    "camila.seed@zapatos.local",
    "daniel.seed@zapatos.local",
    "valentina.seed@zapatos.local",
    "sebastian.seed@zapatos.local",
    "paula.seed@zapatos.local",
    "julian.seed@zapatos.local",
    "manuela.seed@zapatos.local",
    "andres.seed@zapatos.local",
    "carolina.seed@zapatos.local",
    "mateo.seed@zapatos.local",
    "isabella.seed@zapatos.local",
    "david.seed@zapatos.local",
    "sofia.seed@zapatos.local",
    "felipe.seed@zapatos.local",
    "mariana.seed@zapatos.local",
    "juan.seed@zapatos.local",
    "gabriela.seed@zapatos.local",
}
SEED_NITS = {
    "900100001-1",
    "900100002-2",
    "900100003-3",
    "900100004-4",
    "900100005-5",
    "900100006-6",
}
RNG = Random(20260401)


def placeholder_image(label: str, bg: str = "F7F5F2", fg: str = "111827") -> str:
    return f"https://placehold.co/900x675/{bg}/{fg}?text={quote_plus(label)}"


def placeholder_logo(label: str) -> str:
    return f"https://placehold.co/320x320/1f2937/f8fafc?text={quote_plus(label)}"


def model_url() -> str:
    return settings.demo_model_3d_url


COMPANIES = [
    {
        "email": "aurora.seed@zapatos.local",
        "name": "Calzado Aurora",
        "nit": "900100001-1",
        "city": "Cucuta",
        "address": "Av. Libertadores 14-32",
        "phone": "573001111101",
        "logo": placeholder_logo("Aurora"),
        "products": [
            {
                "nombre": "Aurora Street Air",
                "descripcion": "Tenis urbano liviano para uso diario con suela acolchada y look deportivo.",
                "precio": 389900,
                "talla": "36,37,38,39,40",
                "color": "Negro,Vinotinto,Blanco",
                "stock": 15,
                "estado": "activo",
                "categorias": ["tenis", "urbano"],
                "images": ["Aurora Street Air frontal", "Aurora Street Air lateral"],
                "has_3d": True,
            },
            {
                "nombre": "Aurora Motion Knit",
                "descripcion": "Tenis tejido con ajuste flexible, ideal para caminatas largas y jornadas activas.",
                "precio": 329900,
                "talla": "35,36,37,38,39",
                "color": "Gris,Rosa,Negro",
                "stock": 9,
                "estado": "activo",
                "categorias": ["tenis", "deportivo"],
                "images": ["Aurora Motion Knit 1", "Aurora Motion Knit 2"],
                "has_3d": False,
            },
            {
                "nombre": "Aurora Weekend Slip",
                "descripcion": "Zapato casual sin cordones, comodo para oficina informal y salidas de fin de semana.",
                "precio": 279900,
                "talla": "36,37,38,39",
                "color": "Beige,Negro",
                "stock": 7,
                "estado": "activo",
                "categorias": ["casual", "urbano"],
                "images": ["Aurora Weekend Slip 1", "Aurora Weekend Slip 2"],
                "has_3d": False,
            },
        ],
    },
    {
        "email": "trocha.seed@zapatos.local",
        "name": "Trocha Outdoor",
        "nit": "900100002-2",
        "city": "Pamplona",
        "address": "Cra. 7 10-45",
        "phone": "573001111202",
        "logo": placeholder_logo("Trocha"),
        "products": [
            {
                "nombre": "Trocha Trail Pro",
                "descripcion": "Bota outdoor con agarre reforzado y capellada resistente para senderismo liviano.",
                "precio": 459900,
                "talla": "38,39,40,41,42,43",
                "color": "Oliva,Cafe,Negro",
                "stock": 11,
                "estado": "activo",
                "categorias": ["bota", "outdoor"],
                "images": ["Trocha Trail Pro 1", "Trocha Trail Pro 2"],
                "has_3d": True,
            },
            {
                "nombre": "Trocha Canyon Mid",
                "descripcion": "Bota media para ciudad y terreno mixto con proteccion en tobillo.",
                "precio": 419900,
                "talla": "39,40,41,42,43",
                "color": "Arena,Cafe",
                "stock": 6,
                "estado": "activo",
                "categorias": ["bota", "casual"],
                "images": ["Trocha Canyon Mid 1", "Trocha Canyon Mid 2"],
                "has_3d": False,
            },
            {
                "nombre": "Trocha Trek Lite",
                "descripcion": "Tenis outdoor de secado rapido para clima calido y caminata urbana.",
                "precio": 309900,
                "talla": "38,39,40,41,42",
                "color": "Gris,Azul",
                "stock": 13,
                "estado": "activo",
                "categorias": ["tenis", "outdoor"],
                "images": ["Trocha Trek Lite 1", "Trocha Trek Lite 2"],
                "has_3d": False,
            },
        ],
    },
    {
        "email": "cordillera.seed@zapatos.local",
        "name": "Cordillera Kids",
        "nit": "900100003-3",
        "city": "Bucaramanga",
        "address": "Calle 36 22-14",
        "phone": "573001111303",
        "logo": placeholder_logo("Cordillera"),
        "products": [
            {
                "nombre": "Cordillera Kids Play",
                "descripcion": "Tenis infantil flexible con suela antideslizante y velcro doble.",
                "precio": 189900,
                "talla": "28,29,30,31,32,33",
                "color": "Azul,Rosa,Verde",
                "stock": 18,
                "estado": "activo",
                "categorias": ["infantil", "tenis"],
                "images": ["Kids Play 1", "Kids Play 2"],
                "has_3d": False,
            },
            {
                "nombre": "Cordillera School Day",
                "descripcion": "Zapato escolar resistente con refuerzo en punta y plantilla acolchada.",
                "precio": 209900,
                "talla": "29,30,31,32,33,34",
                "color": "Negro",
                "stock": 14,
                "estado": "activo",
                "categorias": ["infantil", "escolar"],
                "images": ["School Day 1", "School Day 2"],
                "has_3d": True,
            },
            {
                "nombre": "Cordillera Jump Mini",
                "descripcion": "Tenis liviano para recreacion y educacion fisica.",
                "precio": 179900,
                "talla": "27,28,29,30,31",
                "color": "Blanco,Royal,Coral",
                "stock": 10,
                "estado": "activo",
                "categorias": ["infantil", "deportivo"],
                "images": ["Jump Mini 1", "Jump Mini 2"],
                "has_3d": False,
            },
        ],
    },
    {
        "email": "atelier.seed@zapatos.local",
        "name": "Atelier Cuero",
        "nit": "900100004-4",
        "city": "Bogota",
        "address": "Calle 82 11-20",
        "phone": "573001111404",
        "logo": placeholder_logo("Atelier"),
        "products": [
            {
                "nombre": "Atelier Derby Legacy",
                "descripcion": "Zapato formal en cuero liso para oficina y eventos de negocio.",
                "precio": 499900,
                "talla": "39,40,41,42,43",
                "color": "Negro,Cafe",
                "stock": 8,
                "estado": "activo",
                "categorias": ["formal", "cuero"],
                "images": ["Derby Legacy 1", "Derby Legacy 2"],
                "has_3d": True,
            },
            {
                "nombre": "Atelier Loafer Prime",
                "descripcion": "Mocasin premium con construccion suave y acabado sobrio.",
                "precio": 469900,
                "talla": "38,39,40,41,42",
                "color": "Tabaco,Negro",
                "stock": 5,
                "estado": "activo",
                "categorias": ["formal", "casual"],
                "images": ["Loafer Prime 1", "Loafer Prime 2"],
                "has_3d": False,
            },
            {
                "nombre": "Atelier Oxford Line",
                "descripcion": "Oxford clasico de horma estilizada para traje y ceremonia.",
                "precio": 519900,
                "talla": "39,40,41,42",
                "color": "Negro",
                "stock": 4,
                "estado": "activo",
                "categorias": ["formal", "cuero"],
                "images": ["Oxford Line 1", "Oxford Line 2"],
                "has_3d": False,
            },
        ],
    },
    {
        "email": "brio.seed@zapatos.local",
        "name": "Brio Fit",
        "nit": "900100005-5",
        "city": "Medellin",
        "address": "Cl. 10A 43F-12",
        "phone": "573001111505",
        "logo": placeholder_logo("Brio"),
        "products": [
            {
                "nombre": "Brio Run Pulse",
                "descripcion": "Tenis de running para entrenamiento corto con retorno de energia.",
                "precio": 349900,
                "talla": "36,37,38,39,40,41",
                "color": "Negro,Lila,Coral",
                "stock": 16,
                "estado": "activo",
                "categorias": ["deportivo", "tenis"],
                "images": ["Run Pulse 1", "Run Pulse 2"],
                "has_3d": True,
            },
            {
                "nombre": "Brio Gym Base",
                "descripcion": "Tenis versatil para gimnasio y uso diario con base estable.",
                "precio": 299900,
                "talla": "35,36,37,38,39,40",
                "color": "Blanco,Gris,Negro",
                "stock": 17,
                "estado": "activo",
                "categorias": ["deportivo", "urbano"],
                "images": ["Gym Base 1", "Gym Base 2"],
                "has_3d": False,
            },
            {
                "nombre": "Brio Flow Women",
                "descripcion": "Tenis femenino ligero para caminata y entreno funcional.",
                "precio": 319900,
                "talla": "35,36,37,38,39",
                "color": "Perla,Rosa,Negro",
                "stock": 12,
                "estado": "activo",
                "categorias": ["deportivo", "tenis"],
                "images": ["Flow Women 1", "Flow Women 2"],
                "has_3d": False,
            },
        ],
    },
    {
        "email": "surco.seed@zapatos.local",
        "name": "Surco Sandals",
        "nit": "900100006-6",
        "city": "Santa Marta",
        "address": "Av. del Libertador 5-33",
        "phone": "573001111606",
        "logo": placeholder_logo("Surco"),
        "products": [
            {
                "nombre": "Surco Breeze Sandal",
                "descripcion": "Sandalia comoda para clima calido con plantilla acolchada.",
                "precio": 149900,
                "talla": "35,36,37,38,39,40",
                "color": "Miel,Negro,Blanco",
                "stock": 20,
                "estado": "activo",
                "categorias": ["sandalia", "casual"],
                "images": ["Breeze Sandal 1", "Breeze Sandal 2"],
                "has_3d": False,
            },
            {
                "nombre": "Surco Palm Slide",
                "descripcion": "Slide casual de secado rapido para piscina y playa.",
                "precio": 99900,
                "talla": "36,37,38,39,40,41",
                "color": "Negro,Azul,Beige",
                "stock": 22,
                "estado": "activo",
                "categorias": ["sandalia", "verano"],
                "images": ["Palm Slide 1", "Palm Slide 2"],
                "has_3d": True,
            },
            {
                "nombre": "Surco Riviera Strap",
                "descripcion": "Sandalia de tiras para salidas casuales con estetica artesanal.",
                "precio": 169900,
                "talla": "35,36,37,38,39",
                "color": "Arena,Dorado,Cafe",
                "stock": 11,
                "estado": "activo",
                "categorias": ["sandalia", "casual"],
                "images": ["Riviera Strap 1", "Riviera Strap 2"],
                "has_3d": False,
            },
        ],
    },
]

CLIENTS = [
    ("natalia.seed@zapatos.local", "Natalia Rojas", "Bogota", "573001000111"),
    ("santiago.seed@zapatos.local", "Santiago Vera", "Cucuta", "573001000112"),
    ("laura.seed@zapatos.local", "Laura Pabon", "Pamplona", "573001000113"),
    ("miguel.seed@zapatos.local", "Miguel Duran", "Bucaramanga", "573001000114"),
    ("camila.seed@zapatos.local", "Camila Cardenas", "Medellin", "573001000115"),
    ("daniel.seed@zapatos.local", "Daniel Quintero", "Bogota", "573001000116"),
    ("valentina.seed@zapatos.local", "Valentina Perez", "Cali", "573001000117"),
    ("sebastian.seed@zapatos.local", "Sebastian Mejia", "Barranquilla", "573001000118"),
    ("paula.seed@zapatos.local", "Paula Contreras", "Cucuta", "573001000119"),
    ("julian.seed@zapatos.local", "Julian Ariza", "Bucaramanga", "573001000120"),
    ("manuela.seed@zapatos.local", "Manuela Rico", "Bogota", "573001000121"),
    ("andres.seed@zapatos.local", "Andres Plata", "Medellin", "573001000122"),
    ("carolina.seed@zapatos.local", "Carolina Rangel", "Cucuta", "573001000123"),
    ("mateo.seed@zapatos.local", "Mateo Lozano", "Pereira", "573001000124"),
    ("isabella.seed@zapatos.local", "Isabella Jaimes", "Bogota", "573001000125"),
    ("david.seed@zapatos.local", "David Solano", "Manizales", "573001000126"),
    ("sofia.seed@zapatos.local", "Sofia Villamizar", "Cucuta", "573001000127"),
    ("felipe.seed@zapatos.local", "Felipe Ospina", "Medellin", "573001000128"),
    ("mariana.seed@zapatos.local", "Mariana Duarte", "Bogota", "573001000129"),
    ("juan.seed@zapatos.local", "Juan Esteban Ruiz", "Cali", "573001000130"),
    ("gabriela.seed@zapatos.local", "Gabriela Forero", "Santa Marta", "573001000131"),
]

CATEGORIES = [
    ("tenis", "Calzado deportivo y urbano tipo tenis"),
    ("urbano", "Modelos para uso diario en ciudad"),
    ("deportivo", "Productos para entrenamiento y actividad fisica"),
    ("bota", "Botas outdoor y urbanas"),
    ("casual", "Calzado casual de uso frecuente"),
    ("formal", "Calzado de vestir para oficina o ceremonia"),
    ("cuero", "Productos elaborados en cuero"),
    ("infantil", "Calzado para ninos y ninas"),
    ("escolar", "Calzado resistente para colegio"),
    ("sandalia", "Sandalias y slides"),
    ("verano", "Modelos frescos para clima calido"),
    ("outdoor", "Calzado para caminata y terreno mixto"),
]

SATISFACTION_COMMENTS = {
    5: [
        "La horma me quedo perfecta y el acabado supera lo que esperaba.",
        "Muy comodos desde el primer uso, se nota la calidad en la suela y costuras.",
        "Llegaron a tiempo y el color se ve incluso mejor que en la foto.",
        "Los use toda la semana y no me generaron molestias. Volveria a comprar.",
    ],
    4: [
        "En general muy buenos, aunque me hubiera gustado un poco mas de acolchado interno.",
        "El diseno me encanto y la talla si corresponde, solo mejoraria el empaque.",
        "Buen producto, comodo para caminar, pero el tono del color es un poco mas claro.",
        "La entrega fue correcta y el zapato se siente bien hecho, aunque esperaba mas ventilacion.",
    ],
    3: [
        "El producto cumple, pero la comodidad no fue tan alta como esperaba para usarlo muchas horas.",
        "La talla me funciono, aunque senti el empeine un poco ajustado.",
        "Visualmente esta bien, pero la plantilla podria ser mas suave.",
        "No esta mal, aunque me costo un poco adaptarme a la horma.",
    ],
    2: [
        "El diseno me gusto, pero el ajuste no fue consistente entre un pie y otro.",
        "Se ve bien, aunque la comodidad no estuvo al nivel del precio.",
        "Lo senti mas rigido de lo esperado y me genero roce en uso prolongado.",
    ],
    1: [
        "La talla no correspondio y el zapato me genero mucha incomodidad desde el primer dia.",
        "El material no era lo que esperaba y preferi iniciar devolucion.",
        "Tuve problemas con el ajuste y el producto no cumplio con la expectativa.",
    ],
}

RETURN_REASONS = [
    ("talla_pequena", "La talla se sintio mas pequena de lo esperado y genero presion en la punta."),
    ("talla_grande", "El talon se salia al caminar y el ajuste general quedo muy suelto."),
    ("color_distinto", "El tono recibido era diferente al que se percibia en fotos."),
    ("material_rigido", "El material resulto mas rigido de lo esperado para uso diario."),
    ("roce_talon", "El zapato genero friccion en el talon tras una caminata corta."),
    ("acabado", "Llegaron detalles de pegado visibles en la terminacion lateral."),
    ("expectativa", "El estilo no se ajusto a lo que buscaba al verlo en persona."),
]


def reset_existing_seed_data(session) -> None:
    seed_users = session.query(Usuario).filter(Usuario.correo.in_(SEED_EMAILS)).all()
    seed_user_ids = [user.id for user in seed_users]
    seed_company_ids = [user.empresa.id for user in seed_users if user.empresa]
    seed_client_ids = [user.cliente.id for user in seed_users if user.cliente]

    if seed_company_ids:
        product_ids = [row[0] for row in session.query(Producto.id).filter(Producto.empresa_id.in_(seed_company_ids)).all()]
        if product_ids:
            pedido_ids = [row[0] for row in session.query(ItemPedido.pedido_id).filter(ItemPedido.producto_id.in_(product_ids)).distinct().all()]
            if pedido_ids:
                devolucion_ids = [row[0] for row in session.query(Devolucion.id).filter(Devolucion.pedido_id.in_(pedido_ids)).all()]
                if devolucion_ids:
                    session.execute(delete(EvidenciaDevolucion).where(EvidenciaDevolucion.devolucion_id.in_(devolucion_ids)))
                    session.execute(delete(Devolucion).where(Devolucion.id.in_(devolucion_ids)))
                session.execute(delete(EncuestaSatisfaccion).where(EncuestaSatisfaccion.pedido_id.in_(pedido_ids)))
                session.execute(delete(ItemPedido).where(ItemPedido.pedido_id.in_(pedido_ids)))
                session.execute(delete(Pedido).where(Pedido.id.in_(pedido_ids)))

            session.execute(delete(MediaArchivo).where(MediaArchivo.producto_id.in_(product_ids)))
            session.execute(delete(Producto).where(Producto.id.in_(product_ids)))

        session.execute(delete(DashboardVentas).where(DashboardVentas.empresa_id.in_(seed_company_ids)))
        session.execute(delete(AnalisisDevolucion).where(AnalisisDevolucion.empresa_id.in_(seed_company_ids)))
        session.execute(delete(PrediccionVentas).where(PrediccionVentas.empresa_id.in_(seed_company_ids)))
        session.execute(delete(Empresa).where(Empresa.id.in_(seed_company_ids)))

    if seed_client_ids:
        pedido_ids = [row[0] for row in session.query(Pedido.id).filter(Pedido.cliente_id.in_(seed_client_ids)).all()]
        if pedido_ids:
            devolucion_ids = [row[0] for row in session.query(Devolucion.id).filter(Devolucion.pedido_id.in_(pedido_ids)).all()]
            if devolucion_ids:
                session.execute(delete(EvidenciaDevolucion).where(EvidenciaDevolucion.devolucion_id.in_(devolucion_ids)))
                session.execute(delete(Devolucion).where(Devolucion.id.in_(devolucion_ids)))
            session.execute(delete(EncuestaSatisfaccion).where(EncuestaSatisfaccion.pedido_id.in_(pedido_ids)))
            session.execute(delete(ItemPedido).where(ItemPedido.pedido_id.in_(pedido_ids)))
            session.execute(delete(Pedido).where(Pedido.id.in_(pedido_ids)))
        session.execute(delete(Cliente).where(Cliente.id.in_(seed_client_ids)))

    if seed_user_ids:
        session.execute(delete(Administrador).where(Administrador.usuario_id.in_(seed_user_ids)))
        session.execute(delete(Usuario).where(Usuario.id.in_(seed_user_ids)))

    dangling_companies = session.query(Empresa).filter(Empresa.nit.in_(SEED_NITS)).all()
    for empresa in dangling_companies:
        session.delete(empresa)

    existing_categories = session.query(Categoria).filter(Categoria.nombre.in_([name for name, _ in CATEGORIES])).all()
    for category in existing_categories:
        session.delete(category)

    session.commit()


def create_user(session, email: str, role: RolEnum, phone: str | None = None) -> Usuario:
    user = Usuario(
        correo=email,
        password_hash=hash_password(SEED_PASSWORD),
        rol=role,
        cuenta_confirmada=True,
        telefono=phone,
    )
    session.add(user)
    session.flush()
    return user


def seed_categories(session) -> dict[str, Categoria]:
    categories = {}
    for name, description in CATEGORIES:
        category = Categoria(nombre=name, descripcion=description)
        session.add(category)
        session.flush()
        categories[name] = category
    return categories


def seed_companies_and_products(session, categories: dict[str, Categoria]) -> list[Empresa]:
    empresas = []
    for company_data in COMPANIES:
        user = create_user(session, company_data["email"], RolEnum.empresa, company_data["phone"])
        empresa = Empresa(
            usuario_id=user.id,
            nombre=company_data["name"],
            nit=company_data["nit"],
            direccion=company_data["address"],
            ciudad=company_data["city"],
            logo_url=company_data["logo"],
            whatsapp=company_data["phone"],
        )
        session.add(empresa)
        session.flush()

        for index, product_data in enumerate(company_data["products"], start=1):
            producto = Producto(
                nombre=product_data["nombre"],
                descripcion=product_data["descripcion"],
                precio=float(product_data["precio"]),
                talla=product_data["talla"],
                color=product_data["color"],
                stock=product_data["stock"],
                estado=product_data["estado"],
                empresa_id=empresa.id,
                categorias=[categories[name] for name in product_data["categorias"]],
            )
            session.add(producto)
            session.flush()

            for image_index, image_label in enumerate(product_data["images"], start=1):
                session.add(
                    MediaArchivo(
                        cloudinary_url=placeholder_image(image_label),
                        cloudinary_public_id=f"seed/productos/{empresa.id}/{producto.id}/img_{image_index}",
                        tipo=TipoMediaEnum.imagen,
                        formato="png",
                        producto_id=producto.id,
                    )
                )

            if product_data["has_3d"]:
                session.add(
                    MediaArchivo(
                        cloudinary_url=model_url(),
                        cloudinary_public_id=f"seed/productos/{empresa.id}/{producto.id}/model_{index}",
                        tipo=TipoMediaEnum.modelo_3d,
                        formato="glb",
                        producto_id=producto.id,
                    )
                )

        empresas.append(empresa)

    session.flush()
    return empresas


def seed_clients(session) -> list[Cliente]:
    clients = []
    for email, name, city, phone in CLIENTS:
        user = create_user(session, email, RolEnum.cliente, phone)
        cliente = Cliente(
            usuario_id=user.id,
            nombre=name,
            telefono=phone,
            direccion=f"{city}, Colombia",
        )
        session.add(cliente)
        session.flush()
        clients.append(cliente)
    return clients


def create_orders_surveys_and_returns(session, clientes: list[Cliente], empresas: list[Empresa]) -> dict[str, int]:
    all_products = session.query(Producto).all()
    products_by_company = defaultdict(list)
    for product in all_products:
        products_by_company[product.empresa_id].append(product)

    now = datetime.now(timezone.utc)
    order_count = 0
    survey_count = 0
    return_count = 0

    for client_index, cliente in enumerate(clientes):
        number_of_orders = 3 + (client_index % 4)
        preferred_company_ids = [
            empresas[client_index % len(empresas)].id,
            empresas[(client_index + 2) % len(empresas)].id,
        ]

        for order_offset in range(number_of_orders):
            company_id = preferred_company_ids[order_offset % len(preferred_company_ids)]
            product_pool = products_by_company[company_id]
            product = product_pool[(client_index + order_offset) % len(product_pool)]
            quantity = 1 if order_offset % 3 else 2
            order_date = now - timedelta(days=10 + client_index * 3 + order_offset * 9)
            delivered = order_offset % 5 != 4
            estado = EstadoPedidoEnum.entregado if delivered else EstadoPedidoEnum.enviado
            delivery_date = order_date + timedelta(days=3 if delivered else 1)

            pedido = Pedido(
                estado=estado,
                fecha_pedido=order_date,
                fecha_entrega=delivery_date if delivered else None,
                total=float(Decimal(product.precio) * quantity),
                canal_contacto=[
                    CanalContactoEnum.web,
                    CanalContactoEnum.whatsapp,
                    CanalContactoEnum.telefono,
                ][(client_index + order_offset) % 3],
                cliente_id=cliente.id,
            )
            session.add(pedido)
            session.flush()

            session.add(
                ItemPedido(
                    cantidad=quantity,
                    precio_unitario=product.precio,
                    pedido_id=pedido.id,
                    producto_id=product.id,
                )
            )
            order_count += 1

            if not delivered:
                continue

            rating = [5, 4, 5, 3, 4, 2, 5, 4, 1][(client_index + order_offset) % 9]
            comment = SATISFACTION_COMMENTS[rating][
                (client_index + order_offset) % len(SATISFACTION_COMMENTS[rating])
            ]
            encuesta = EncuestaSatisfaccion(
                calificacion=rating,
                comentario=f"{comment} Producto: {product.nombre}. Compra para talla {product.talla.split(',')[0]}.",
                respondida=True,
                omitida=False,
                enviada_en=delivery_date + timedelta(days=1),
                respondida_en=delivery_date + timedelta(days=2),
                pedido_id=pedido.id,
            )
            session.add(encuesta)
            survey_count += 1

            should_return = rating <= 2 or ((client_index + order_offset) % 7 == 0 and rating <= 4)
            if not should_return:
                continue

            reason_key, reason_comment = RETURN_REASONS[
                (client_index + order_offset) % len(RETURN_REASONS)
            ]
            estado_dev = [
                EstadoDevolucionEnum.solicitada,
                EstadoDevolucionEnum.en_revision,
                EstadoDevolucionEnum.aprobada,
                EstadoDevolucionEnum.rechazada,
            ][(client_index + order_offset) % 4]

            devolucion = Devolucion(
                motivo=reason_key,
                comentario=f"{reason_comment} Cliente: {cliente.nombre}. Producto: {product.nombre}.",
                estado=estado_dev,
                fecha_solicitud=delivery_date + timedelta(days=4),
                pedido_id=pedido.id,
            )
            session.add(devolucion)
            session.flush()

            session.add(
                EvidenciaDevolucion(
                    cloudinary_url=placeholder_image(
                        f"Devolucion {product.nombre}",
                        bg="FEE2E2",
                        fg="991B1B",
                    ),
                    cloudinary_public_id=f"seed/devoluciones/{devolucion.id}/evidencia_1",
                    tipo_archivo=TipoArchivoEnum.imagen,
                    devolucion_id=devolucion.id,
                )
            )
            return_count += 1

    return {"orders": order_count, "surveys": survey_count, "returns": return_count}


def seed_dashboard_stubs(session, empresas: list[Empresa]) -> None:
    for empresa in empresas:
        session.add(
            DashboardVentas(
                periodo="2026-Q1",
                ranking_mas_vendidos=[],
                ranking_menos_vendidos=[],
                ingresos_totales=0,
                empresa_id=empresa.id,
            )
        )
        session.add(
            AnalisisDevolucion(
                periodo="2026-Q1",
                motivos_agrupados={},
                datos_suficientes=False,
                empresa_id=empresa.id,
            )
        )
        session.add(
            PrediccionVentas(
                unidades_predichas=0,
                intervalo_inferior=0,
                intervalo_superior=0,
                confiabilidad=0.0,
                periodo_predicho="2026-Q2",
                datos_suficientes=False,
                empresa_id=empresa.id,
            )
        )


def seed_admin(session) -> None:
    user = create_user(session, "admin.seed@zapatos.local", RolEnum.admin, "573001111000")
    session.add(Administrador(usuario_id=user.id))


def main() -> None:
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()

    try:
        reset_existing_seed_data(session)
        categories = seed_categories(session)
        empresas = seed_companies_and_products(session, categories)
        clientes = seed_clients(session)
        seed_admin(session)
        counters = create_orders_surveys_and_returns(session, clientes, empresas)
        seed_dashboard_stubs(session, empresas)
        session.commit()

        print("Seed completado correctamente")
        print(f"Empresas: {len(empresas)}")
        print(f"Clientes: {len(clientes)}")
        print(f"Productos: {session.query(Producto).count()}")
        print(f"Pedidos: {counters['orders']}")
        print(f"Encuestas: {counters['surveys']}")
        print(f"Devoluciones: {counters['returns']}")
        print(f"Password demo para usuarios seed: {SEED_PASSWORD}")
    finally:
        session.close()


if __name__ == "__main__":
    main()
