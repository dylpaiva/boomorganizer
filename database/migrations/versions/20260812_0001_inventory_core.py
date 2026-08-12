"""Create the organization-scoped, append-only inventory core.

Revision ID: 20260812_0001
Revises:
Create Date: 2026-08-12 20:00:00
"""
from uuid import UUID

from alembic import op
import sqlalchemy as sa


revision = "20260812_0001"
down_revision = None
branch_labels = None
depends_on = None


ROLE_IDS = {
    "OWNER": UUID("10000000-0000-4000-8000-000000000001"),
    "ADMIN": UUID("10000000-0000-4000-8000-000000000002"),
    "COMPLIANCE_MANAGER": UUID("10000000-0000-4000-8000-000000000003"),
    "INVENTORY_MANAGER": UUID("10000000-0000-4000-8000-000000000004"),
    "OPERATOR": UUID("10000000-0000-4000-8000-000000000005"),
    "DRIVER": UUID("10000000-0000-4000-8000-000000000006"),
    "VIEWER": UUID("10000000-0000-4000-8000-000000000007"),
}
PERMISSION_IDS = {
    "organization.manage": UUID("20000000-0000-4000-8000-000000000001"),
    "inventory.read": UUID("20000000-0000-4000-8000-000000000002"),
    "inventory.receive": UUID("20000000-0000-4000-8000-000000000003"),
    "inventory.move": UUID("20000000-0000-4000-8000-000000000004"),
    "inventory.count": UUID("20000000-0000-4000-8000-000000000005"),
    "inventory.adjust": UUID("20000000-0000-4000-8000-000000000006"),
    "inventory.correct": UUID("20000000-0000-4000-8000-000000000007"),
    "inventory.reverse": UUID("20000000-0000-4000-8000-000000000008"),
    "audit.read": UUID("20000000-0000-4000-8000-000000000009"),
}


def _uuid() -> sa.Uuid:
    return sa.Uuid()


def upgrade() -> None:
    role_code = sa.Enum(
        "OWNER", "ADMIN", "COMPLIANCE_MANAGER", "INVENTORY_MANAGER", "OPERATOR", "DRIVER", "VIEWER",
        name="rolecode",
    )
    inventory_unit = sa.Enum("EACH", "PACKAGE", "CASE", "POUND", "KILOGRAM", name="inventoryunit")
    event_type = sa.Enum(
        "acquisition", "receipt", "movement", "allocation", "load", "delivery", "consumption",
        "sale_disposition", "return", "destruction", "adjustment", "correction", "reversal",
        name="inventoryeventtype",
    )
    physical_status = sa.Enum("completed", name="physicalinventorystatus")
    variance_status = sa.Enum("open", "resolved", name="variancestatus")

    op.create_table(
        "organizations",
        sa.Column("id", _uuid(), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("status", sa.String(40), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "users",
        sa.Column("id", _uuid(), primary_key=True),
        sa.Column("auth_subject", sa.String(255), nullable=False, unique=True),
        sa.Column("email", sa.String(320)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table("roles", sa.Column("id", _uuid(), primary_key=True), sa.Column("code", role_code, nullable=False, unique=True), sa.Column("name", sa.String(100), nullable=False))
    op.create_table("permissions", sa.Column("id", _uuid(), primary_key=True), sa.Column("code", sa.String(120), nullable=False, unique=True), sa.Column("description", sa.String(255), nullable=False))
    op.create_table("role_permissions", sa.Column("role_id", _uuid(), sa.ForeignKey("roles.id", ondelete="RESTRICT"), primary_key=True), sa.Column("permission_id", _uuid(), sa.ForeignKey("permissions.id", ondelete="RESTRICT"), primary_key=True))
    op.create_table("organization_members", sa.Column("id", _uuid(), primary_key=True), sa.Column("organization_id", _uuid(), sa.ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False), sa.Column("user_id", _uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False), sa.Column("role_id", _uuid(), sa.ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False), sa.Column("status", sa.String(40), nullable=False, server_default="active"), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")), sa.UniqueConstraint("organization_id", "user_id", name="uq_organization_member"))
    op.create_index("ix_organization_members_organization_id", "organization_members", ["organization_id"])

    op.create_table("locations", sa.Column("id", _uuid(), primary_key=True), sa.Column("organization_id", _uuid(), sa.ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False), sa.Column("name", sa.String(200), nullable=False), sa.Column("kind", sa.String(50), nullable=False), sa.Column("status", sa.String(40), nullable=False, server_default="active"), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")), sa.UniqueConstraint("organization_id", "name", name="uq_location_organization_name"))
    op.create_index("ix_locations_organization_id", "locations", ["organization_id"])
    op.create_table("magazines", sa.Column("id", _uuid(), primary_key=True), sa.Column("organization_id", _uuid(), sa.ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False), sa.Column("location_id", _uuid(), sa.ForeignKey("locations.id", ondelete="RESTRICT"), nullable=False), sa.Column("operational_code", sa.String(64), nullable=False), sa.Column("status", sa.String(40), nullable=False, server_default="active"), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")), sa.UniqueConstraint("organization_id", "operational_code", name="uq_magazine_code"))
    op.create_index("ix_magazines_organization_id", "magazines", ["organization_id"])
    op.create_table("products", sa.Column("id", _uuid(), primary_key=True), sa.Column("organization_id", _uuid(), sa.ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False), sa.Column("sku", sa.String(120), nullable=False), sa.Column("name", sa.String(255), nullable=False), sa.Column("operational_unit", inventory_unit, nullable=False), sa.Column("status", sa.String(40), nullable=False, server_default="active"), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")), sa.UniqueConstraint("organization_id", "sku", name="uq_product_organization_sku"))
    op.create_index("ix_products_organization_id", "products", ["organization_id"])
    op.create_table("inventory_lots", sa.Column("id", _uuid(), primary_key=True), sa.Column("organization_id", _uuid(), sa.ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False), sa.Column("product_id", _uuid(), sa.ForeignKey("products.id", ondelete="RESTRICT"), nullable=False), sa.Column("lot_code", sa.String(120), nullable=False), sa.Column("operational_unit", inventory_unit, nullable=False), sa.Column("status", sa.String(40), nullable=False, server_default="active"), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")), sa.UniqueConstraint("organization_id", "lot_code", name="uq_inventory_lot_code"))
    op.create_index("ix_inventory_lots_organization_id", "inventory_lots", ["organization_id"])

    op.create_table("inventory_events", sa.Column("id", _uuid(), primary_key=True), sa.Column("organization_id", _uuid(), sa.ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False), sa.Column("actor_user_id", _uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False), sa.Column("event_type", event_type, nullable=False), sa.Column("product_id", _uuid(), sa.ForeignKey("products.id", ondelete="RESTRICT"), nullable=False), sa.Column("inventory_lot_id", _uuid(), sa.ForeignKey("inventory_lots.id", ondelete="RESTRICT"), nullable=False), sa.Column("source_location_id", _uuid(), sa.ForeignKey("locations.id", ondelete="RESTRICT")), sa.Column("destination_location_id", _uuid(), sa.ForeignKey("locations.id", ondelete="RESTRICT")), sa.Column("quantity", sa.Numeric(18, 4), nullable=False), sa.Column("unit", inventory_unit, nullable=False), sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False), sa.Column("recorded_at", sa.DateTime(timezone=True), server_default=sa.text("now()")), sa.Column("idempotency_key", sa.String(255), nullable=False), sa.Column("correction_of_event_id", _uuid(), sa.ForeignKey("inventory_events.id", ondelete="RESTRICT")), sa.Column("reversal_of_event_id", _uuid(), sa.ForeignKey("inventory_events.id", ondelete="RESTRICT")), sa.Column("reference_type", sa.String(120)), sa.Column("reference_id", sa.String(255)), sa.Column("reason", sa.String(2000)), sa.Column("metadata", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")), sa.UniqueConstraint("organization_id", "idempotency_key", name="uq_inventory_event_idempotency"), sa.CheckConstraint("quantity > 0", name="ck_inventory_event_positive_quantity"), sa.CheckConstraint("source_location_id IS NULL OR destination_location_id IS NULL OR source_location_id <> destination_location_id", name="ck_inventory_event_distinct_locations"))
    op.create_index("ix_inventory_events_organization_id", "inventory_events", ["organization_id"])
    op.create_index("ix_inventory_events_event_type", "inventory_events", ["event_type"])
    op.create_index("ix_inventory_events_inventory_lot_id", "inventory_events", ["inventory_lot_id"])
    op.execute("""
        CREATE FUNCTION prevent_inventory_event_mutation() RETURNS trigger AS $$
        BEGIN
            RAISE EXCEPTION 'inventory events are append-only';
        END;
        $$ LANGUAGE plpgsql;
    """)
    op.execute("CREATE TRIGGER inventory_events_no_update BEFORE UPDATE ON inventory_events FOR EACH ROW EXECUTE FUNCTION prevent_inventory_event_mutation()")
    op.execute("CREATE TRIGGER inventory_events_no_delete BEFORE DELETE ON inventory_events FOR EACH ROW EXECUTE FUNCTION prevent_inventory_event_mutation()")

    op.create_table("physical_inventories", sa.Column("id", _uuid(), primary_key=True), sa.Column("organization_id", _uuid(), sa.ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False), sa.Column("location_id", _uuid(), sa.ForeignKey("locations.id", ondelete="RESTRICT"), nullable=False), sa.Column("actor_user_id", _uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False), sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False), sa.Column("status", physical_status, nullable=False, server_default="completed"), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")))
    op.create_index("ix_physical_inventories_organization_id", "physical_inventories", ["organization_id"])
    op.create_table("physical_inventory_lines", sa.Column("id", _uuid(), primary_key=True), sa.Column("physical_inventory_id", _uuid(), sa.ForeignKey("physical_inventories.id", ondelete="RESTRICT"), nullable=False), sa.Column("inventory_lot_id", _uuid(), sa.ForeignKey("inventory_lots.id", ondelete="RESTRICT"), nullable=False), sa.Column("expected_quantity", sa.Numeric(18, 4), nullable=False), sa.Column("observed_quantity", sa.Numeric(18, 4), nullable=False), sa.Column("unit", inventory_unit, nullable=False), sa.Column("note", sa.String(2000)))
    op.create_index("ix_physical_inventory_lines_physical_inventory_id", "physical_inventory_lines", ["physical_inventory_id"])
    op.create_table("inventory_variances", sa.Column("id", _uuid(), primary_key=True), sa.Column("organization_id", _uuid(), sa.ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False), sa.Column("physical_inventory_line_id", _uuid(), sa.ForeignKey("physical_inventory_lines.id", ondelete="RESTRICT"), nullable=False), sa.Column("difference_quantity", sa.Numeric(18, 4), nullable=False), sa.Column("status", variance_status, nullable=False, server_default="open"), sa.Column("resolution_event_id", _uuid(), sa.ForeignKey("inventory_events.id", ondelete="RESTRICT")), sa.Column("resolution_note", sa.String(2000)), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")), sa.UniqueConstraint("physical_inventory_line_id", name="uq_variance_physical_line"))
    op.create_index("ix_inventory_variances_organization_id", "inventory_variances", ["organization_id"])
    op.create_table("audit_events", sa.Column("id", _uuid(), primary_key=True), sa.Column("organization_id", _uuid(), sa.ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False), sa.Column("actor_user_id", _uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT")), sa.Column("action", sa.String(120), nullable=False), sa.Column("target_type", sa.String(120), nullable=False), sa.Column("target_id", _uuid(), nullable=False), sa.Column("outcome", sa.String(40), nullable=False), sa.Column("request_id", sa.String(255)), sa.Column("context", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")))
    op.create_index("ix_audit_events_organization_id", "audit_events", ["organization_id"])
    op.create_index("ix_audit_events_action", "audit_events", ["action"])

    op.create_table("regulatory_sources", sa.Column("id", _uuid(), primary_key=True), sa.Column("authority", sa.String(120), nullable=False), sa.Column("title", sa.String(500), nullable=False), sa.Column("citation", sa.String(255)), sa.Column("source_uri", sa.String(2000)), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")))
    op.create_table("regulatory_rules", sa.Column("id", _uuid(), primary_key=True), sa.Column("stable_code", sa.String(120), nullable=False, unique=True), sa.Column("source_domain", sa.String(120), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")))
    op.create_table("regulatory_rule_versions", sa.Column("id", _uuid(), primary_key=True), sa.Column("regulatory_rule_id", _uuid(), sa.ForeignKey("regulatory_rules.id", ondelete="RESTRICT"), nullable=False), sa.Column("regulatory_source_id", _uuid(), sa.ForeignKey("regulatory_sources.id", ondelete="RESTRICT"), nullable=False), sa.Column("version", sa.String(120), nullable=False), sa.Column("effective_date", sa.Date()), sa.Column("applicability", sa.Text()), sa.Column("jurisdiction", sa.String(255)), sa.Column("software_requirement", sa.Text()), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")), sa.UniqueConstraint("regulatory_rule_id", "version", name="uq_regulatory_rule_version"))
    op.create_table("product_regulatory_profiles", sa.Column("id", _uuid(), primary_key=True), sa.Column("product_id", _uuid(), sa.ForeignKey("products.id", ondelete="RESTRICT"), nullable=False), sa.Column("regulatory_rule_version_id", _uuid(), sa.ForeignKey("regulatory_rule_versions.id", ondelete="RESTRICT"), nullable=False), sa.Column("status", sa.String(80), nullable=False, server_default="REGULATORY VERIFICATION REQUIRED"), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")), sa.UniqueConstraint("product_id", "regulatory_rule_version_id", name="uq_product_rule_profile"))

    roles = sa.table("roles", sa.column("id", _uuid()), sa.column("code", role_code), sa.column("name", sa.String()))
    permissions = sa.table("permissions", sa.column("id", _uuid()), sa.column("code", sa.String()), sa.column("description", sa.String()))
    role_permissions = sa.table("role_permissions", sa.column("role_id", _uuid()), sa.column("permission_id", _uuid()))
    op.bulk_insert(roles, [{"id": value, "code": key, "name": key.replace("_", " ").title()} for key, value in ROLE_IDS.items()])
    op.bulk_insert(permissions, [{"id": value, "code": key, "description": key.replace(".", " ").title()} for key, value in PERMISSION_IDS.items()])
    all_permissions = set(PERMISSION_IDS)
    mappings = {
        "OWNER": all_permissions,
        "ADMIN": all_permissions,
        "COMPLIANCE_MANAGER": {"inventory.read", "inventory.count", "inventory.adjust", "inventory.correct", "inventory.reverse", "audit.read"},
        "INVENTORY_MANAGER": {"inventory.read", "inventory.receive", "inventory.move", "inventory.count", "inventory.adjust", "inventory.correct", "inventory.reverse", "audit.read"},
        "OPERATOR": {"inventory.read", "inventory.receive", "inventory.move", "inventory.count"},
        "DRIVER": {"inventory.read"},
        "VIEWER": {"inventory.read"},
    }
    op.bulk_insert(role_permissions, [{"role_id": ROLE_IDS[role], "permission_id": PERMISSION_IDS[permission]} for role, permissions_for_role in mappings.items() for permission in permissions_for_role])


def downgrade() -> None:
    op.drop_table("product_regulatory_profiles")
    op.drop_table("regulatory_rule_versions")
    op.drop_table("regulatory_rules")
    op.drop_table("regulatory_sources")
    op.drop_index("ix_audit_events_action", table_name="audit_events")
    op.drop_index("ix_audit_events_organization_id", table_name="audit_events")
    op.drop_table("audit_events")
    op.drop_index("ix_inventory_variances_organization_id", table_name="inventory_variances")
    op.drop_table("inventory_variances")
    op.drop_index("ix_physical_inventory_lines_physical_inventory_id", table_name="physical_inventory_lines")
    op.drop_table("physical_inventory_lines")
    op.drop_index("ix_physical_inventories_organization_id", table_name="physical_inventories")
    op.drop_table("physical_inventories")
    op.execute("DROP TRIGGER inventory_events_no_delete ON inventory_events")
    op.execute("DROP TRIGGER inventory_events_no_update ON inventory_events")
    op.execute("DROP FUNCTION prevent_inventory_event_mutation()")
    op.drop_index("ix_inventory_events_inventory_lot_id", table_name="inventory_events")
    op.drop_index("ix_inventory_events_event_type", table_name="inventory_events")
    op.drop_index("ix_inventory_events_organization_id", table_name="inventory_events")
    op.drop_table("inventory_events")
    op.drop_index("ix_inventory_lots_organization_id", table_name="inventory_lots")
    op.drop_table("inventory_lots")
    op.drop_index("ix_products_organization_id", table_name="products")
    op.drop_table("products")
    op.drop_index("ix_magazines_organization_id", table_name="magazines")
    op.drop_table("magazines")
    op.drop_index("ix_locations_organization_id", table_name="locations")
    op.drop_table("locations")
    op.drop_index("ix_organization_members_organization_id", table_name="organization_members")
    op.drop_table("organization_members")
    op.drop_table("role_permissions")
    op.drop_table("permissions")
    op.drop_table("roles")
    op.drop_table("users")
    op.drop_table("organizations")
    sa.Enum(name="variancestatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="physicalinventorystatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="inventoryeventtype").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="inventoryunit").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="rolecode").drop(op.get_bind(), checkfirst=True)
