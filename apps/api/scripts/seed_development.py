"""Create opt-in, non-regulatory development fixtures for the local integration demo.

This script intentionally creates master data only. It does not create inventory events,
regulatory records, compliance outcomes, or a browser-side source of truth.
"""

from __future__ import annotations

import os
import sys

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.identity import AppUser, Organization, OrganizationMember, Role, RoleCode
from app.models.inventory import InventoryLot, InventoryUnit, Location, Product

ORGANIZATION_NAME = "PyroLedger Development Operations — DEMO DATA"
SOURCE_LOCATION_NAME = "Development Receiving — DEMO DATA"
DESTINATION_LOCATION_NAME = "Development Staging — DEMO DATA"
PRODUCT_SKU = "DEMO-TRAINING-ITEM"
PRODUCT_NAME = "Development Training Inventory — DEMO DATA"
LOT_CODE = "DEMO-LOT-LOCAL-ONLY"


def required_environment(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is required.")
    return value


def get_or_create(session: object, model: type[object], defaults: dict[str, object], **criteria: object) -> object:
    record = session.scalar(select(model).filter_by(**criteria))  # type: ignore[attr-defined]
    if record is not None:
        return record
    record = model(**criteria, **defaults)  # type: ignore[call-arg]
    session.add(record)  # type: ignore[attr-defined]
    session.flush()  # type: ignore[attr-defined]
    return record


def main() -> None:
    if os.getenv("PYROLEDGER_DEMO_SEED") != "true":
        raise RuntimeError("Refusing to seed. Set PYROLEDGER_DEMO_SEED=true for a disposable development database.")

    auth_subject = required_environment("PYROLEDGER_DEMO_AUTH_SUBJECT")
    email = os.getenv("PYROLEDGER_DEMO_EMAIL", "development-operator@example.invalid")

    with SessionLocal() as session:
        organization = get_or_create(session, Organization, {}, name=ORGANIZATION_NAME)
        user = get_or_create(session, AppUser, {"email": email}, auth_subject=auth_subject)
        role = session.scalar(select(Role).where(Role.code == RoleCode.INVENTORY_MANAGER))
        if role is None:
            raise RuntimeError("The INVENTORY_MANAGER role is missing. Run `alembic upgrade head` before seeding.")

        get_or_create(
            session,
            OrganizationMember,
            {"role_id": role.id, "status": "active"},
            organization_id=organization.id,
            user_id=user.id,
        )
        receiving = get_or_create(
            session,
            Location,
            {"kind": "development", "status": "active"},
            organization_id=organization.id,
            name=SOURCE_LOCATION_NAME,
        )
        staging = get_or_create(
            session,
            Location,
            {"kind": "development", "status": "active"},
            organization_id=organization.id,
            name=DESTINATION_LOCATION_NAME,
        )
        product = get_or_create(
            session,
            Product,
            {"name": PRODUCT_NAME, "operational_unit": InventoryUnit.EACH, "status": "active"},
            organization_id=organization.id,
            sku=PRODUCT_SKU,
        )
        lot = get_or_create(
            session,
            InventoryLot,
            {"operational_unit": InventoryUnit.EACH, "status": "active"},
            organization_id=organization.id,
            lot_code=LOT_CODE,
            product_id=product.id,
        )
        if lot.product_id != product.id:
            raise RuntimeError("Existing development lot is linked to a different product. Reset the local development database.")

        session.commit()

    print("Created or verified development-only fixtures. No inventory events were created.")
    print(f"Organization UUID: {organization.id}")
    print(f"Product UUID:      {product.id}")
    print(f"Lot UUID:          {lot.id}")
    print(f"Receiving UUID:    {receiving.id}")
    print(f"Staging UUID:      {staging.id}")
    print("Use these only with the local integration demo and an authorized Supabase user.")


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as error:
        print(f"Development seed failed: {error}", file=sys.stderr)
        raise SystemExit(1) from error
