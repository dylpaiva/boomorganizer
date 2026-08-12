"""Supabase identity verification and application-level RBAC dependencies."""
from dataclasses import dataclass
from typing import Annotated
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.identity import AppUser, OrganizationMember, Permission, Role, RolePermission

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class Principal:
    subject: str


@dataclass(frozen=True)
class AuthorizationContext:
    organization_id: UUID
    user_id: UUID
    role_code: str
    permissions: frozenset[str]
    request_id: str | None


def _authentication_configuration_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail={"code": "AUTHENTICATION_CONFIGURATION_REQUIRED", "message": "Authentication is not configured."},
    )


def get_current_principal(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> Principal:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "AUTHENTICATION_REQUIRED", "message": "Authentication is required."},
        )
    if not settings.supabase_jwt_issuer or not settings.supabase_jwks_url:
        raise _authentication_configuration_error()

    try:
        signing_key = PyJWKClient(settings.supabase_jwks_url).get_signing_key_from_jwt(credentials.credentials)
        claims = jwt.decode(
            credentials.credentials,
            signing_key.key,
            algorithms=["RS256", "ES256"],
            issuer=settings.supabase_jwt_issuer,
            options={"verify_aud": False},
        )
        subject = claims.get("sub")
        if not isinstance(subject, str) or not subject:
            raise jwt.InvalidTokenError("Missing subject")
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "AUTHENTICATION_REQUIRED", "message": "Authentication is invalid."},
        ) from exc

    return Principal(subject=subject)


def get_authorization_context(
    request: Request,
    principal: Annotated[Principal, Depends(get_current_principal)],
    db: Annotated[Session, Depends(get_db)],
) -> AuthorizationContext:
    user = db.scalar(select(AppUser).where(AppUser.auth_subject == principal.subject))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "No active application user is available."},
        )

    memberships = list(
        db.execute(
            select(OrganizationMember, Role)
            .join(Role, Role.id == OrganizationMember.role_id)
            .where(OrganizationMember.user_id == user.id, OrganizationMember.status == "active")
        ).all()
    )
    requested_organization = request.headers.get("X-Organization-ID")
    if requested_organization:
        try:
            organization_id = UUID(requested_organization)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "VALIDATION_ERROR", "message": "Organization context is invalid."},
            ) from exc
        memberships = [row for row in memberships if row[0].organization_id == organization_id]

    if not memberships:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "TENANT_SCOPE_ERROR", "message": "Organization access is not granted."},
        )
    if len(memberships) > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "VALIDATION_ERROR", "message": "An organization context is required."},
        )

    membership, role = memberships[0]
    permission_codes = frozenset(
        db.scalars(
            select(Permission.code)
            .join(RolePermission, RolePermission.permission_id == Permission.id)
            .where(RolePermission.role_id == role.id)
        ).all()
    )
    return AuthorizationContext(
        organization_id=membership.organization_id,
        user_id=user.id,
        role_code=role.code.value,
        permissions=permission_codes,
        request_id=request.headers.get("X-Request-ID"),
    )


def require_permission(permission: str):
    def dependency(
        context: Annotated[AuthorizationContext, Depends(get_authorization_context)],
    ) -> AuthorizationContext:
        if permission not in context.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "FORBIDDEN", "message": "Permission is not granted."},
            )
        return context

    return dependency
