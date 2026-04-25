"""add encuesta recordatorio and producto_id

Revision ID: 20250124
Revises:
Create Date: 2025-01-24 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20250124'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Agregar columna recordatorio_activo a encuestas_satisfaccion
    op.add_column(
        'encuestas_satisfaccion',
        sa.Column('recordatorio_activo', sa.Boolean(), nullable=False, server_default='0')
    )

    # Agregar columna producto_id a encuestas_satisfaccion
    op.add_column(
        'encuestas_satisfaccion',
        sa.Column('producto_id', sa.Integer(), nullable=True)
    )

    # Crear foreign key constraint para producto_id
    op.create_foreign_key(
        'fk_encuesta_producto',
        'encuestas_satisfaccion',
        'productos',
        ['producto_id'],
        ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    # Eliminar foreign key
    op.drop_constraint('fk_encuesta_producto', 'encuestas_satisfaccion', type_='foreignkey')

    # Eliminar columnas
    op.drop_column('encuestas_satisfaccion', 'producto_id')
    op.drop_column('encuestas_satisfaccion', 'recordatorio_activo')
