# PyroLedger Security Specification

**Status:** Initial baseline  
**Branch:** `docs/chatgpt`

## 1. Security posture

Assume every client is potentially malicious. UI restrictions are not security controls.

## 2. Required controls

- Server-side authorization for every protected operation.
- Strong tenant isolation.
- Least privilege.
- Role-based access control.
- Secure session handling.
- MFA-capable authentication.
- Input validation using Pydantic and domain constraints.
- Database constraints supporting authorization and data integrity.
- Audit logging.
- Secure file access with authorization checks.
- Secure file uploads and content validation.
- Secrets management outside source control.
- Rate limiting on authentication and sensitive endpoints.
- Dependency and security scanning.
- Secure HTTP headers.
- Encrypted transport.
- Backup and recovery procedures.
- Protection against insecure direct object references.
- Protection against privilege escalation.
- Protection against replayed transactions.
- Protection against duplicate inventory events.

## 3. Tenant isolation

Every tenant-owned record must be scoped to an organization. Server-side authorization must validate both the caller's permission and the organization's ownership of the requested resource.

No client-supplied organization identifier may be trusted by itself to establish authorization.

## 4. Inventory transaction security

Regulated event creation must require authenticated identity, authorized scope, validation, idempotency protection, and server-generated persistence metadata.

Correction/reversal operations must explicitly reference the original event and require the appropriate permission. Original regulated events remain immutable.

## 5. Offline security

Offline queues must not be treated as trusted authorization evidence. The server revalidates permissions and business rules when queued operations synchronize.

Conflicting events must produce an explicit reconciliation state rather than silently favoring a client copy.

## 6. Documents and evidence

Sensitive documents must use private object storage and short-lived authorization-controlled access. Object keys must not be directly predictable from user-controlled identifiers.

Uploads should be validated for type, size, file signature where appropriate, metadata handling, malware scanning capability, and authorization.

## 7. Audit

Audit events should capture actor, organization, timestamp, action, target object, outcome, source context, and correlation/request identifier. Security-relevant changes and regulated inventory actions must be auditable.

## 8. Secrets

Never commit API keys, database passwords, signing keys, cloud credentials, or production session secrets to GitHub. Use deployment/platform secrets management.

## 9. Testing requirements

Security testing must include authorization bypass, cross-tenant access, IDOR, privilege escalation, replay, duplicate submission, malformed input, file upload abuse, session handling, and offline synchronization conflict scenarios.

## 10. Open decisions

**DECISION REQUIRED:** Select identity provider and define claims/role mapping.

**DECISION REQUIRED:** Define formal threat model and security test cadence.

**DECISION REQUIRED:** Define production backup retention, recovery objectives, and restore verification process.
