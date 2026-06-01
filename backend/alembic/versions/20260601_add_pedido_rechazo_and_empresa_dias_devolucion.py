"""add motivo_rechazo to pedidos and dias_devolucion to empresas

Revision ID: 20260601a
Revises: 20260525a
Create Date: 2026-06-01 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = '20260601a'
down_revision: Union[str, None] = '20260525a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'pedidos',
        sa.Column('motivo_rechazo', sa.Text(), nullable=True),
    )
    op.add_column(
        'empresas',
        sa.Column(
            'dias_devolucion',
            sa.Integer(),
            nullable=False,
            server_default='15',
        ),
    )


def downgrade() -> None:
    op.drop_column('empresas', 'dias_devolucion')
    op.drop_column('pedidos', 'motivo_rechazo')
