from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import AuthorizationContext
from app.domain.audit import record_audit
from app.domain.errors import ConflictError, ImmutableEventError, NotFoundError, TenantScopeError
from app.domain.ledger import project_balance, project_balances
from app.models.inventory import (
    InventoryEvent,
    InventoryEventType,
    InventoryLot,
    InventoryVariance,
    Location,
    PhysicalInventory,
    PhysicalInventoryLine,
    Product,
    VarianceStatus,
)
from app.schemas.inventory import (
    AdjustmentCommand,
    CorrectionCommand,
    MovementCommand,
    PhysicalCountCommand,
    ReceiptCommand,
    ReversalCommand,
)


def _scoped_resource(session: Session, model: type[object], resource_id: UUID, organization_id: UUID) -> object:
    resource = session.scalar(select(model).where(model.id == resource_id))
    if resource is None:
        raise NotFoundError()
    if getattr(resource, "organization_id", None) != organization_id:
        raise TenantScopeError()
    return resource


def _lot_and_product(
    session: Session,
    *,
    organization_id: UUID,
    product_id: UUID,
    inventory_lot_id: UUID,
    unit: object,
    lock: bool = False,
) -> InventoryLot:
    product = _scoped_resource(session, Product, product_id, organization_id)
    lot_statement = select(InventoryLot).where(InventoryLot.id == inventory_lot_id)
    if lock:
        lot_statement = lot_statement.with_for_update()
    lot = session.scalar(lot_statement)
    if lot is None:
        raise NotFoundError("Inventory lot was not found.")
    if lot.organization_id != organization_id or lot.product_id != product.id:
        raise TenantScopeError("Inventory lot is not available for this organization and product.")
    if lot.operational_unit != unit or product.operational_unit != unit:
        raise ConflictError("The command unit does not match the authoritative operational unit.")
    return lot


def _location(session: Session, *, organization_id: UUID, location_id: UUID) -> Location:
    return _scoped_resource(session, Location, location_id, organization_id)  # type: ignore[return-value]


def _existing_event(session: Session, *, organization_id: UUID, idempotency_key: str) -> InventoryEvent | None:
    return session.scalar(
        select(InventoryEvent).where(
            InventoryEvent.organization_id == organization_id,
            InventoryEvent.idempotency_key == idempotency_key,
        )
    )


def _create_event(
    session: Session,
    context: AuthorizationContext,
    *,
    event_type: InventoryEventType,
    product_id: UUID,
    inventory_lot_id: UUID,
    source_location_id: UUID | None,
    destination_location_id: UUID | None,
    quantity: Decimal,
    unit: object,
    occurred_at: datetime,
    idempotency_key: str,
    correction_of_event_id: UUID | None = None,
    reversal_of_event_id: UUID | None = None,
    reference_type: str | None = None,
    reference_id: str | None = None,
    reason: str | None = None,
    metadata: dict[str, object] | None = None,
) -> tuple[InventoryEvent, bool]:
    existing = _existing_event(session, organization_id=context.organization_id, idempotency_key=idempotency_key)
    if existing:
        return existing, True
    event = InventoryEvent(
        organization_id=context.organization_id,
        actor_user_id=context.user_id,
        event_type=event_type,
        product_id=product_id,
        inventory_lot_id=inventory_lot_id,
        source_location_id=source_location_id,
        destination_location_id=destination_location_id,
        quantity=quantity,
        unit=unit,
        occurred_at=occurred_at,
        idempotency_key=idempotency_key,
        correction_of_event_id=correction_of_event_id,
        reversal_of_event_id=reversal_of_event_id,
        reference_type=reference_type,
        reference_id=reference_id,
        reason=reason,
        metadata_json=metadata or {},
    )
    session.add(event)
    session.flush()
    record_audit(
        session,
        context,
        action=f"inventory_event.{event_type.value}.created",
        target_type="inventory_event",
        target_id=event.id,
        detail={"inventory_lot_id": str(inventory_lot_id), "idempotency_key": idempotency_key},
    )
    return event, False


def receive_inventory(
    session: Session, context: AuthorizationContext, command: ReceiptCommand, idempotency_key: str
) -> tuple[InventoryEvent, bool]:
    _lot_and_product(
        session,
        organization_id=context.organization_id,
        product_id=command.product_id,
        inventory_lot_id=command.inventory_lot_id,
        unit=command.unit,
        lock=True,
    )
    _location(session, organization_id=context.organization_id, location_id=command.destination_location_id)
    return _create_event(
        session,
        context,
        event_type=InventoryEventType.RECEIPT,
        product_id=command.product_id,
        inventory_lot_id=command.inventory_lot_id,
        source_location_id=None,
        destination_location_id=command.destination_location_id,
        quantity=command.quantity,
        unit=command.unit,
        occurred_at=command.occurred_at,
        idempotency_key=idempotency_key,
        reference_type=command.reference_type,
        reference_id=command.reference_id,
        reason=command.reason,
        metadata=command.metadata,
    )


def move_inventory(
    session: Session, context: AuthorizationContext, command: MovementCommand, idempotency_key: str
) -> tuple[InventoryEvent, bool]:
    _lot_and_product(
        session,
        organization_id=context.organization_id,
        product_id=command.product_id,
        inventory_lot_id=command.inventory_lot_id,
        unit=command.unit,
        lock=True,
    )
    _location(session, organization_id=context.organization_id, location_id=command.source_location_id)
    _location(session, organization_id=context.organization_id, location_id=command.destination_location_id)
    existing = _existing_event(session, organization_id=context.organization_id, idempotency_key=idempotency_key)
    if existing:
        return existing, True
    available = project_balance(
        session,
        organization_id=context.organization_id,
        inventory_lot_id=command.inventory_lot_id,
        location_id=command.source_location_id,
    )
    if available < command.quantity:
        raise ConflictError("Movement quantity exceeds the ledger-derived source balance.")
    return _create_event(
        session,
        context,
        event_type=InventoryEventType.MOVEMENT,
        product_id=command.product_id,
        inventory_lot_id=command.inventory_lot_id,
        source_location_id=command.source_location_id,
        destination_location_id=command.destination_location_id,
        quantity=command.quantity,
        unit=command.unit,
        occurred_at=command.occurred_at,
        idempotency_key=idempotency_key,
        reference_type=command.reference_type,
        reference_id=command.reference_id,
        reason=command.reason,
        metadata=command.metadata,
    )


def create_adjustment(
    session: Session, context: AuthorizationContext, command: AdjustmentCommand, idempotency_key: str
) -> tuple[InventoryEvent, bool]:
    _lot_and_product(
        session,
        organization_id=context.organization_id,
        product_id=command.product_id,
        inventory_lot_id=command.inventory_lot_id,
        unit=command.unit,
        lock=True,
    )
    _location(session, organization_id=context.organization_id, location_id=command.location_id)
    existing = _existing_event(session, organization_id=context.organization_id, idempotency_key=idempotency_key)
    if existing:
        return existing, True
    source_location_id = command.location_id if command.direction == "decrease" else None
    destination_location_id = command.location_id if command.direction == "increase" else None
    if command.direction == "decrease":
        available = project_balance(
            session,
            organization_id=context.organization_id,
            inventory_lot_id=command.inventory_lot_id,
            location_id=command.location_id,
        )
        if available < command.quantity:
            raise ConflictError("Adjustment decrease exceeds the ledger-derived balance.")
    if command.variance_id is not None:
        variance = _scoped_resource(session, InventoryVariance, command.variance_id, context.organization_id)
        if variance.status != VarianceStatus.OPEN:
            raise ConflictError("Variance is not open for adjustment resolution.")
    event, deduplicated = _create_event(
        session,
        context,
        event_type=InventoryEventType.ADJUSTMENT,
        product_id=command.product_id,
        inventory_lot_id=command.inventory_lot_id,
        source_location_id=source_location_id,
        destination_location_id=destination_location_id,
        quantity=command.quantity,
        unit=command.unit,
        occurred_at=command.occurred_at,
        idempotency_key=idempotency_key,
        reference_type=command.reference_type or ("inventory_variance" if command.variance_id else None),
        reference_id=command.reference_id or (str(command.variance_id) if command.variance_id else None),
        reason=command.reason,
        metadata=command.metadata,
    )
    if command.variance_id is not None and not deduplicated:
        variance = _scoped_resource(session, InventoryVariance, command.variance_id, context.organization_id)
        variance.status = VarianceStatus.RESOLVED
        variance.resolution_event_id = event.id
        variance.resolution_note = command.reason
        record_audit(
            session,
            context,
            action="inventory_variance.resolved",
            target_type="inventory_variance",
            target_id=variance.id,
            detail={"resolution_event_id": str(event.id)},
        )
    return event, deduplicated


def correct_event(
    session: Session, context: AuthorizationContext, command: CorrectionCommand, idempotency_key: str
) -> tuple[InventoryEvent, bool]:
    original = _scoped_resource(session, InventoryEvent, command.original_event_id, context.organization_id)
    if original.event_type == InventoryEventType.CORRECTION:
        raise ImmutableEventError("A correction cannot be corrected through this command.")
    return _create_event(
        session,
        context,
        event_type=InventoryEventType.CORRECTION,
        product_id=original.product_id,
        inventory_lot_id=original.inventory_lot_id,
        source_location_id=original.source_location_id,
        destination_location_id=original.destination_location_id,
        quantity=original.quantity,
        unit=original.unit,
        occurred_at=original.occurred_at,
        idempotency_key=idempotency_key,
        correction_of_event_id=original.id,
        reference_type=command.reference_type,
        reference_id=command.reference_id,
        reason=command.reason,
        metadata=command.metadata,
    )


def reverse_event(
    session: Session, context: AuthorizationContext, command: ReversalCommand, idempotency_key: str
) -> tuple[InventoryEvent, bool]:
    original = _scoped_resource(session, InventoryEvent, command.original_event_id, context.organization_id)
    if original.event_type in {InventoryEventType.CORRECTION, InventoryEventType.REVERSAL}:
        raise ImmutableEventError("This event type cannot be reversed through this command.")
    existing_reversal = session.scalar(
        select(InventoryEvent).where(
            InventoryEvent.organization_id == context.organization_id,
            InventoryEvent.reversal_of_event_id == original.id,
        )
    )
    if existing_reversal:
        raise ImmutableEventError("Original event already has a reversal.")
    return _create_event(
        session,
        context,
        event_type=InventoryEventType.REVERSAL,
        product_id=original.product_id,
        inventory_lot_id=original.inventory_lot_id,
        source_location_id=original.destination_location_id,
        destination_location_id=original.source_location_id,
        quantity=original.quantity,
        unit=original.unit,
        occurred_at=command.occurred_at,
        idempotency_key=idempotency_key,
        reversal_of_event_id=original.id,
        reference_type=command.reference_type,
        reference_id=command.reference_id,
        reason=command.reason,
        metadata=command.metadata,
    )


def record_physical_count(
    session: Session, context: AuthorizationContext, command: PhysicalCountCommand, idempotency_key: str
) -> tuple[PhysicalInventory, list[PhysicalInventoryLine], list[InventoryVariance], bool]:
    _location(session, organization_id=context.organization_id, location_id=command.location_id)
    existing = session.scalar(
        select(PhysicalInventory).where(
            PhysicalInventory.organization_id == context.organization_id,
            PhysicalInventory.idempotency_key == idempotency_key,
        )
    )
    if existing:
        lines = list(session.scalars(select(PhysicalInventoryLine).where(PhysicalInventoryLine.physical_inventory_id == existing.id)))
        variances = list(
            session.scalars(
                select(InventoryVariance).join(
                    PhysicalInventoryLine,
                    PhysicalInventoryLine.id == InventoryVariance.physical_inventory_line_id,
                ).where(PhysicalInventoryLine.physical_inventory_id == existing.id)
            )
        )
        return existing, lines, variances, True
    count = PhysicalInventory(
        organization_id=context.organization_id,
        location_id=command.location_id,
        actor_user_id=context.user_id,
        occurred_at=command.occurred_at,
        idempotency_key=idempotency_key,
    )
    session.add(count)
    session.flush()
    lines: list[PhysicalInventoryLine] = []
    variances: list[InventoryVariance] = []
    seen_lots: set[UUID] = set()
    for line_command in command.lines:
        if line_command.inventory_lot_id in seen_lots:
            raise ConflictError("A physical count cannot include the same lot more than once.")
        seen_lots.add(line_command.inventory_lot_id)
        lot = _scoped_resource(session, InventoryLot, line_command.inventory_lot_id, context.organization_id)
        if lot.operational_unit != line_command.unit:
            raise ConflictError("Physical count unit does not match the authoritative lot unit.")
        expected = project_balance(
            session,
            organization_id=context.organization_id,
            inventory_lot_id=lot.id,
            location_id=command.location_id,
        )
        line = PhysicalInventoryLine(
            physical_inventory_id=count.id,
            inventory_lot_id=lot.id,
            expected_quantity=expected,
            observed_quantity=line_command.observed_quantity,
            unit=line_command.unit,
            note=line_command.note,
        )
        session.add(line)
        session.flush()
        lines.append(line)
        difference = line_command.observed_quantity - expected
        if difference:
            variance = InventoryVariance(
                organization_id=context.organization_id,
                physical_inventory_line_id=line.id,
                difference_quantity=difference,
            )
            session.add(variance)
            session.flush()
            variances.append(variance)
            record_audit(
                session,
                context,
                action="inventory_variance.created",
                target_type="inventory_variance",
                target_id=variance.id,
                detail={"physical_inventory_id": str(count.id), "difference_quantity": str(difference)},
            )
    record_audit(
        session,
        context,
        action="physical_inventory.recorded",
        target_type="physical_inventory",
        target_id=count.id,
        detail={"line_count": len(lines), "idempotency_key": idempotency_key},
    )
    return count, lines, variances, False


def balances_for_organization(session: Session, context: AuthorizationContext) -> dict[tuple[UUID, UUID, object], Decimal]:
    return project_balances(session, organization_id=context.organization_id)
