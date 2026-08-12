# PyroLedger Architecture

**Status:** Initial authoritative architecture baseline  
**Branch:** `docs/chatgpt`

## 1. Architecture goals

PyroLedger must preserve auditability, tenant isolation, regulatory source separation, offline field capture, and server-authoritative domain rules.

## 2. Target stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

### Backend
- FastAPI
- Python
- Pydantic
- SQLAlchemy
- Alembic

### Database
- PostgreSQL

### Offline
- IndexedDB / Dexie

### Files
- S3-compatible object storage

### Authentication
- Enterprise-capable identity/authentication provider with MFA capability.

### Deployment
- Vercel frontend.
- Managed API/database infrastructure.

## 3. Logical architecture

The system is divided into:

1. Presentation layer: responsive web/PWA UI and field workflows.
2. Application/API layer: authentication context, authorization, workflow orchestration, validation, idempotency, and transaction boundaries.
3. Domain layer: inventory ledger, custody, magazine workflows, inspections, shipments, compliance evidence, and reporting rules.
4. Persistence layer: PostgreSQL transactional state and append-only event history.
5. Object/evidence layer: S3-compatible document storage with controlled access.
6. Offline synchronization layer: local command/event queue and explicit conflict reconciliation.
7. Regulatory data layer: versioned rules and source records separated by authority/jurisdiction.

## 4. Authoritative state

The server and PostgreSQL event ledger are authoritative for regulated inventory state. Materialized/current views may be stored for query performance, but they must be derivable from the ledger and must not replace it as the source of truth.

## 5. Critical business logic

Critical business logic must execute server-side and be testable independently of the UI. Client-side logic may provide guidance and validation for usability but is not a security or regulatory authority.

## 6. Event integrity

Every regulated event must have a unique immutable identifier and enough context to reconstruct its effect. Correction and reversal operations create new attributable events. Duplicate submissions are rejected or safely deduplicated using idempotency keys.

## 7. Offline architecture

Offline clients capture signed/attributable commands or events in an IndexedDB queue. Each queued item has a client-generated unique identifier, actor context, local timestamp, creation metadata, and synchronization state.

Synchronization must be idempotent. If the authoritative server state has diverged, reconciliation produces an explicit conflict record. Offline data cannot silently overwrite another authoritative event.

## 8. Regulatory separation

ATF, DOT/PHMSA, state, local/AHJ, company policy, and best-practice rules are represented as separate source domains. A workflow may evaluate multiple domains, but it must preserve the origin of each resulting warning or requirement.

## 9. Audit architecture

Audit events capture security-relevant and regulated actions, including authentication/security changes, event creation, corrections, approvals, document linkage, rule changes, and administrative actions. Audit records are append-oriented and must retain actor, timestamp, organization, object reference, action, and relevant context.

## 10. Reporting architecture

Reports must derive from authoritative transactional state, versioned regulatory rules, and linked evidence. Inspection-ready outputs must identify generation time, data scope, source records, and rule versions used.

## 11. Architectural constraints

- No second database technology without a documented ADR.
- No critical authorization decision in the client.
- No secrets in GitHub.
- No fake regulatory data or compliance scores.
- No silent event-history mutation.
- No cross-tenant access.

## 12. Open architectural decisions

**DECISION REQUIRED:** Select the enterprise-capable identity provider and document the selection before implementation.

**DECISION REQUIRED:** Define the exact synchronization protocol and conflict-resolution UX before offline implementation.

**REGULATORY VERIFICATION REQUIRED:** Validate the source document/version strategy against the project regulatory source materials before implementing regulatory rule evaluation.
