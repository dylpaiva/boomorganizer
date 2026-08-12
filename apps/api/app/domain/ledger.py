from collections import defaultdict
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.inventory import InventoryEvent, InventoryEventType, InventoryUnit

ZERO = Decimal(0)
INCOMING_TYPES = {InventoryEventType.ACQUISITION, InventoryEventType.RECEIPT, InventoryEventType.RETURN}
TRANSFER_TYPES = {
    InventoryEventType.MOVEMENT,
    InventoryEventType.ALLOCATION,
    InventoryEventType.LOAD,
    InventoryEventType.DELIVERY,
}
OUTGOING_TYPES = {
    InventoryEventType.CONSUMPTION,
    InventoryEventType.SALE_DISPOSITION,
    InventoryEventType.DESTRUCTION,
}


def event_location_deltas(event: InventoryEvent) -> list[tuple[UUID, Decimal]]:
    if event.event_type == InventoryEventType.CORRECTION:
        return []
    deltas: list[tuple[UUID, Decimal]] = []
    if event.event_type in INCOMING_TYPES:
        if event.destination_location_id:
            deltas.append((event.destination_location_id, event.quantity))
        return deltas
    if event.event_type in OUTGOING_TYPES:
        if event.source_location_id:
            deltas.append((event.source_location_id, -event.quantity))
        return deltas
    if event.event_type in TRANSFER_TYPES or event.event_type in {
        InventoryEventType.ADJUSTMENT,
        InventoryEventType.REVERSAL,
    }:
        if event.source_location_id:
            deltas.append((event.source_location_id, -event.quantity))
        if event.destination_location_id:
            deltas.append((event.destination_location_id, event.quantity))
    return deltas


def project_balance(
    session: Session,
    *,
    organization_id: UUID,
    inventory_lot_id: UUID,
    location_id: UUID,
) -> Decimal:
    events = session.scalars(
        select(InventoryEvent).where(
            InventoryEvent.organization_id == organization_id,
            InventoryEvent.inventory_lot_id == inventory_lot_id,
        )
    ).all()
    balance = ZERO
    for event in events:
        for event_location_id, delta in event_location_deltas(event):
            if event_location_id == location_id:
                balance += delta
    return balance


def project_balances(
    session: Session,
    *,
    organization_id: UUID,
    inventory_lot_id: UUID | None = None,
) -> dict[tuple[UUID, UUID, InventoryUnit], Decimal]:
    statement = select(InventoryEvent).where(InventoryEvent.organization_id == organization_id)
    if inventory_lot_id is not None:
        statement = statement.where(InventoryEvent.inventory_lot_id == inventory_lot_id)
    balances: defaultdict[tuple[UUID, UUID, InventoryUnit], Decimal] = defaultdict(lambda: ZERO)
    for event in session.scalars(statement):
        for location_id, delta in event_location_deltas(event):
            balances[(event.inventory_lot_id, location_id, event.unit)] += delta
    return {key: quantity for key, quantity in balances.items() if quantity != ZERO}
