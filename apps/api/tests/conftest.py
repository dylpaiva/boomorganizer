from collections.abc import Generator
from uuid import uuid4

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.core.security import AuthorizationContext
from app.db.base import Base
from app.models.identity import AppUser, Organization
from app.models.inventory import InventoryLot, InventoryUnit, Location, Product


@pytest.fixture
def session() -> Generator[Session, None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    database_session = factory()
    try:
        yield database_session
    finally:
        database_session.close()
        Base.metadata.drop_all(engine)


def create_inventory_fixture(session: Session, *, suffix: str = "a") -> dict[str, object]:
    organization = Organization(name=f"Organization {suffix}")
    user = AppUser(auth_subject=f"supabase-{suffix}", email=f"{suffix}@example.test")
    session.add_all([organization, user])
    session.flush()
    source = Location(organization_id=organization.id, name=f"Source {suffix}", kind="magazine")
    destination = Location(organization_id=organization.id, name=f"Destination {suffix}", kind="magazine")
    product = Product(
        organization_id=organization.id,
        sku=f"SKU-{suffix}",
        name=f"Product {suffix}",
        operational_unit=InventoryUnit.EACH,
    )
    session.add_all([source, destination, product])
    session.flush()
    lot = InventoryLot(
        organization_id=organization.id,
        product_id=product.id,
        lot_code=f"LOT-{suffix}",
        operational_unit=InventoryUnit.EACH,
    )
    session.add(lot)
    session.flush()
    context = AuthorizationContext(
        organization_id=organization.id,
        user_id=user.id,
        role_code="INVENTORY_MANAGER",
        permissions=frozenset({"inventory.receive", "inventory.move", "inventory.count", "inventory.adjust", "inventory.correct", "inventory.reverse", "inventory.read", "audit.read"}),
        request_id=str(uuid4()),
    )
    return {"organization": organization, "user": user, "source": source, "destination": destination, "product": product, "lot": lot, "context": context}
