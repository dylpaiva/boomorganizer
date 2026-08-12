from datetime import UTC, datetime
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import AuthorizationContext, get_authorization_context
from app.db.session import get_db
from app.domain.inventory import receive_inventory
from app.main import app
from app.models.inventory import InventoryUnit
from app.schemas.inventory import ReceiptCommand
from tests.conftest import create_inventory_fixture

NOW = datetime(2026, 8, 12, tzinfo=UTC)


def configured_client(session: Session, context: AuthorizationContext) -> TestClient:
    app.dependency_overrides[get_db] = lambda: session
    app.dependency_overrides[get_authorization_context] = lambda: context
    return TestClient(app)


def receipt_payload(fixture: dict[str, object], quantity: str = "10") -> dict[str, str]:
    return {
        "product_id": str(fixture["product"].id),
        "inventory_lot_id": str(fixture["lot"].id),
        "destination_location_id": str(fixture["source"].id),
        "quantity": quantity,
        "unit": "EACH",
        "occurred_at": NOW.isoformat(),
    }


def test_receipt_route_requires_idempotency_and_deduplicates(session: Session) -> None:
    fixture = create_inventory_fixture(session)
    client = configured_client(session, fixture["context"])
    try:
        missing = client.post("/v1/inventory/receipts", json=receipt_payload(fixture))
        created = client.post(
            "/v1/inventory/receipts",
            json=receipt_payload(fixture),
            headers={"Idempotency-Key": "api-receipt-1"},
        )
        repeated = client.post(
            "/v1/inventory/receipts",
            json=receipt_payload(fixture),
            headers={"Idempotency-Key": "api-receipt-1"},
        )
    finally:
        app.dependency_overrides.clear()

    assert missing.status_code == 400
    assert missing.json()["detail"]["code"] == "IDEMPOTENCY_KEY_REQUIRED"
    assert created.status_code == 201
    assert created.json()["deduplicated"] is False
    assert repeated.status_code == 200
    assert repeated.json()["deduplicated"] is True
    assert created.json()["event"]["id"] == repeated.json()["event"]["id"]


def test_movement_route_rejects_overdraw(session: Session) -> None:
    fixture = create_inventory_fixture(session)
    client = configured_client(session, fixture["context"])
    try:
        client.post(
            "/v1/inventory/receipts",
            json=receipt_payload(fixture, "2"),
            headers={"Idempotency-Key": "api-receipt-2"},
        )
        response = client.post(
            "/v1/inventory/movements",
            json={
                "product_id": str(fixture["product"].id),
                "inventory_lot_id": str(fixture["lot"].id),
                "source_location_id": str(fixture["source"].id),
                "destination_location_id": str(fixture["destination"].id),
                "quantity": "3",
                "unit": "EACH",
                "occurred_at": NOW.isoformat(),
            },
            headers={"Idempotency-Key": "api-overdraw"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "CONFLICT"


def test_read_routes_hide_cross_tenant_inventory_event(session: Session) -> None:
    fixture_a = create_inventory_fixture(session, suffix="a")
    fixture_b = create_inventory_fixture(session, suffix="b")
    event, _ = receive_inventory(
        session,
        fixture_b["context"],
        ReceiptCommand(
            product_id=fixture_b["product"].id,
            inventory_lot_id=fixture_b["lot"].id,
            destination_location_id=fixture_b["source"].id,
            quantity=Decimal(1),
            unit=InventoryUnit.EACH,
            occurred_at=NOW,
        ),
        "tenant-b-receipt",
    )
    session.commit()
    client = configured_client(session, fixture_a["context"])
    try:
        response = client.get(f"/v1/inventory/events/{event.id}")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "TENANT_SCOPE_ERROR"


def test_permission_gate_rejects_operator_without_receive_permission(session: Session) -> None:
    fixture = create_inventory_fixture(session)
    denied_context = AuthorizationContext(
        organization_id=fixture["context"].organization_id,
        user_id=fixture["context"].user_id,
        role_code="VIEWER",
        permissions=frozenset({"inventory.read"}),
        request_id="viewer-request",
    )
    client = configured_client(session, denied_context)
    try:
        response = client.post(
            "/v1/inventory/receipts",
            json=receipt_payload(fixture),
            headers={"Idempotency-Key": "permission-denied"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "FORBIDDEN"


def test_physical_count_route_creates_visible_variance(session: Session) -> None:
    fixture = create_inventory_fixture(session)
    client = configured_client(session, fixture["context"])
    try:
        client.post(
            "/v1/inventory/receipts",
            json=receipt_payload(fixture),
            headers={"Idempotency-Key": "physical-receipt"},
        )
        response = client.post(
            "/v1/inventory/physical-counts",
            json={
                "location_id": str(fixture["source"].id),
                "occurred_at": NOW.isoformat(),
                "lines": [
                    {
                        "inventory_lot_id": str(fixture["lot"].id),
                        "observed_quantity": "8",
                        "unit": "EACH",
                    }
                ],
            },
            headers={"Idempotency-Key": "physical-count-1"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 201
    assert response.json()["lines"][0]["expected_quantity"] == "10.0000"
    assert response.json()["variances"][0]["difference_quantity"] == "-2.0000"
