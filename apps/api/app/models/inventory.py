import enum
from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class InventoryUnit(str, enum.Enum):
    EACH = "EACH"
    PACKAGE = "PACKAGE"
    CASE = "CASE"
    POUND = "POUND"
    KILOGRAM = "KILOGRAM"


class InventoryEventType(str, enum.Enum):
    ACQUISITION = "acquisition"
    RECEIPT = "receipt"
    MOVEMENT = "movement"
    ALLOCATION = "allocation"
    LOAD = "load"
    DELIVERY = "delivery"
    CONSUMPTION = "consumption"
    SALE_DISPOSITION = "sale_disposition"
    RETURN = "return"
    DESTRUCTION = "destruction"
    ADJUSTMENT = "adjustment"
    CORRECTION = "correction"
    REVERSAL = "reversal"


class PhysicalInventoryStatus(str, enum.Enum):
    COMPLETED = "completed"


class VarianceStatus(str, enum.Enum):
    OPEN = "open"
    RESOLVED = "resolved"


class Location(Base):
    __tablename__ = "locations"
    __table_args__ = (UniqueConstraint("organization_id", "name", name="uq_location_organization_name"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    kind: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Magazine(Base):
    __tablename__ = "magazines"
    __table_args__ = (UniqueConstraint("organization_id", "operational_code", name="uq_magazine_code"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    location_id: Mapped[UUID] = mapped_column(ForeignKey("locations.id", ondelete="RESTRICT"), nullable=False)
    operational_code: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (UniqueConstraint("organization_id", "sku", name="uq_product_organization_sku"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    sku: Mapped[str] = mapped_column(String(120), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    operational_unit: Mapped[InventoryUnit] = mapped_column(nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class InventoryLot(Base):
    __tablename__ = "inventory_lots"
    __table_args__ = (UniqueConstraint("organization_id", "lot_code", name="uq_inventory_lot_code"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    product_id: Mapped[UUID] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    lot_code: Mapped[str] = mapped_column(String(120), nullable=False)
    operational_unit: Mapped[InventoryUnit] = mapped_column(nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class InventoryEvent(Base):
    __tablename__ = "inventory_events"
    __table_args__ = (
        UniqueConstraint("organization_id", "idempotency_key", name="uq_inventory_event_idempotency"),
        CheckConstraint("quantity > 0", name="ck_inventory_event_positive_quantity"),
        CheckConstraint(
            "source_location_id IS NULL OR destination_location_id IS NULL OR source_location_id <> destination_location_id",
            name="ck_inventory_event_distinct_locations",
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    actor_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    event_type: Mapped[InventoryEventType] = mapped_column(nullable=False, index=True)
    product_id: Mapped[UUID] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    inventory_lot_id: Mapped[UUID] = mapped_column(
        ForeignKey("inventory_lots.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    source_location_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("locations.id", ondelete="RESTRICT"), nullable=True
    )
    destination_location_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("locations.id", ondelete="RESTRICT"), nullable=True
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    unit: Mapped[InventoryUnit] = mapped_column(nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    idempotency_key: Mapped[str] = mapped_column(String(255), nullable=False)
    request_fingerprint: Mapped[str] = mapped_column(String(64), nullable=False)
    correction_of_event_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("inventory_events.id", ondelete="RESTRICT"), nullable=True
    )
    reversal_of_event_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("inventory_events.id", ondelete="RESTRICT"), nullable=True
    )
    reference_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    reference_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reason: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    metadata_json: Mapped[dict[str, object]] = mapped_column("metadata", JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PhysicalInventory(Base):
    __tablename__ = "physical_inventories"
    __table_args__ = (UniqueConstraint("organization_id", "idempotency_key", name="uq_physical_inventory_idempotency"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    location_id: Mapped[UUID] = mapped_column(ForeignKey("locations.id", ondelete="RESTRICT"), nullable=False)
    actor_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(255), nullable=False)
    request_fingerprint: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[PhysicalInventoryStatus] = mapped_column(nullable=False, default=PhysicalInventoryStatus.COMPLETED)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PhysicalInventoryLine(Base):
    __tablename__ = "physical_inventory_lines"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    physical_inventory_id: Mapped[UUID] = mapped_column(
        ForeignKey("physical_inventories.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    inventory_lot_id: Mapped[UUID] = mapped_column(
        ForeignKey("inventory_lots.id", ondelete="RESTRICT"), nullable=False
    )
    expected_quantity: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    observed_quantity: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    unit: Mapped[InventoryUnit] = mapped_column(nullable=False)
    note: Mapped[str | None] = mapped_column(String(2000), nullable=True)


class InventoryVariance(Base):
    __tablename__ = "inventory_variances"
    __table_args__ = (UniqueConstraint("physical_inventory_line_id", name="uq_variance_physical_line"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    physical_inventory_line_id: Mapped[UUID] = mapped_column(
        ForeignKey("physical_inventory_lines.id", ondelete="RESTRICT"), nullable=False
    )
    difference_quantity: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    status: Mapped[VarianceStatus] = mapped_column(nullable=False, default=VarianceStatus.OPEN)
    resolution_event_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("inventory_events.id", ondelete="RESTRICT"), nullable=True
    )
    resolution_note: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

