"""add indexes on producto filter columns

Revision ID: 20260525a
Revises: 20584798f66f
Create Date: 2026-05-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = '20260525a'
down_revision: Union[str, None] = '20584798f66f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Filtros frecuentes en /productos (estado, empresa_id, precio, talla)
    op.create_index('ix_productos_estado',     'productos', ['estado'])
    op.create_index('ix_productos_empresa_id', 'productos', ['empresa_id'])
    op.create_index('ix_productos_precio',     'productos', ['precio'])
    op.create_index('ix_productos_talla',      'productos', ['talla'])

    # Reseñas: lookup por producto_id (también acelera el GROUP BY agregado)
    op.create_index(
        'ix_encuestas_producto_respondida',
        'encuestas_satisfaccion',
        ['producto_id', 'respondida'],
    )


def downgrade() -> None:
    op.drop_index('ix_encuestas_producto_respondida', table_name='encuestas_satisfaccion')
    op.drop_index('ix_productos_talla',      table_name='productos')
    op.drop_index('ix_productos_precio',     table_name='productos')
    op.drop_index('ix_productos_empresa_id', table_name='productos')
    op.drop_index('ix_productos_estado',     table_name='productos')
