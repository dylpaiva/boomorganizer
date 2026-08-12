# PyroLedger API Contract

**Status:** Initial contract baseline; endpoint details are implementation-ready only after domain/schema decisions are approved.  
**Branch:** `docs/chatgpt`

## 1. API principles

- FastAPI/Pydantic backend.
- JSON APIs with explicit request/response schemas.
- Server-side authorization on every protected endpoint.
- Organization context derived from authenticated authorization, not trusted from arbitrary client input.
- Regulated mutations require idempotency protection.
- Regulated history is immutable.
- Error responses must expose actionable workflow state without leaking sensitive data.

## 2. Core resource groups

### Identity and organization

- `GET /api/v1/me`
- `GET /api/v1/organizations/current`
- organization membership and role resources as authorization permits

### Products and regulatory profiles

- product CRUD/read operations as permitted
- regulatory profile read/review operations
- document/source linkage

### Magazines and locations

- location resources
- magazine resources
- inspection resources
- daily summary resources

### Inventory

- inventory lot read/create workflows
- receive inventory transaction
- movement transaction
- allocation/load transaction
- return transaction
- adjustment/correction/reversal transaction
- immutable event history queries
- physical count capture
- variance investigation

### Shows

- shows
- show packages
- loadout/allocation workflows
- delivery/return reconciliation

### Shipment and documentation

- shipments
- shipping documents
- evidence/document metadata
- controlled download authorization

### Compliance and audit

- compliance exceptions
- rule evaluation/review results
- audit event queries
- export/report generation

## 3. Transaction contract

Every regulated transaction request must contain a client-generated idempotency key and the minimum business fields necessary for server-side validation. The server generates authoritative event identity and persistence timestamps.

Responses must identify the resulting inventory event and current synchronization/processing state.

## 4. Error model

Use explicit machine-readable categories such as:

- `VALIDATION_ERROR`
- `AUTHENTICATION_REQUIRED`
- `FORBIDDEN`
- `NOT_FOUND`
- `TENANT_SCOPE_ERROR`
- `DUPLICATE_REQUEST`
- `IMMUTABLE_EVENT`
- `CONFLICT`
- `REVIEW_REQUIRED`
- `MISSING_DOCUMENTATION`
- `REGULATORY_VERIFICATION_REQUIRED`
- `OFFLINE_SYNC_PENDING`
- `INTERNAL_ERROR`

## 5. Offline synchronization API

The synchronization protocol must support batched queued operations, idempotency, server validation, explicit conflict responses, and durable synchronization status.

A client must be able to distinguish:

- accepted;
- already accepted/deduplicated;
- rejected by validation;
- rejected by authorization;
- conflict requiring human/operational reconciliation;
- pending server processing.

## 6. Reporting/export API

Exports should identify scope, generation timestamp, source data version, relevant regulatory rule versions, and evidence links where applicable.

## 7. Security requirements

- Do not expose internal database identifiers when a stable public identifier is preferable.
- Never authorize based only on a URL/path identifier.
- Protect all document download endpoints with server-side access checks.
- Rate limit authentication-sensitive and high-cost endpoints.
- Validate content types and payload sizes.

## 8. Open decisions

**DECISION REQUIRED:** Finalize resource naming, pagination contract, filtering/query semantics, and public identifier strategy.

**DECISION REQUIRED:** Finalize event command schema and idempotency semantics.

**DECISION REQUIRED:** Finalize synchronization API after offline conflict UX is specified.
