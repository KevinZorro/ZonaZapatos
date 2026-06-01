"""add indexes on producto filter columns

Revision ID: 20260525a
Revises: 20584798f66f
Create Date: 2026-05-25 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = '20260525a'
down_revision: Union[str, None] = '20584798f66f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_indexes(inspector, table: str) -> set:
    try:
        return {ix['name'] for ix in inspector.get_indexes(table)}
    except Exception:
        return set()


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    prod_idx = _existing_indexes(inspector, 'productos')
    if 'ix_productos_estado' not in prod_idx:
        op.create_index('ix_productos_estado', 'productos', ['estado'])
    if 'ix_productos_empresa_id' not in prod_idx:
        op.create_index('ix_productos_empresa_id', 'productos', ['empresa_id'])
    if 'ix_productos_precio' not in prod_idx:
        op.create_index('ix_productos_precio', 'productos', ['precio'])
    if 'ix_productos_talla' not in prod_idx:
        op.create_index('ix_productos_talla', 'productos', ['talla'])

    enc_idx = _existing_indexes(inspector, 'encuestas_satisfaccion')
    if 'ix_encuestas_producto_respondida' not in enc_idx:
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
