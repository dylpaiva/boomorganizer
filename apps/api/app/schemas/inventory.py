from datetime import datetime
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.inventory import InventoryEventType, InventoryUnit, VarianceStatus

PositiveQuantity = Annotated[Decimal, Field(gt=Decimal(0), max_digits=18, decimal_places=4)]
ObservedQuantity = Annotated[Decimal, Field(ge=Decimal(0), max_digits=18, decimal_places=4)]


class CommandMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reference_type: str | None = Field(default=None, max_length=120)
    reference_id: str | None = Field(default=None, max_length=255)
    reason: str | None = Field(default=None, max_length=2000)
    metadata: dict[str, object] = Field(default_factory=dict)


class ReceiptCommand(CommandMetadata):
    product_id: UUID
    inventory_lot_id: UUID
    destination_location_id: UUID
    quantity: PositiveQuantity
    unit: InventoryUnit
    occurred_at: datetime


class MovementCommand(CommandMetadata):
    product_id: UUID
    inventory_lot_id: UUID
    source_location_id: UUID
    destination_location_id: UUID
    quantity: PositiveQuantity
    unit: InventoryUnit
    occurred_at: datetime

    @field_validator("destination_location_id")
    @classmethod
    def destination_must_differ(cls, destination: UUID, info: object) -> UUID:
        source = getattr(info, "data", {}).get("source_location_id")
        if source == destination:
            raise ValueError("source and destination must differ")
        return destination


class AdjustmentCommand(CommandMetadata):
    product_id: UUID
    inventory_lot_id: UUID
    location_id: UUID
    direction: str = Field(pattern="^(increase|decrease)$")
    quantity: PositiveQuantity
    unit: InventoryUnit
    occurred_at: datetime
    variance_id: UUID | None = None


class CorrectionCommand(CommandMetadata):
    original_event_id: UUID
    reason: str = Field(min_length=1, max_length=2000)


class ReversalCommand(CommandMetadata):
    original_event_id: UUID
    reason: str = Field(min_length=1, max_length=2000)
    occurred_at: datetime


class PhysicalCountLineCommand(BaseModel):
    model_config = ConfigDict(extra="forbid")

    inventory_lot_id: UUID
    observed_quantity: ObservedQuantity
    unit: InventoryUnit
    note: str | None = Field(default=None, max_length=2000)


class PhysicalCountCommand(BaseModel):
    model_config = ConfigDict(extra="forbid")

    location_id: UUID
    occurred_at: datetime
    lines: list[PhysicalCountLineCommand] = Field(min_length=1, max_length=500)


class InventoryEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    actor_user_id: UUID
    event_type: InventoryEventType
    product_id: UUID
    inventory_lot_id: UUID
    source_location_id: UUID | None
    destination_location_id: UUID | None
    quantity: Decimal
    unit: InventoryUnit
    occurred_at: datetime
    recorded_at: datetime
    idempotency_key: str
    correction_of_event_id: UUID | None
    reversal_of_event_id: UUID | None
    reference_type: str | None
    reference_id: str | None
    reason: str | None
    metadata: dict[str, object] = Field(validation_alias="metadata_json", serialization_alias="metadata")


class InventoryCommandResult(BaseModel):
    event: InventoryEventResponse
    processing_state: str
    deduplicated: bool = False


class BalanceResponse(BaseModel):
    inventory_lot_id: UUID
    product_id: UUID
    location_id: UUID
    unit: InventoryUnit
    quantity: Decimal


class PhysicalCountLineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    inventory_lot_id: UUID
    expected_quantity: Decimal
    observed_quantity: Decimal
    unit: InventoryUnit
    note: str | None


class VarianceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    physical_inventory_line_id: UUID
    difference_quantity: Decimal
    status: VarianceStatus
    resolution_event_id: UUID | None


class PhysicalCountResponse(BaseModel):
    id: UUID
    organization_id: UUID
    location_id: UUID
    actor_user_id: UUID
    occurred_at: datetime
    idempotency_key: str
    lines: list[PhysicalCountLineResponse]
    variances: list[VarianceResponse]
    deduplicated: bool = False
