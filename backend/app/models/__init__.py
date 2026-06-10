"""Central models import — ensures all models are loaded for SQLAlchemy registry."""
from app.usuarios.models import Usuario, Empresa, Cliente, Administrador  # noqa: F401
from app.productos.models import Producto, Categoria, MediaArchivo  # noqa: F401
from app.pedidos.models import Pedido, ItemPedido  # noqa: F401
from app.devoluciones.models import Devolucion, EvidenciaDevolucion, ItemDevolucion  # noqa: F401
from app.encuestas.models import EncuestaSatisfaccion  # noqa: F401
from app.dashboard.models import (  # noqa: F401
    DashboardVentas,
    AnalisisDevolucion,
    PrediccionVentas,
)