from dataclasses import dataclass


@dataclass(slots=True)
class DomainError(Exception):
    code: str
    message: str
    status_code: int = 400


class NotFoundError(DomainError):
    def __init__(self, message: str = "Resource was not found.") -> None:
        super().__init__("NOT_FOUND", message, 404)


class TenantScopeError(DomainError):
    def __init__(self, message: str = "Organization access is not granted.") -> None:
        super().__init__("TENANT_SCOPE_ERROR", message, 403)


class ConflictError(DomainError):
    def __init__(self, message: str) -> None:
        super().__init__("CONFLICT", message, 409)


class ImmutableEventError(DomainError):
    def __init__(self, message: str) -> None:
        super().__init__("IMMUTABLE_EVENT", message, 409)
