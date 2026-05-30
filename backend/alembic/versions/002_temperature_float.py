"""temperature column String to Float

Revision ID: 002_temperature_float
Revises: 001_v2_new_tables
Create Date: 2026-05-30 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '002_temperature_float'
down_revision = '001_v2_new_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('agents', schema=None) as batch_op:
        batch_op.alter_column(
            'temperature',
            existing_type=sa.String(length=10),
            type_=sa.Float(),
            existing_nullable=True,
            postgresql_using='temperature::double precision',
        )


def downgrade() -> None:
    with op.batch_alter_table('agents', schema=None) as batch_op:
        batch_op.alter_column(
            'temperature',
            existing_type=sa.Float(),
            type_=sa.String(length=10),
            existing_nullable=True,
        )
