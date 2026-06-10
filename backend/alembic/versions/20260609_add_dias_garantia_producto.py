"""add dias_garantia to productos

Revision ID: 20260609a
Revises: 20260601a
Create Date: 2026-06-09 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = '20260609a'
down_revision: Union[str, None] = '20260601a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'productos',
        sa.Column(
            'dias_garantia',
            sa.Integer(),
            nullable=False,
            server_default='90',
        ),
    )


def downgrade() -> None:
    op.drop_column('productos', 'dias_garantia')