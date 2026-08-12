from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import AuthorizationContext, require_permission
from app.db.session import get_db
from app.domain.errors import NotFoundError, TenantScopeError
from app.domain.inventory import (
    balances_for_organization,
    correct_event,
    create_adjustment,
    move_inventory,
    receive_inventory,
    record_physical_count,
    reverse_event,
)
from app.models.audit import AuditEvent
from app.models.inventory import InventoryEvent, InventoryLot
from app.schemas.inventory import (
    AdjustmentCommand,
    BalanceResponse,
    CorrectionCommand,
    InventoryCommandResult,
    InventoryEventResponse,
    MovementCommand,
    PhysicalCountCommand,
    PhysicalCountLineResponse,
    PhysicalCountResponse,
    ReceiptCommand,
    ReversalCommand,
    VarianceResponse,
)

router = APIRouter(prefix="/v1/inventory", tags=["inventory"])
DbSession = Annotated[Session, Depends(get_db)]


class LotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product_id: UUID
    lot_code: str
    operational_unit: str
    status: str


class AuditEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    actor_user_id: UUID | None
    action: str
    target_type: str
    target_id: UUID
    outcome: str
    request_id: str | None
    context: dict[str, object] = Field(validation_alias="context_json")


def require_idempotency_key(
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> str:
    if not idempotency_key or len(idempotency_key) > 255:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "IDEMPOTENCY_KEY_REQUIRED", "message": "A valid Idempotency-Key is required."},
        )
    return idempotency_key


def _commit(session: Session) -> None:
    try:
        session.commit()
    except Exception:
        session.rollback()
        raise


def _command_result(event: InventoryEvent, deduplicated: bool) -> InventoryCommandResult:
    return InventoryCommandResult(
        event=InventoryEventResponse.model_validate(event),
        processing_state="accepted",
        deduplicated=deduplicated,
    )


@router.post("/receipts", response_model=InventoryCommandResult, status_code=status.HTTP_201_CREATED)
def create_receipt(
    command: ReceiptCommand,
    session: DbSession,
    context: Annotated[AuthorizationContext, Depends(require_permission("inventory.receive"))],
    idempotency_key: Annotated[str, Depends(require_idempotency_key)],
    response: Response,
) -> InventoryCommandResult:
    event, deduplicated = receive_inventory(session, context, command, idempotency_key)
    _commit(session)
    session.refresh(event)
    if deduplicated:
        response.status_code = status.HTTP_200_OK
    return _command_result(event, deduplicated)


@router.post("/movements", response_model=InventoryCommandResult, status_code=status.HTTP_201_CREATED)
def create_movement(
    command: MovementCommand,
    session: DbSession,
    context: Annotated[AuthorizationContext, Depends(require_permission("inventory.move"))],
    idempotency_key: Annotated[str, Depends(require_idempotency_key)],
    response: Response,
) -> InventoryCommandResult:
    event, deduplicated = move_inventory(session, context, command, idempotency_key)
    _commit(session)
    session.refresh(event)
    if deduplicated:
        response.status_code = status.HTTP_200_OK
    return _command_result(event, deduplicated)


@router.post("/adjustments", response_model=InventoryCommandResult, status_code=status.HTTP_201_CREATED)
def create_inventory_adjustment(
    command: AdjustmentCommand,
    session: DbSession,
    context: Annotated[AuthorizationContext, Depends(require_permission("inventory.adjust"))],
    idempotency_key: Annotated[str, Depends(require_idempotency_key)],
    response: Response,
) -> InventoryCommandResult:
    event, deduplicated = create_adjustment(session, context, command, idempotency_key)
    _commit(session)
    session.refresh(event)
    if deduplicated:
        response.status_code = status.HTTP_200_OK
    return _command_result(event, deduplicated)


@router.post("/corrections", response_model=InventoryCommandResult, status_code=status.HTTP_201_CREATED)
def create_inventory_correction(
    command: CorrectionCommand,
    session: DbSession,
    context: Annotated[AuthorizationContext, Depends(require_permission("inventory.correct"))],
    idempotency_key: Annotated[str, Depends(require_idempotency_key)],
    response: Response,
) -> InventoryCommandResult:
    event, deduplicated = correct_event(session, context, command, idempotency_key)
    _commit(session)
    session.refresh(event)
    if deduplicated:
        response.status_code = status.HTTP_200_OK
    return _command_result(event, deduplicated)


@router.post("/reversals", response_model=InventoryCommandResult, status_code=status.HTTP_201_CREATED)
def create_inventory_reversal(
    command: ReversalCommand,
    session: DbSession,
    context: Annotated[AuthorizationContext, Depends(require_permission("inventory.reverse"))],
    idempotency_key: Annotated[str, Depends(require_idempotency_key)],
    response: Response,
) -> InventoryCommandResult:
    event, deduplicated = reverse_event(session, context, command, idempotency_key)
    _commit(session)
    session.refresh(event)
    if deduplicated:
        response.status_code = status.HTTP_200_OK
    return _command_result(event, deduplicated)


@router.post("/physical-counts", response_model=PhysicalCountResponse, status_code=status.HTTP_201_CREATED)
def create_physical_count(
    command: PhysicalCountCommand,
    session: DbSession,
    context: Annotated[AuthorizationContext, Depends(require_permission("inventory.count"))],
    idempotency_key: Annotated[str, Depends(require_idempotency_key)],
    response: Response,
) -> PhysicalCountResponse:
    count, lines, variances, deduplicated = record_physical_count(session, context, command, idempotency_key)
    _commit(session)
    if deduplicated:
        response.status_code = status.HTTP_200_OK
    return PhysicalCountResponse(
        id=count.id,
        organization_id=count.organization_id,
        location_id=count.location_id,
        actor_user_id=count.actor_user_id,
        occurred_at=count.occurred_at,
        idempotency_key=count.idempotency_key,
        lines=[PhysicalCountLineResponse.model_validate(line) for line in lines],
        variances=[VarianceResponse.model_validate(variance) for variance in variances],
        deduplicated=deduplicated,
    )


@router.get("/lots", response_model=list[LotResponse])
def list_inventory_lots(
    session: DbSession,
    context: Annotated[AuthorizationContext, Depends(require_permission("inventory.read"))],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[LotResponse]:
    lots = session.scalars(
        select(InventoryLot)
        .where(InventoryLot.organization_id == context.organization_id)
        .order_by(InventoryLot.lot_code)
        .limit(limit)
    ).all()
    return [LotResponse.model_validate(lot) for lot in lots]


@router.get("/balances", response_model=list[BalanceResponse])
def list_inventory_balances(
    session: DbSession,
    context: Annotated[AuthorizationContext, Depends(require_permission("inventory.read"))],
) -> list[BalanceResponse]:
    result: list[BalanceResponse] = []
    for (lot_id, location_id, unit), quantity in balances_for_organization(session, context).items():
        lot = session.scalar(
            select(InventoryLot).where(
                InventoryLot.id == lot_id,
                InventoryLot.organization_id == context.organization_id,
            )
        )
        if lot is None:
            raise TenantScopeError()
        result.append(
            BalanceResponse(
                inventory_lot_id=lot_id,
                product_id=lot.product_id,
                location_id=location_id,
                unit=unit,
                quantity=quantity,
            )
        )
    return result


@router.get("/events", response_model=list[InventoryEventResponse])
def list_inventory_events(
    session: DbSession,
    context: Annotated[AuthorizationContext, Depends(require_permission("inventory.read"))],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[InventoryEventResponse]:
    events = session.scalars(
        select(InventoryEvent)
        .where(InventoryEvent.organization_id == context.organization_id)
        .order_by(InventoryEvent.recorded_at.desc(), InventoryEvent.id.desc())
        .limit(limit)
    ).all()
    return [InventoryEventResponse.model_validate(event) for event in events]


@router.get("/events/{event_id}", response_model=InventoryEventResponse)
def get_inventory_event(
    event_id: UUID,
    session: DbSession,
    context: Annotated[AuthorizationContext, Depends(require_permission("inventory.read"))],
) -> InventoryEventResponse:
    event = session.scalar(select(InventoryEvent).where(InventoryEvent.id == event_id))
    if event is None:
        raise NotFoundError()
    if event.organization_id != context.organization_id:
        raise TenantScopeError()
    return InventoryEventResponse.model_validate(event)


@router.get("/audit-events", response_model=list[AuditEventResponse])
def list_audit_events(
    session: DbSession,
    context: Annotated[AuthorizationContext, Depends(require_permission("audit.read"))],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[AuditEventResponse]:
    audit_events = session.scalars(
        select(AuditEvent)
        .where(AuditEvent.organization_id == context.organization_id)
        .order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc())
        .limit(limit)
    ).all()
    return [AuditEventResponse.model_validate(event) for event in audit_events]
