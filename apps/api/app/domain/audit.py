from uuid import UUID

from sqlalchemy.orm import Session

from app.core.security import AuthorizationContext
from app.models.audit import AuditEvent


def record_audit(
    session: Session,
    context: AuthorizationContext,
    *,
    action: str,
    target_type: str,
    target_id: UUID,
    outcome: str = "success",
    detail: dict[str, object] | None = None,
) -> AuditEvent:
    audit_event = AuditEvent(
        organization_id=context.organization_id,
        actor_user_id=context.user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        outcome=outcome,
        request_id=context.request_id,
        context_json=detail or {},
    )
    session.add(audit_event)
    return audit_event
