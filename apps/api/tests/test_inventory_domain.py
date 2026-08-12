from datetime import UTC, datetime
from decimal import Decimal

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.errors import ConflictError, TenantScopeError
from app.domain.inventory import (
    correct_event,
    move_inventory,
    receive_inventory,
    record_physical_count,
    reverse_event,
)
from app.domain.ledger import project_balance, project_balances
from app.models.audit import AuditEvent
from app.models.inventory import InventoryEvent, InventoryEventType, InventoryUnit
from app.schemas.inventory import (
    CorrectionCommand,
    MovementCommand,
    PhysicalCountCommand,
    PhysicalCountLineCommand,
    ReceiptCommand,
    ReversalCommand,
)
from tests.conftest import create_inventory_fixture

NOW = datetime(2026, 8, 12, tzinfo=UTC)


def receipt_command(fixture: dict[str, object], quantity: str = "10") -> ReceiptCommand:
    return ReceiptCommand(
        product_id=fixture["product"].id,
        inventory_lot_id=fixture["lot"].id,
        destination_location_id=fixture["source"].id,
        quantity=Decimal(quantity),
        unit=InventoryUnit.EACH,
        occurred_at=NOW,
        reference_type="test",
        reference_id="receipt-1",
    )


def test_receipt_and_movement_reconstruct_location_balances(session: Session) -> None:
    fixture = create_inventory_fixture(session)
    receipt, deduplicated = receive_inventory(
        session, fixture["context"], receipt_command(fixture), "receipt-1"
    )
    move, _ = move_inventory(
        session,
        fixture["context"],
        MovementCommand(
            product_id=fixture["product"].id,
            inventory_lot_id=fixture["lot"].id,
            source_location_id=fixture["source"].id,
            destination_location_id=fixture["destination"].id,
            quantity=Decimal(4),
            unit=InventoryUnit.EACH,
            occurred_at=NOW,
        ),
        "move-1",
    )
    session.commit()

    assert deduplicated is False
    assert receipt.event_type == InventoryEventType.RECEIPT
    assert move.event_type == InventoryEventType.MOVEMENT
    assert project_balance(
        session,
        organization_id=fixture["organization"].id,
        inventory_lot_id=fixture["lot"].id,
        location_id=fixture["source"].id,
    ) == Decimal(6)
    assert project_balance(
        session,
        organization_id=fixture["organization"].id,
        inventory_lot_id=fixture["lot"].id,
        location_id=fixture["destination"].id,
    ) == Decimal(4)
    balances = project_balances(session, organization_id=fixture["organization"].id)
    assert balances[(fixture["lot"].id, fixture["source"].id, InventoryUnit.EACH)] == Decimal(6)
    assert balances[(fixture["lot"].id, fixture["destination"].id, InventoryUnit.EACH)] == Decimal(
        4
    )


def test_movement_cannot_overdraw_derived_source_balance(session: Session) -> None:
    fixture = create_inventory_fixture(session)
    receive_inventory(session, fixture["context"], receipt_command(fixture, "2"), "receipt-1")

    with pytest.raises(ConflictError, match="exceeds"):
        move_inventory(
            session,
            fixture["context"],
            MovementCommand(
                product_id=fixture["product"].id,
                inventory_lot_id=fixture["lot"].id,
                source_location_id=fixture["source"].id,
                destination_location_id=fixture["destination"].id,
                quantity=Decimal(3),
                unit=InventoryUnit.EACH,
                occurred_at=NOW,
            ),
            "move-overdraw",
        )


def test_receipt_idempotency_returns_the_original_event(session: Session) -> None:
    fixture = create_inventory_fixture(session)
    first, first_deduplicated = receive_inventory(
        session, fixture["context"], receipt_command(fixture), "duplicate-receipt"
    )
    second, second_deduplicated = receive_inventory(
        session, fixture["context"], receipt_command(fixture), "duplicate-receipt"
    )

    assert first.id == second.id
    assert first_deduplicated is False
    assert second_deduplicated is True
    assert session.scalars(select(InventoryEvent)).all() == [first]


def test_cross_tenant_product_and_lot_cannot_be_received(session: Session) -> None:
    fixture_a = create_inventory_fixture(session, suffix="a")
    fixture_b = create_inventory_fixture(session, suffix="b")
    command = ReceiptCommand(
        product_id=fixture_b["product"].id,
        inventory_lot_id=fixture_b["lot"].id,
        destination_location_id=fixture_a["source"].id,
        quantity=Decimal(1),
        unit=InventoryUnit.EACH,
        occurred_at=NOW,
    )

    with pytest.raises(TenantScopeError):
        receive_inventory(session, fixture_a["context"], command, "cross-tenant")


def test_correction_preserves_original_event_and_does_not_change_balance(session: Session) -> None:
    fixture = create_inventory_fixture(session)
    original, _ = receive_inventory(
        session, fixture["context"], receipt_command(fixture), "receipt-1"
    )
    correction, _ = correct_event(
        session,
        fixture["context"],
        CorrectionCommand(original_event_id=original.id, reason="Reference correction"),
        "correction-1",
    )

    assert correction.correction_of_event_id == original.id
    assert correction.event_type == InventoryEventType.CORRECTION
    assert project_balance(
        session,
        organization_id=fixture["organization"].id,
        inventory_lot_id=fixture["lot"].id,
        location_id=fixture["source"].id,
    ) == Decimal(10)
    assert original.reason is None


def test_reversal_is_a_new_linked_event_that_reconstructs_to_zero(session: Session) -> None:
    fixture = create_inventory_fixture(session)
    original, _ = receive_inventory(
        session, fixture["context"], receipt_command(fixture), "receipt-1"
    )
    reversal, _ = reverse_event(
        session,
        fixture["context"],
        ReversalCommand(original_event_id=original.id, reason="Receiving error", occurred_at=NOW),
        "reversal-1",
    )

    assert reversal.reversal_of_event_id == original.id
    assert reversal.event_type == InventoryEventType.REVERSAL
    assert project_balance(
        session,
        organization_id=fixture["organization"].id,
        inventory_lot_id=fixture["lot"].id,
        location_id=fixture["source"].id,
    ) == Decimal(0)


def test_physical_count_creates_variance_without_mutating_ledger(session: Session) -> None:
    fixture = create_inventory_fixture(session)
    receive_inventory(session, fixture["context"], receipt_command(fixture), "receipt-1")
    physical_count, lines, variances, deduplicated = record_physical_count(
        session,
        fixture["context"],
        PhysicalCountCommand(
            location_id=fixture["source"].id,
            occurred_at=NOW,
            lines=[
                PhysicalCountLineCommand(
                    inventory_lot_id=fixture["lot"].id,
                    observed_quantity=Decimal(8),
                    unit=InventoryUnit.EACH,
                )
            ],
        ),
        "physical-count-1",
    )

    assert deduplicated is False
    assert physical_count.id
    assert lines[0].expected_quantity == Decimal(10)
    assert variances[0].difference_quantity == Decimal(-2)
    assert project_balance(
        session,
        organization_id=fixture["organization"].id,
        inventory_lot_id=fixture["lot"].id,
        location_id=fixture["source"].id,
    ) == Decimal(10)
    assert len(session.scalars(select(AuditEvent)).all()) >= 2
